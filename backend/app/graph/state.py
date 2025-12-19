from typing import TypedDict, Annotated, List
from langchain_core.messages import AnyMessage
import operator

class AgentState(TypedDict):
    messages: Annotated[List[AnyMessage], operator.add]
    current_intent: str
    current_emotion: str
    emotion_confidence: float
    emotion_source: str
    retrieved_response: str
    risk_score: int
    wellness_recommendation: str
    last_recommendation: str
    user_id: str
