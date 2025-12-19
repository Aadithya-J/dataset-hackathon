from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import json
import asyncio
from ..graph.workflow import app_workflow
from ..services.history_service import fetch_chat_history, save_chat_message, fetch_user_sessions
from ..services.memory_service import memory_service
from ..core.llm import llm

router = APIRouter()

@router.post("/chat/starter/{user_id}")
async def get_starter_message(user_id: str):
    # 1. Try to get a random memory
    memory = await memory_service.get_random_memory(user_id)
    
    if not memory:
        return {"message": "Hi there! How are you feeling today?"}
        
    # 2. Generate a personalized starter
    prompt = f"""
    The user has this memory: "{memory}".
    Generate a short, warm, and empathetic opening message for a new chat session that gently references this memory.
    Example: If memory is "scared of exams", say "Hey, I was thinking about you. How is the exam prep going?"
    Keep it under 20 words.
    """
    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a supportive friend."),
            HumanMessage(content=prompt),
        ])

        message = response.content

        # Remove surrounding single or double quotes if present
        if (message.startswith('"') and message.endswith('"')) or (
            message.startswith("'") and message.endswith("'")
        ):
            message = message[1:-1]

        return {"message": message}

    except Exception as e:
        print(f"Error generating starter: {e}")
        return {"message": "Hi there! How are you feeling today?"}


@router.get("/chat/sessions/{user_id}")
async def get_sessions(user_id: str):
    return await fetch_user_sessions(user_id)

@router.get("/chat/history/{session_id}")
async def get_history(session_id: str):
    return await fetch_chat_history(session_id)

@router.websocket("/ws/chat/{client_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, session_id: str):
    await websocket.accept()
    
    # 1. Load History from Supabase for this SESSION
    history_records = await fetch_chat_history(session_id)
    history_messages = []
    
    # Send history payload
    if history_records:
        # Convert datetime objects to string
        history_data = []
        for r in history_records:
            history_data.append({
                "role": "model" if r['role'] == 'bot' else "user", # Normalize role
                "content": r['content'],
                "timestamp": r['created_at']
            })
            
            # Rebuild LangChain state
            if r['role'] == 'user':
                history_messages.append(HumanMessage(content=r['content']))
            else:
                history_messages.append(AIMessage(content=r['content']))

        await websocket.send_text(json.dumps({
            "type": "history",
            "data": history_data
        }))
    
    # Initialize state with loaded history
    state = {"messages": history_messages, "user_id": client_id}
    
    try:
        while True:
            data = await websocket.receive_text()
            
            # 2. Save User Message
            await save_chat_message(client_id, session_id, "user", data)
            
            # Update state with user message
            state["messages"].append(HumanMessage(content=data))
            
            # Run the graph
            result = await app_workflow.ainvoke(state)
            
            # Update state
            state = result
            
            # Get bot response
            bot_response = state['messages'][-1].content
            
            # 3. Save Bot Response
            await save_chat_message(client_id, session_id, "bot", bot_response)
            
            # 4. Save Interaction to Mem0 (Async/Background)
            # We use asyncio.create_task to not block the websocket response
            asyncio.create_task(memory_service.save_interaction(client_id, data, bot_response))
            
            # Send as JSON
            await websocket.send_text(json.dumps({
                "type": "message",
                "role": "model",
                "content": bot_response
            }))
            
    except WebSocketDisconnect:
        print(f"Client #{client_id} left the chat")
