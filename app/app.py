import configparser
import os

# Suppress tokenizer warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import StateGraph, START, END

# Import core modules
from core.state import AgentState
from core.intents import IntentEngine
from core.emotions import get_current_emotion
from core.logic import analyze_risk_factors

# 1. Setup & Config
config = configparser.ConfigParser()
config.read('config.ini')

os.environ["GROQ_API_KEY"] = config['LLM_config']['groq_api_key']

# Initialize Intent Engine (Loads model once)
intent_engine = IntentEngine()

# Initialize LLM
llm = ChatGroq(
    model=config['LLM_config']['model_name'],
    temperature=0
)

# ---------------- NODES ----------------

def analysis_node(state: AgentState):
    """
    Run Parallel Analysis: Intent (Vector) + Emotion (Mock) + Logic
    """
    last_message = state['messages'][-1].content
    
    # 1. Detect Intent (Semantic Search)
    tag, verified_response = intent_engine.detect_intent(last_message)
    
    # 2. Detect Emotion (Mock API)
    emotion = get_current_emotion(last_message)
    
    # 3. Analyze Risk (Kaggle Logic)
    risk = analyze_risk_factors(last_message, state['messages'])
    
    print(f"DEBUG -> Intent: {tag} | Emotion: {emotion} | Risk: {risk}")
    
    return {
        "current_intent": tag,
        "current_emotion": emotion,
        "retrieved_response": verified_response,
        "risk_score": risk
    }

def generation_node(state: AgentState):
    """
    Generate response using LLM + Retrieved Context
    """
    intent = state['current_intent']
    emotion = state['current_emotion']
    anchor = state['retrieved_response']
    risk = state['risk_score']
    
    # SAFETY GATE: If crisis, bypass LLM creativity
    if intent == "crisis":
        return {"messages": [AIMessage(content=anchor)]}

    # Construct the Prompt
    if intent == "unknown":
        system_prompt = (
            f"You are a compassionate mental health assistant.\n"
            f"Context:\n"
            f"- User Emotion: {emotion}\n"
            f"- Risk Score: {risk}/10\n"
            f"Instruction: The user's intent was not automatically classified. "
            f"Respond naturally to the user's message while maintaining the flow of the conversation. "
            f"Be warm, supportive, and helpful. Reference previous parts of the conversation if relevant. "
            f"If the user asks about your internal state or intent, answer honestly based on the context. "
            f"Do not give medical prescriptions."
        )
    else:
        system_prompt = (
            f"You are a compassionate mental health assistant.\n"
            f"Context:\n"
            f"- User Emotion: {emotion}\n"
            f"- Risk Score: {risk}/10\n"
            f"- Expert Verification: The user's intent is '{intent}'.\n"
            f"Instruction: Use this expert advice as a guide: '{anchor}'. "
            f"Deliver a response that incorporates this advice naturally into the ongoing conversation. "
            f"Do not just repeat the advice; make it part of a warm, supportive dialogue that acknowledges the user's history. "
            f"Do not give medical prescriptions."
        )
    
    messages = [SystemMessage(content=system_prompt)] + state['messages']
    
    response = llm.invoke(messages)
    return {"messages": [response]}

# ---------------- GRAPH ----------------

workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("analyst", analysis_node)
workflow.add_node("generator", generation_node)

# Add Edges
workflow.add_edge(START, "analyst")
workflow.add_edge("analyst", "generator")
workflow.add_edge("generator", END)

# Compile
app = workflow.compile()

# ---------------- RUNNER (Simulated Chat) ----------------
if __name__ == "__main__":
    print("--- Mental Health Bot Started (Type 'quit' to exit) ---")
    
    # Initialize state with empty messages
    state = {"messages": []}
    
    while True:
        user_input = input("You: ")
        if user_input.lower() in ["quit", "exit"]:
            break
            
        # Add user message to state
        state["messages"].append(HumanMessage(content=user_input))
        
        # Run the graph with the current state
        # The graph will append the bot's response to the messages list
        result = app.invoke(state)
        
        # Update our local state with the result from the graph
        state = result
        
        bot_response = state['messages'][-1].content
        print(f"Bot: {bot_response}\n")