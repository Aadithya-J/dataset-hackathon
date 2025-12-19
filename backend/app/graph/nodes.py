from typing import Dict, Any, Optional
from langchain_core.messages import AIMessage, SystemMessage
from langchain_groq import ChatGroq
from ..core.config import settings
from ..services.intent_engine import intent_engine
from ..services.emotion_service import detect_emotion
from ..services.mood_tracker import log_mood, get_recent_moods
from ..services.ml_service import get_user_risk_profile
from ..services.user_service import get_latest_assessment
from ..core.llm import llm
from .state import AgentState

# Initialize LLM (Moved to core/llm.py)



def _most_frequent_recent_emotion(recent_moods: list, window: int = 6) -> Optional[str]:
    if not recent_moods:
        return None
    counts = {}
    for m in recent_moods[-window:]:
        e = m.get("emotion")
        if not e:
            continue
        counts[e] = counts.get(e, 0) + 1
    if not counts:
        return None
    # return the emotion with max count
    return max(counts, key=counts.get)


async def perception_node(state: AgentState) -> Dict[str, Any]:
    """
    Returns a dict with keys:
      - current_intent
      - current_emotion           (blended / inferred)
      - emotion_confidence
      - emotion_source            ("classifier" | "history" | "uncertain")
      - retrieved_response
    This is backwards-compatible with previous file (it still provides current_emotion).
    """
    last_message = state["messages"][-1].content
    user_id = state.get("user_id", "default_user")

    # 1. Detect Intent
    tag, verified_response = intent_engine.detect_intent(last_message)

    # 2. Detect Emotion (support both string or {label, confidence})
    raw_emotion = await detect_emotion(last_message)
    # Normalise outputs
    if isinstance(raw_emotion, dict):
        emotion_label = raw_emotion.get("label")
        emotion_conf = float(raw_emotion.get("confidence", 1.0))
    else:
        emotion_label = raw_emotion
        emotion_conf = 1.0

    # 3. Blend with recent moods (history) to reduce single-turn noise
    recent_moods = await get_recent_moods(user_id)
    historical_mode = _most_frequent_recent_emotion(recent_moods)

    if emotion_conf < 0.6 and historical_mode:
        inferred_emotion = historical_mode
        inferred_source = "history"
    elif emotion_conf < 0.5:
        inferred_emotion = "uncertain"
        inferred_source = "low_confidence"
    else:
        inferred_emotion = emotion_label or (historical_mode or "neutral")
        inferred_source = "classifier" if emotion_label else "history"

    # 4. Log Mood (keep original signature)
    # We continue logging the raw detection (label + confidence if available) for audit.
    await log_mood(user_id, emotion_label, last_message)

    return {
        "current_intent": tag,
        "current_emotion": inferred_emotion,
        "emotion_confidence": emotion_conf,
        "emotion_source": inferred_source,
        "retrieved_response": verified_response,
    }


async def wellness_logic_node(state: AgentState) -> Dict[str, Any]:
    """
    Returns:
      - risk_score
      - wellness_recommendation

    It reads `current_emotion` from state and uses `last_recommendation` to avoid repeats.
    """
    user_id = state.get("user_id", "default_user")
    current_emotion = state.get("current_emotion", "neutral")

    # Trend Analysis
    recent_moods = await get_recent_moods(user_id)
    sadness_count = sum(1 for m in recent_moods if m.get("emotion") == "sadness")

    risk_score = 0
    if sadness_count >= 3:
        risk_score = 5  # Elevated risk (heuristic)

    # Recommendation bank
    rec_bank = {
        "anxiety": [
            "Would you be open to a short breathing exercise: inhale 4s, hold 7s, exhale 8s?",
            "Would trying a grounding exercise (name 5 things you can see) feel okay right now?"
        ],
        "sadness": [
            "Would you be open to a short 5-minute walk or stepping outside for fresh air?",
            "Would trying a tiny, manageable task (making a cup of tea) feel possible?"
        ],
        "lethargy": [
            "Could you try a 2-minute stretch or gentle movement? If you've tried this before, how did it feel?"
        ],
        "anger": [
            "Would you like to try a grounding exercise: name 5 things you can see or touch?"
        ],
        "neutral": [
            "Would you be open to a short grounding or breathing exercise?"
        ],
    }

    candidates = rec_bank.get(current_emotion, rec_bank["neutral"])
    last_rec = state.get("last_recommendation")

    # pick the first candidate that is different from the last recommendation
    recommendation = None
    for c in candidates:
        if c != last_rec:
            recommendation = c
            break
    if recommendation is None:
        recommendation = candidates[0]  # fallback

    return {
        "risk_score": risk_score,
        "wellness_recommendation": recommendation
    }


