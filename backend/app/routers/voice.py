"""
Voice router - Minimal version for Hackathon.
Exposes API key for frontend direct Gemini Live connection.
"""
from fastapi import APIRouter
from ..core.config import settings
from ..services.ml_service import get_user_risk_profile
from ..services.user_service import get_latest_assessment
import os

router = APIRouter()


@router.get("/voice/config")
async def get_voice_config():
    """Return Gemini API key for frontend direct connection."""
    api_key = os.environ.get("GEMINI_API_KEY") or getattr(settings, 'GEMINI_API_KEY', None)
    return {"apiKey": api_key or ""}


@router.get("/voice/context/{user_id}")
async def get_voice_context(user_id: str):
    """Return user context/system prompt for voice session."""
    try:
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
            return {"context": "No prior risk assessment found. Treat as a new user."}

        pred = risk_profile.get("prediction", "Unknown")
        conf = risk_profile.get("confidence", 0.0)
        top_features = risk_profile.get("top_features", [])
        llm_summary = risk_profile.get("llm_analysis", "")
        form_data = risk_profile.get("form_data", {})
        
        features_list = []
        for f in top_features:
            clean_name = f['feature'].replace('encoder__', '').replace('remainder__', '')
            features_list.append(clean_name.replace('_', ' '))
            
        features_str = ", ".join(features_list[:5])
        user_name = form_data.get("Name", "Friend")
        
        context = (
            f"USER PROFILE:\n"
            f"- Name: {user_name}\n"
            f"- Risk Level: {pred} (Confidence: {conf:.0%})\n"
            f"- Key Factors: {features_str}\n"
            f"- Summary: {llm_summary}\n"
        )
        return {"context": context}
    except Exception as e:
        print(f"Error fetching risk context: {e}")
        return {"context": ""}
