from ..core.database import get_supabase

async def fetch_chat_history(session_id: str, limit: int = 50):
    supabase = get_supabase()
    if not supabase:
        return []
    
    try:
        response = supabase.table("chat_history")\
            .select("*")\
            .eq("session_id", session_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        # Return reversed so it's chronological (oldest first)
        return response.data[::-1] 
    except Exception as e:
        print(f"Error fetching history: {e}")
        return []

async def fetch_user_sessions(user_id: str):
    supabase = get_supabase()
    if not supabase:
        return []
    
    try:
        # Fetch distinct session_ids with their latest message
        # Note: Supabase/PostgREST doesn't support DISTINCT ON easily in simple queries sometimes,
        # but we can fetch all and process in python for MVP or use a view.
        # For better performance, we should use a separate 'sessions' table.
        # For now, let's fetch all history (limit 1000) and group by session_id in Python.
        
        response = supabase.table("chat_history")\
            .select("session_id, content, created_at")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(500)\
            .execute()
            
        sessions = {}
        for row in response.data:
            sid = row['session_id']
            if sid not in sessions:
                sessions[sid] = {
                    "id": sid,
                    "preview": row['content'],
                    "created_at": row['created_at']
                }
        
        return list(sessions.values())
    except Exception as e:
        print(f"Error fetching sessions: {e}")
        return []

async def save_chat_message(user_id: str, session_id: str, role: str, content: str):
    supabase = get_supabase()
    if not supabase:
        return
    
    try:
        # Skip saving for non-UUID guest IDs to avoid FK violations
        if len(user_id) != 36:
            return

        supabase.table("chat_history").insert({
            "user_id": user_id,
            "session_id": session_id,
            "role": role,
            "content": content
        }).execute()
    except Exception as e:
        print(f"Error saving message: {e}")
