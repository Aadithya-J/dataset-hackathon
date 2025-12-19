from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from .routers import chat, auth, assessment, voice, analytics
from .core.database import init_supabase
import os

app = FastAPI(title="Mental Health Support Platform")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB
init_supabase()

# Include Routers
app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(assessment.router)
app.include_router(voice.router)
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

# Serve Frontend (Optional: for simple deployment)
# We'll serve the templates directory as static for simplicity in this MVP
# In a real production setup, you'd build React and serve the build folder
base_dir = os.path.dirname(os.path.dirname(__file__))
templates_dir = os.path.join(base_dir, "templates")

@app.get("/")
async def get():
    # If you want to serve the React app build, you would point this to index.html in dist/
    # For now, we keep the simple template as a fallback or landing page
    with open(os.path.join(templates_dir, "index.html")) as f:
        return HTMLResponse(content=f.read(), status_code=200)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