async def generation_node(state: AgentState) -> Dict[str, Any]:
    """
    Produces the assistant message(s). Returns {"messages": [AIMessage(...)]} for compatibility.

    Uses:
      - state['current_intent']
      - state['current_emotion']
      - state['retrieved_response'] (anchor)
      - state['wellness_recommendation']
      - state['risk_score'] (optional)
      - state['emotion_confidence'] / 'emotion_source' (optional)

    Side-effect:
      - updates state['last_recommendation'] to avoid repetition.
    """
    intent = state.get("current_intent", "unknown")
    emotion = state.get("current_emotion", "neutral")
    anchor = state.get("retrieved_response", "") or ""
    recommendation = state.get("wellness_recommendation", "")
    risk_score = state.get("risk_score", 0)
    emotion_conf = state.get("emotion_confidence", 1.0)
    emotion_source = state.get("emotion_source", "classifier")

    # CRISIS MODE: validation-first, structured probing
    if intent in ("crisis", "suicidal") or risk_score >= 7:
        crisis_system = (
            "You are a compassionate, safety-focused mental health assistant.\n"
            "Instructions:\n"
            "- Begin with explicit validation and gratitude for disclosure (e.g., 'I'm really sorry you're feeling this way; thank you for telling me').\n"
            "- Ask calm, direct safety questions: 'Are you thinking about hurting yourself right now?', "
            "'Do you have a plan or means?'.\n"
            "- If imminent danger is confirmed, instruct the user to contact local emergency services and provide geographically-relevant helplines. "
            "If country is unknown, ask: 'Which country are you in so I can give local resources?'\n"
            "- Avoid abrupt policy-only refusals. Use supportive, non-judgmental language throughout.\n"
            "- Do not provide instructions for self-harm or attempt to minimize the user's feelings.\n"
        )
        messages = [SystemMessage(content=crisis_system)] + state["messages"]
        # Note: keep temperature / other low-level params as configured in the llm instance.
        response = await llm.ainvoke(messages)
        return {"messages": [response]}

    # Fetch User Risk Profile (if available)
    user_id = state.get("user_id", "default_user")
    
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

    risk_context = ""
    if risk_profile:
        pred = risk_profile.get("prediction", "Unknown")
        conf = risk_profile.get("confidence", 0.0)
        top_features = risk_profile.get("top_features", [])
        llm_summary = risk_profile.get("llm_analysis", "")
        form_data = risk_profile.get("form_data", {})
        
        # Helper to extract meaningful value for the feature (Same logic as router)
        def get_feature_context(feature_name, inputs):
            clean_name = feature_name.replace('encoder__', '').replace('remainder__', '')
            if '_' in clean_name:
                parts = clean_name.rsplit('_', 1)
                if len(parts) == 2:
                    category, value = parts
                    return f"{category}: {value}"
            
            # Try exact match (Capitalized)
            if clean_name in inputs:
                return f"{clean_name}: {inputs[clean_name]}"
            
            # Try snake_case match (for when reading from form_data in DB)
            snake_name = clean_name.lower().replace(' ', '_')
            if snake_name in inputs:
                return f"{clean_name}: {inputs[snake_name]}"
                
            return clean_name.replace('_', ' ')

        # Format top features for the prompt
        features_list = []
        for f in top_features:
            ctx = get_feature_context(f['feature'], form_data)
            features_list.append(f"{ctx} (Impact: {f['shap_value']:.2f})")
            
        features_str = ", ".join(features_list)
        
        # Extract Demographics and Full Profile
        user_name = form_data.get("Name") or form_data.get("name") or ""
        user_age = form_data.get("Age") or form_data.get("age") or ""
        
        # Format all form data for context
        profile_details = []
        for k, v in form_data.items():
            if k.lower() not in ['user_id', 'name', 'age']: # Skip redundant or system fields
                clean_key = k.replace('_', ' ').title()
                profile_details.append(f"{clean_key}: {v}")
        profile_str = ", ".join(profile_details)
        
        risk_context = (
            f"\n- **User Profile**:\n"
            f"  - Name: {user_name}\n"
            f"  - Age: {user_age}\n"
            f"  - Full Assessment Details: {profile_str}\n"
            f"  - Predicted Risk Class: {pred} (Confidence: {conf:.2%})\n"
            f"  - Key Influencing Factors (SHAP Analysis): {features_str}\n"
            f"  - Summary shown to user: {llm_summary}\n"
            f"  - INSTRUCTION: The user has seen the summary above. Use these insights to personalize your advice. "
            f"Address them by name occasionally if known. "
            f"You have access to their full assessment details above - use them to provide specific, relevant support. "
            f"For example, if 'Employment Status: Unemployed' is a factor, gently ask about work stress. "
            f"If 'Physical Activity: Sedentary' is a factor, suggest small movements. "
            f"Do NOT mention 'SHAP values' or 'risk scores' directly to the user. "
            f"Just use the insight to be more helpful."
        )

    # STANDARD SUPPORTIVE FLOW
    system_prompt = (
        "You are a supportive, empathetic AI companion. You are NOT a clinical therapist. You are a friend here to listen.\n"
        f"Context:\n"
        f"- User's current intent: {intent}\n"
        f"- User's detected emotion: {emotion} (Confidence: {emotion_conf})\n"
        f"- Suggested coping strategy: {recommendation}\n"
        f"- Expert anchor text: {anchor}"
        f"{risk_context}\n\n"
        "Guidelines:\n"
        "1. **Natural Conversation**: Speak naturally and casually. Avoid formal greetings like 'It is nice to connect with you'.\n"
        "2. **Emotion Handling**: Use the detected emotion to guide your tone, but NEVER explicitly state 'I sense you are feeling X' or 'I detect Y'. Just match their energy.\n"
        "   - If they are down, be there for them. (e.g., 'I'm sorry, that sounds tough.').\n"
        "   - If the emotion label conflicts with their words, trust their words.\n"
        "3. **Recommendations**: If a coping strategy is suggested, offer it casually. (e.g., 'Sometimes a quick walk helps.').\n"
        "4. **Style**: Warm, genuine, and concise. Avoid robotic or overly flowery language. Don't psychoanalyze them.\n"
        "5. **Safety**: Do not provide medical advice."
    )

    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    response = await llm.ainvoke(messages)

    # Track last recommendation to avoid immediate repetition in next cycle
    state["last_recommendation"] = recommendation

    return {"messages": [response]}
