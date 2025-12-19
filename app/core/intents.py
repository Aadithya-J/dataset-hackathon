import json
import numpy as np
import configparser
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Load config
config = configparser.ConfigParser()
config.read('config.ini')
THRESHOLD = float(config['App_config']['similarity_threshold'])

class IntentEngine:
    def __init__(self, json_path="data/intents.json"):
        print("Loading Intent Engine & Embeddings... (This takes a few seconds)")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
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
        
        if best_score < THRESHOLD:
            return "unknown", "I'm not sure I understand, but I'm here to listen."
        
        # 4. Return Tag and a Random Verified Response
        tag = self.tags[best_idx]
        import random
        response = random.choice(self.responses_map[tag])
        
        return tag, response