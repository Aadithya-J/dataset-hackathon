from supabase import create_client, Client
from .config import settings

supabase: Client = None

def init_supabase():
    global supabase
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            print("Supabase client initialized.")
        except Exception as e:
            print(f"Failed to initialize Supabase: {e}")
    else:
        print("Supabase credentials not found. Running in mock mode.")

def get_supabase() -> Client:
    return supabase
