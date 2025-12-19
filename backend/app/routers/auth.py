from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from ..core.database import get_supabase

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""

@router.post("/auth/signup")
async def signup(request: SignupRequest):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name
                }
            }
        })
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/auth/login")
async def login(request: LoginRequest):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database connection unavailable")

    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/auth/anonymous")
async def anonymous_login():
    supabase = get_supabase()
    
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        # Note: Anonymous sign-ins must be enabled in Supabase Dashboard
        response = supabase.auth.sign_in_anonymously()
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
