import configparser
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    GROQ_API_KEY: str
    MODEL_NAME: str = "llama-3.3-70b-versatile"
    SIMILARITY_THRESHOLD: float = 0.4
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    EMOTIONS_API_URL: str = "https://aadithya1-goemotions.hf.space/predict"
    GEMINI_API_KEY: str = ""
    MEM0_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra environment variables like elevenlabs_api_key

# Load from config.ini for backward compatibility / ease of use
config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'app/config.ini')
config.read(config_path)

settings = Settings(
    GROQ_API_KEY=os.getenv("GROQ_API_KEY", config.get('LLM_config', 'groq_api_key', fallback="")),
    MODEL_NAME=config.get('LLM_config', 'model_name', fallback="llama-3.3-70b-versatile"),
    SIMILARITY_THRESHOLD=config.getfloat('App_config', 'similarity_threshold', fallback=0.4),
    SUPABASE_URL=config.get('Supabase_config', 'url', fallback=""),
    SUPABASE_KEY=config.get('Supabase_config', 'key', fallback=""),
    EMOTIONS_API_URL=os.getenv("EMOTIONS_API_URL", "https://aadithya1-goemotions.hf.space/predict"),
    GEMINI_API_KEY=os.getenv("GEMINI_API_KEY", "")
)
