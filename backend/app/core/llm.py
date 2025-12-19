from langchain_groq import ChatGroq
from .config import settings

def get_llm():
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=settings.MODEL_NAME,
        temperature=0.7
    )

llm = get_llm()
