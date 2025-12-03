from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import User, Session
from connect_database import get_db
# Dùng passlib theo yêu cầu của bạn
from passlib.hash import bcrypt 
from datetime import datetime, timedelta
import secrets
import uuid

# Đổi prefix thành /api để khớp với code frontend cũ
router = APIRouter(prefix="/api", tags=["Authentication"])

@router.post("/register")
async def register(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        email = data.get("email")
        password = data.get("password")
        full_name = data.get("full_name")

        # Kiểm tra user tồn tại
        query = await db.execute(select(User).where(User.email == email))
        if query.scalar():
            return {"status": "error", "message": "Email already exists"}

        # Hash password bằng passlib
        hashed_pw = bcrypt.hash(password)

        new_user = User(
            email=email,
            password_hash=hashed_pw,
            full_name=full_name
        )
        db.add(new_user)
        await db.commit()

        return {"status": "success", "redirect": "/frontend/chat.html"}
    except Exception as e:
        print(f"Error Register: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/login")
async def login(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        email = data.get("email")
        password = data.get("password")

        # Tìm User
        query = await db.execute(select(User).where(User.email == email))
        user = query.scalar()

        # Verify password bằng passlib
        if not user or not bcrypt.verify(password, user.password_hash):
            return {"status": "error", "message": "Incorrect email or password"}

        # Tạo Token
        raw_token = secrets.token_hex(32)
        token_hash = bcrypt.hash(raw_token) # Hash token bằng passlib
        expires = datetime.utcnow() + timedelta(days=7)
        
        # Lấy IP (chuyển sang string)
        client_ip = str(request.client.host) if request.client else "unknown"
        user_agent = request.headers.get("user-agent")
        
        session = Session(
            user_id=user.id,
            refresh_token_hash=token_hash,
            expires_at=expires,
            ip_address=client_ip, # Bây giờ là String, không bị lỗi SQL nữa
            user_agent=user_agent
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        combined_token = f"{session.id}:{raw_token}"

        return {
            "status": "success",
            "redirect": "/frontend/chat.html",
            "session_token": combined_token
        }
    except Exception as e:
        print(f"Error Login: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/logout")
async def logout(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        combined_token = data.get("session_token")
        if not combined_token:
            return {"status": "error", "message": "No session token provided"}

        if ":" in combined_token:
            session_id_str, raw_token = combined_token.split(":", 1)
            session_id = uuid.UUID(session_id_str)
            
            query = await db.execute(select(Session).where(Session.id == session_id))
            session_obj = query.scalar()

            if session_obj and bcrypt.verify(raw_token, session_obj.refresh_token_hash):
                await db.delete(session_obj)
                await db.commit()
                return {"status": "success", "message": "Logged out"}
        
        return {"status": "error", "message": "Session not found or invalid"}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}