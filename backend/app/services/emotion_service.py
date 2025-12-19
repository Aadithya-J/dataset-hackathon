import httpx
from ..core.config import settings

async def detect_emotion(text: str) -> dict:
    """
    Calls the GoEmotions API to detect the primary emotion in the text.
    Returns a dict with 'label' and 'confidence'.
    """
    if not settings.EMOTIONS_API_URL:
        print("EMOTIONS_API_URL not set, returning neutral emotion.")
        return {"label": "neutral", "confidence": 1.0}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.EMOTIONS_API_URL,
                json={"text": text},
                timeout=5.0
            )
            response.raise_for_status()
            data = response.json()
            
            # The API returns {"predictions": {"emotion_name": score}, ...}
            predictions = data.get("predictions", {})
            print("predictions:")
            print(predictions)
            if predictions:
                # Get the emotion with the highest score
                top_emotion = max(predictions, key=predictions.get)
                print("top emotion:")
                print(top_emotion)
                confidence = predictions[top_emotion]
                return {"label": top_emotion, "confidence": confidence}
            
    except Exception as e:
        print(f"Error detecting emotion: {e}")
    
    return {"label": "neutral", "confidence": 0.0}
