from ..core.database import get_supabase
import json

async def save_user_assessment(user_id: str, data: dict):
    supabase = get_supabase()
    if not supabase:
        print("Supabase not initialized")
        return None
    
    try:
        # Prepare record
        record = {
            "user_id": user_id,
            "form_data": data.get("form_data", {}),
            "risk_prediction": data.get("prediction"),
            "risk_confidence": data.get("confidence"),
            "top_features": data.get("top_features"),
            "llm_summary": data.get("llm_analysis")
        }
        
        response = supabase.table("user_assessments").insert(record).execute()
        return response.data
    except Exception as e:
        print(f"Error saving assessment: {e}")
        return None

async def get_latest_assessment(user_id: str):
    supabase = get_supabase()
    if not supabase:
        return None
    
    try:
        response = supabase.table("user_assessments")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
            
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error fetching assessment: {e}")
        return None
