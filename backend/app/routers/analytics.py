from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
from ..core.database import get_supabase
from ..core.llm import llm
from langchain_core.messages import SystemMessage, HumanMessage

router = APIRouter()

# Emotion to Valence Mapping (1-10)
EMOTION_VALENCE = {
    "joy": 9, "love": 9, "admiration": 8, "optimism": 8, "caring": 8, "excitement": 9, "gratitude": 9, "pride": 8, "relief": 7,
    "neutral": 6, "realization": 6, "surprise": 6, "curiosity": 7, "approval": 7, "desire": 6,
    "sadness": 3, "anger": 2, "fear": 2, "disgust": 1, "grief": 1, "remorse": 2, "embarrassment": 3, "disappointment": 3, "annoyance": 3, "nervousness": 4, "confusion": 5
}

@router.get("/dashboard/{user_id}")
async def get_dashboard_data(user_id: str):
    supabase = get_supabase()
    if not supabase:
        # Return mock data if no DB
        return {"error": "Database not connected"}

    # 1. Fetch Mood Logs (Last 7 Days)
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    
    try:
        response = supabase.table("mood_logs")\
            .select("*")\
            .eq("user_id", user_id)\
            .gte("created_at", seven_days_ago)\
            .order("created_at", desc=False)\
            .execute()
        logs = response.data
    except Exception as e:
        print(f"Error fetching logs: {e}")
        logs = []

    # 2. Process Mood Data (Daily Average)
    mood_data = []
    daily_scores = defaultdict(list)
    
    for log in logs:
        dt = datetime.fromisoformat(log['created_at'].replace('Z', '+00:00'))
        day_name = dt.strftime("%a") # Mon, Tue
        emotion = log.get('emotion', 'neutral')
        score = EMOTION_VALENCE.get(emotion, 5)
        daily_scores[day_name].append(score)

    # Get last 7 days explicitly
    today = datetime.utcnow()
    days = [(today - timedelta(days=i)).strftime("%a") for i in range(6, -1, -1)]
    
    final_mood_data = []
    for day in days:
        scores = daily_scores.get(day, [])
        # If no data for a day, we return 0 or null to show a gap, or 5 for neutral?
        # Let's return 0 to indicate "no data" clearly on the chart, or handle in frontend.
        # For now, let's use 5 (Neutral) as a baseline if missing, or 0 if we want to hide it.
        # User wants "real data", so let's use 0 if no data exists, but that might look like "terrible mood".
        # Let's use null if possible, but recharts might need a value.
        # Let's use 0 and handle it or just use 5 as "Unknown/Neutral".
        # Actually, let's filter out days with no data? No, we want the x-axis to be consistent.
        # Let's use 5 (Neutral) as the baseline for missing data to avoid alarming drops.
        avg = sum(scores) / len(scores) if scores else 0 
        final_mood_data.append({"day": day, "value": round(avg, 1)})

    # 3. Process Stress/Risk Data (Daily Average)
    # We'll use 'intensity' (risk score) as stress level (0-1 -> 0-100)
    daily_stress = defaultdict(list)
    
    for log in logs:
        dt = datetime.fromisoformat(log['created_at'].replace('Z', '+00:00'))
        day_name = dt.strftime("%a") # Mon, Tue
        risk = log.get('intensity')
        
        # If risk is None (old logs), treat as 0
        if risk is None:
            risk = 0.0
            
        stress_val = risk * 100 # Convert 0-1 to 0-100
        daily_stress[day_name].append(stress_val)

    stress_data = []
    for day in days:
        vals = daily_stress.get(day, [])
        # If no data for a day, return 0
        avg = sum(vals) / len(vals) if vals else 0
        stress_data.append({"day": day, "level": round(avg, 1)})

    # 4. Generate Analysis with LLM
    analysis_text = "No sufficient data for analysis yet."
    if logs:
        emotions_list = [l.get('emotion') for l in logs]
        risk_avg = sum([l.get('intensity') or 0 for l in logs]) / len(logs)
        
        prompt = f"""
        Analyze these recent emotions for a user: {', '.join(emotions_list[-20:])}.
        Average Risk Score (0-1): {risk_avg:.2f}.
        Provide a brief, compassionate 2-sentence summary of their mental state and a gentle recommendation.
        Address the user directly as 'you'.
        """
        try:
            ai_msg = await llm.ainvoke([SystemMessage(content="You are an empathetic mental health analyst."), HumanMessage(content=prompt)])
            analysis_text = ai_msg.content
        except Exception as e:
            print(f"LLM Analysis failed: {e}")
            analysis_text = "Unable to generate analysis at this moment."

    return {
        "mood_data": final_mood_data,
        "stress_data": stress_data,
        "analysis": analysis_text,
        "recent_emotions": [l.get('emotion') for l in logs[-5:]]
    }
