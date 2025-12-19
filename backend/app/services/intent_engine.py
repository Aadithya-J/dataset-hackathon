import json
import numpy as np
import os
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from ..core.config import settings

class IntentEngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(IntentEngine, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        print("Loading Intent Engine & Embeddings... (This takes a few seconds)")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Path to intents.json
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        json_path = os.path.join(base_dir, "data/intents.json")
        
        self.data = self._load_data(json_path)
        self.patterns = []
        self.tags = []
        self.responses_map = {}
        
        # Flatten the JSON into lists for vectorization
        for intent in self.data['intents']:
            tag = intent['tag']
            self.responses_map[tag] = intent['responses']
            for pattern in intent['patterns']:
                self.patterns.append(pattern)
                self.tags.append(tag)
        
        # Pre-compute embeddings for all patterns
        self.pattern_embeddings = self.model.encode(self.patterns)
        self._initialized = True
        print("Intent Engine Ready.")

    def _load_data(self, path):
        with open(path, 'r') as f:
            return json.load(f)

    def detect_intent(self, user_text):
        # 1. Encode user text
        user_embedding = self.model.encode([user_text])
        
        # 2. Calculate cosine similarity against all patterns
        similarities = cosine_similarity(user_embedding, self.pattern_embeddings)[0]
        
        # 3. Find best match
        best_idx = np.argmax(similarities)
        best_score = similarities[best_idx]
        
        if best_score < settings.SIMILARITY_THRESHOLD:
            return "unknown", "I'm not sure I understand, but I'm here to listen."
        
        # 4. Return Tag and a Random Verified Response
        tag = self.tags[best_idx]
        import random
        response = random.choice(self.responses_map[tag])
        
        return tag, response

intent_engine = IntentEngine()
