from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import User, Session
from connect_database import get_db  
from passlib.hash import bcrypt
from datetime import datetime, timedelta
import secrets 
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
async def register(data: dict, db: AsyncSession = Depends(get_db)):
    email = data.get("email")
    password = data.get("password")

    query = await db.execute(select(User).where(User.email == email))
    if query.scalar():
        return {"status": "error", "message": "Email exists"}

    new_user = User(
        email=email,
        password_hash=bcrypt.hash(password)
    )
    db.add(new_user)
    await db.commit()

    return {"status": "success", "redirect": "/chat.html"}


@router.post("/login")
async def login(data: dict, db: AsyncSession = Depends(get_db)):
    email = data.get("email")
    password = data.get("password")

    query = await db.execute(select(User).where(User.email == email))
    user = query.scalar()

    if not user or not bcrypt.verify(password, user.password_hash):
        return {"status": "error", "message": "Incorrect email or password"}

    raw_token = secrets.token_hex(32) 
    
    token_hash = bcrypt.hash(raw_token)
    
    expires = datetime.utcnow() + timedelta(days=7)
    
    session = Session(
        user_id=user.id,
        refresh_token_hash=token_hash, 
        expires_at=expires
    )
    db.add(session)
    await db.commit()

    return {
        "status": "success",
        "redirect": "/chat.html",
        "session_token": raw_token  
    }

@router.post("/logout")
async def logout(data: dict, db: AsyncSession = Depends(get_db)):
    raw_token = data.get("session_token")
    if not raw_token:
        return {"status": "error", "message": "No session token provided"}

    try:
        result = await db.execute(select(Session))
        sessions = result.scalars().all()
        found = False
        for s in sessions:
            try:
                if bcrypt.verify(raw_token, s.refresh_token_hash):
                    db.delete(s)
                    found = True
            except Exception:
                continue

        if found:
            await db.commit()
            return {"status": "success", "message": "Logged out"}

        return {"status": "error", "message": "Session not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}