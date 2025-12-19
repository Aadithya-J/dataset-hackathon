import random

def get_current_emotion(text: str) -> str:
    """
    MOCK: In production, this hits your BERT/GoEmotions API.
    """
    # Just for demo purposes, randomly pick a nuanced emotion
    # In real app: return requests.post(API_URL, json={"text": text}).json()
    emotions = ["neutral", "sadness", "anxiety", "caring", "grief"]
    
    # Simple keyword check just to make the demo feel real
    if "sad" in text.lower(): return "sadness"
    if "panic" in text.lower(): return "fear"
    
    return "neutral"