from typing import TypedDict, Annotated, List
from langchain_core.messages import AnyMessage
import operator

class AgentState(TypedDict):
    messages: Annotated[List[AnyMessage], operator.add]
    current_intent: str       # The detected intent tag (e.g., 'anxiety')
    current_emotion: str      # The detected emotion (e.g., 'fear')
    retrieved_response: str   # The verified expert response from JSON
    risk_score: int           # 0 = Safe, 10 = High Risk