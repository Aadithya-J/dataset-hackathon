Project: Mental Health Support Platform (DSARG_5)

Platform: Web (React) + API (FastAPI) + Database (Supabase)
Architecture: Stateful Neuro-Symbolic Agent
1. System Architecture

The system is designed to meet the Full Solution Objectives:

    Emotional Support: Via GoEmotions Analysis.

    Mood Tracking: By saving emotion tags to the DB every turn.

    Wellness Recommendations: By triggering "Coping" workflows based on detected emotion trends.

The Logic Flow (LangGraph)

Every user message passes through this pipeline:
Step 1: Perception Node (The Sensors)

    Intent Engine: Converts user text to vector

            
    →→

          

    Searches intents.json.

        Output: intent_tag (e.g., "panic_attack") + expert_response.

    Emotion Engine: Calls GoEmotions Service.

        Output: emotion_label (e.g., "fear") + intensity (0.0 - 1.0).

Step 2: Wellness Logic Node (The Doctor)

    Trend Analysis: Checks the last 5 messages in Supabase.

        Logic: If sadness count > 3

                
        →→

              

        Set status = "risk_check".

    Recommendation Engine:

        If emotion == "anxiety", inject Activity: "Breathing Exercise (4-7-8)".

        If emotion == "lethargy", inject Activity: "5-minute walk".

Step 3: Generation Node (The Speaker)

    LLM (Groq): Wraps the expert_response and the activity_recommendation in a warm tone matching the emotion_label.

2. Backend Specification (FastAPI)
Folder Structure
code Text

    
backend/
├── app/
│   ├── core/
│   │   ├── config.py          # Env vars (Groq, Supabase)
│   │   └── database.py        # Supabase Async Connection
│   ├── services/
│   │   ├── intent_engine.py   # SentenceTransformer Logic (Singleton)
│   │   ├── emotion_service.py # Mockable GoEmotions Client
│   │   └── mood_tracker.py    # Logic to read/write mood history to DB
│   ├── graph/
│   │   ├── state.py           # TypedDict Schema
│   │   ├── nodes.py           # Perception, Logic, Generation
│   │   └── workflow.py        # StateGraph Definition
│   ├── routers/
│   │   └── chat.py            # WebSocket Endpoint
│   └── main.py
└── data/
    └── intents.json           # Your dataset

  

Key Services

1. EmotionService (Mock for MVP):
Since the GoEmotions API is external, interface it here.
code Python

    
async def detect_emotion(text: str) -> str:
    # MOCK: Replace with real API call later
    # For now, keyword matching or random for demo
    if "scared" in text: return "fear"
    return "neutral"

  

2. MoodTracker (The "Long-Term" Feature):

    Function: async def log_mood(user_id: str, emotion: str, text: str)

    Action: Inserts a row into Supabase table mood_logs.

    Function: async def get_recent_moods(user_id: str, limit=5)

    Action: Selects recent emotions to detect downward trends.

3. Database Specification (Supabase)
Table: profiles

    id (uuid, PK)

    username (text)

    created_at (timestamp)

Table: mood_logs (Crucial for Mood Tracking Objective)

    id (uuid, PK)

    user_id (fk to profiles)

    emotion (text) - e.g., "joy", "grief"

    intensity (float)

    timestamp (created_at)

Table: chat_history (LangGraph Persistence)

    Managed automatically by AsyncPostgresSaver.

4. Frontend Specification (React + Vite)
Architecture

    UI Library: Tailwind CSS + Lucide React Icons.

    State: React Context for Auth, React Query for fetching Mood History.

Key Components

1. ChatInterface.tsx

    WebSocket Hook: Connects to FastAPI.

    Streaming: Appends tokens in real-time.

    Typing Indicator: Shows "Sensing Emotion..." while the backend processes.

2. MoodDashboard.tsx (New Feature)

    Visualizes the "Long-Term Tracking" objective.

    Fetch data from mood_logs.

    Render a Line Chart (using recharts) showing Emotional Valence over time (e.g., Sadness vs. Joy).

3. WellnessCard.tsx

    Appears inside the chat stream.

    If the Backend sends an activity_recommendation, render this card.

    Content: "Try this: [Activity Name] - [Duration]".

5. Implementation Guide

    Database First: Set up Supabase tables (profiles, mood_logs).

    Backend Core:

        Implement intent_engine.py (load JSON).

        Implement mood_tracker.py (Supabase inserts).

    Graph Logic:

        Ensure nodes.py calls mood_tracker.log_mood before generating the response.

    Frontend:

        Build the MoodDashboard to prove you are tracking data.

        Build the ChatInterface.

Why this fulfills "DSARG_5"

    Problem: Accessible support? Yes, Web App.

    Objective: Detect emotional tone? Yes, via GoEmotions Service.

    Objective: Long-term tracking? Yes, via Supabase mood_logs + Dashboard.

    Objective: Wellness Recs? Yes, via Logic Node injecting activities based on detected emotion.