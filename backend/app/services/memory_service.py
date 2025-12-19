from mem0 import MemoryClient
from ..core.config import settings
import asyncio

import random

class MemoryService:
    def __init__(self):
        self.client = None
        if settings.MEM0_API_KEY:
            try:
                self.client = MemoryClient(api_key=settings.MEM0_API_KEY)
                # Configure project-level instructions if needed, but usually done in dashboard
                # We can also pass custom prompts in add/search if supported by SDK version
            except Exception as e:
                print(f"Failed to initialize Mem0 client: {e}")

    async def get_random_memory(self, user_id: str) -> str:
        if not self.client:
            print("Mem0 client not initialized")
            return None
        
        try:
            # Run sync client method in thread pool
            loop = asyncio.get_event_loop()
            
            print(f"Fetching memories for user: {user_id}")
            # Use search with a generic query "I" to find personal memories
            memories = await loop.run_in_executor(
                None,
                lambda: self.client.search(
                    query="User",
                    filters={"user_id": user_id}
                )
            )
            print(f"Memories fetched: {memories}")
            
            # memories is usually a list of dicts or a dict with 'results'
            # If it's a list:
            if isinstance(memories, list) and memories:
                # Filter for memories that are actual text
                valid_memories = [m.get('memory') for m in memories if m.get('memory')]
                if valid_memories:
                    selected = random.choice(valid_memories)
                    print(f"Selected memory: {selected}")
                    return selected
            
            # If it's a dict with results
            elif isinstance(memories, dict) and "results" in memories:
                 valid_memories = [m.get('memory') for m in memories["results"] if m.get('memory')]
                 if valid_memories:
                    selected = random.choice(valid_memories)
                    print(f"Selected memory: {selected}")
                    return selected

            print("No valid memories found")
            return None
        except Exception as e:
            print(f"Error fetching random memory: {e}")
            return None

    async def get_therapeutic_context(self, user_id: str, user_message: str) -> str:
        if not self.client:
            return ""
        
        try:
            # Run sync client method in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            relevant_memories = await loop.run_in_executor(
                None,
                lambda: self.client.search(
                    query=user_message,
                    version="v2",
                    filters={"user_id": user_id}
                )
            )

            context_str = ""
            
            # 1. Vector Results (Semantic matches)
            if "results" in relevant_memories:
                context_str += "Past Context:\n"
                for mem in relevant_memories["results"]:
                    # Handle different response structures if needed
                    memory_text = mem.get('memory', '')
                    if memory_text:
                        context_str += f"- {memory_text}\n"
                    
            # 2. Graph Results (Entity relationships)
            if "relations" in relevant_memories:
                context_str += "\nKnown Relationships:\n"
                for rel in relevant_memories["relations"]:
                    source = rel.get('source', '')
                    relationship = rel.get('relationship', '')
                    target = rel.get('target', '')
                    if source and relationship and target:
                        context_str += f"- {source} {relationship} {target}\n"
            
            return context_str
        except Exception as e:
            print(f"Error searching memories: {e}")
            return ""

    async def save_interaction(self, user_id: str, user_message: str, assistant_response: str):
        if not self.client:
            return

        try:
            messages = [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_response}
            ]
            
            # Run sync client method in thread pool
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self.client.add(
                    messages, 
                    user_id=user_id
                )
            )
        except Exception as e:
            print(f"Error saving interaction to memory: {e}")

memory_service = MemoryService()
