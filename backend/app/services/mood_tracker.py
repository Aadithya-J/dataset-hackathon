from ..core.database import get_supabase
from datetime import datetime

async def log_mood(user_id: str, emotion: str, text: str, intensity: float = None):
    supabase = get_supabase()
    if not supabase:
        print(f"[MOCK DB] Logging mood for {user_id}: {emotion} (Intensity: {intensity})")
        return

    data = {
        "user_id": user_id,
        "emotion": emotion,
        "note": text,
        "intensity": intensity
        # "created_at" is handled by default in DB, but we can send it if we want.
        # Let's let the DB handle it to match the schema default.
    }
    try:
        supabase.table("mood_logs").insert(data).execute()
    except Exception as e:
        print(f"Error logging mood: {e}")

async def get_recent_moods(user_id: str, limit: int = 5):
    supabase = get_supabase()
    if not supabase:
        # Return mock data for testing logic
        return [{"emotion": "neutral"}] * limit

    try:
        response = supabase.table("mood_logs")\
            .select("emotion")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        return response.data
    except Exception as e:
        print(f"Error fetching moods: {e}")
        return []
