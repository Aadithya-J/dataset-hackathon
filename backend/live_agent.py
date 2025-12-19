import os
import asyncio
import base64
import io
import traceback
import sys

# Add the current directory to sys.path to ensure app imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import pyaudio
import argparse

from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import services for risk assessment
from app.services.ml_service import get_user_risk_profile
from app.services.user_service import get_latest_assessment

FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE = 1024

MODEL = "models/gemini-2.0-flash-exp" # Updated to latest available model for Live API

DEFAULT_MODE = "none"

client = genai.Client(
    http_options={"api_version": "v1beta"},
    api_key=os.environ.get("GEMINI_API_KEY"),
)

pya = pyaudio.PyAudio()

async def get_risk_context(user_id="default_user"):
    """Fetches and formats the user's risk profile and assessment data."""
    try:
        # Try memory first, then DB
        risk_profile = get_user_risk_profile(user_id)
        if not risk_profile:
            db_record = await get_latest_assessment(user_id)
            if db_record:
                risk_profile = {
                    "prediction": db_record.get("risk_prediction"),
                    "confidence": db_record.get("risk_confidence"),
                    "top_features": db_record.get("top_features"),
                    "llm_analysis": db_record.get("llm_summary"),
                    "form_data": db_record.get("form_data")
                }

        if not risk_profile:
            return "No prior risk assessment found. Treat as a new user."

        pred = risk_profile.get("prediction", "Unknown")
        conf = risk_profile.get("confidence", 0.0)
        top_features = risk_profile.get("top_features", [])
        llm_summary = risk_profile.get("llm_analysis", "")
        form_data = risk_profile.get("form_data", {})
        
        # Helper to extract meaningful value for the feature
        def get_feature_context(feature_name, inputs):
            clean_name = feature_name.replace('encoder__', '').replace('remainder__', '')
            if '_' in clean_name:
                parts = clean_name.rsplit('_', 1)
                if len(parts) == 2:
                    category, value = parts
                    return f"{category}: {value}"
            if clean_name in inputs:
                return f"{clean_name}: {inputs[clean_name]}"
            return clean_name.replace('_', ' ')

        # Format top features
        features_list = []
        for f in top_features:
            ctx = get_feature_context(f['feature'], form_data)
            features_list.append(f"{ctx}")
            
        features_str = ", ".join(features_list)
        
        user_name = form_data.get("Name", "Friend")
        user_age = form_data.get("Age", "Unknown")
        
        return (
            f"USER PROFILE ANALYSIS:\n"
            f"- Name: {user_name}\n"
            f"- Age: {user_age}\n"
            f"- Risk Level: {pred} (Confidence: {conf:.2%})\n"
            f"- Key Factors: {features_str}\n"
            f"- Clinical Summary: {llm_summary}\n"
        )
    except Exception as e:
        print(f"Error fetching risk context: {e}")
        return "Error loading risk profile."

class AudioLoop:
    def __init__(self, video_mode=DEFAULT_MODE):
        self.video_mode = video_mode

        self.audio_in_queue = None
        self.out_queue = None

        self.session = None

        self.send_text_task = None
        self.receive_audio_task = None
        self.play_audio_task = None

    async def send_text(self):
        while True:
            text = await asyncio.to_thread(
                input,
                "message > ",
            )
            if text.lower() == "q":
                break
            await self.session.send(input=text or ".", end_of_turn=True)

    async def send_realtime(self):
        while True:
            msg = await self.out_queue.get()
            await self.session.send(input=msg)

    async def listen_audio(self):
        mic_info = pya.get_default_input_device_info()
        self.audio_stream = await asyncio.to_thread(
            pya.open,
            format=FORMAT,
            channels=CHANNELS,
            rate=SEND_SAMPLE_RATE,
            input=True,
            input_device_index=mic_info["index"],
            frames_per_buffer=CHUNK_SIZE,
        )
        if __debug__:
            kwargs = {"exception_on_overflow": False}
        else:
            kwargs = {}
        while True:
            data = await asyncio.to_thread(self.audio_stream.read, CHUNK_SIZE, **kwargs)
            await self.out_queue.put({"data": data, "mime_type": "audio/pcm"})

    async def receive_audio(self):
        "Background task to reads from the websocket and write pcm chunks to the output queue"
        while True:
            turn = self.session.receive()
            async for response in turn:
                if data := response.data:
                    self.audio_in_queue.put_nowait(data)
                    continue
                if text := response.text:
                    print(text, end="")

            # If you interrupt the model, it sends a turn_complete.
            # For interruptions to work, we need to stop playback.
            # So empty out the audio queue because it may have loaded
            # much more audio than has played yet.
            while not self.audio_in_queue.empty():
                self.audio_in_queue.get_nowait()

    async def play_audio(self):
        stream = await asyncio.to_thread(
            pya.open,
            format=FORMAT,
            channels=CHANNELS,
            rate=RECEIVE_SAMPLE_RATE,
            output=True,
        )
        while True:
            bytestream = await self.audio_in_queue.get()
            await asyncio.to_thread(stream.write, bytestream)

    async def run(self):
        # Fetch Risk Context
        print("Fetching user risk profile...")
        risk_context = await get_risk_context()
        print(f"Context loaded:\n{risk_context}")

        system_instruction = (
            f"{risk_context}\n\n"
            "ROLE & BEHAVIOR:\n"
            "You are a supportive, empathetic AI companion. You are NOT a clinical therapist. You are a friend here to listen.\n"
            "1. **Voice & Tone**: Speak naturally, casually, and warmly. Use pauses, 'hmm's, and natural speech patterns. Do not sound robotic.\n"
            "2. **Context Awareness**: Use the User Profile Analysis above to guide your responses. If they are high risk, be extra supportive but subtle. Do not mention 'SHAP values' or technical terms.\n"
            "3. **Interaction**: Listen more than you speak. Ask open-ended questions. Validate their feelings.\n"
            "4. **Safety**: If the user expresses intent of self-harm, gently encourage them to seek professional help, but remain a supportive presence.\n"
            "5. **Brevity**: Keep your spoken responses concise (1-3 sentences) to allow for a back-and-forth conversation.\n"
        )

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            media_resolution="MEDIA_RESOLUTION_MEDIUM",
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Zephyr")
                )
            ),
            system_instruction=types.Content(parts=[types.Part(text=system_instruction)]),
            context_window_compression=types.ContextWindowCompressionConfig(
                trigger_tokens=25600,
                sliding_window=types.SlidingWindow(target_tokens=12800),
            ),
        )

        try:
            async with (
                client.aio.live.connect(model=MODEL, config=config) as session,
                asyncio.TaskGroup() as tg,
            ):
                self.session = session

                self.audio_in_queue = asyncio.Queue()
                self.out_queue = asyncio.Queue(maxsize=5)

                send_text_task = tg.create_task(self.send_text())
                tg.create_task(self.send_realtime())
                tg.create_task(self.listen_audio())

                tg.create_task(self.receive_audio())
                tg.create_task(self.play_audio())

                await send_text_task
                raise asyncio.CancelledError("User requested exit")

        except asyncio.CancelledError:
            pass
        except ExceptionGroup as EG:
            self.audio_stream.close()
            traceback.print_exception(EG)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        type=str,
        default=DEFAULT_MODE,
        help="Audio only mode",
        choices=["none"],
    )
    args = parser.parse_args()
    main = AudioLoop(video_mode=args.mode)
    asyncio.run(main.run())
