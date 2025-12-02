from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import User, Session
from connect_database import get_db
from passlib.hash import bcrypt
from datetime import datetime, timedelta
import secrets
import uuid
from jwt_utils import create_access_token, create_refresh_token, verify_refresh_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
async def register(data: dict, db: AsyncSession = Depends(get_db)):
    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")

    query = await db.execute(select(User).where(User.email == email))
    if query.scalar():
        return {"status": "error", "message": "Email exists"}

    new_user = User(
        email=email,
        password_hash=bcrypt.hash(password),
        full_name=full_name
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "status": "success",
        "redirect": "/chat.html",
        "user_id": str(new_user.id)
    }


@router.post("/login")
async def login(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    email = data.get("email")
    password = data.get("password")

    query = await db.execute(select(User).where(User.email == email))
    user = query.scalar()

    if not user or not bcrypt.verify(password, user.password_hash):
        return {"status": "error", "message": "Incorrect email or password"}

    # Tạo JWT tokens
    access_token, jti = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    
    # Lưu refresh token hash vào database
    refresh_token_hash = bcrypt.hash(refresh_token)
    expires = datetime.utcnow() + timedelta(days=7)
    
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent")
    
    session = Session(
        user_id=user.id,
        refresh_token_hash=refresh_token_hash,
        access_token_jti=jti,
        expires_at=expires,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "status": "success",
        "redirect": "/chat.html",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 15 * 60
    }

@router.post("/refresh")
async def refresh_access_token(data: dict, db: AsyncSession = Depends(get_db)):
    """Refresh access token bằng refresh token"""
    refresh_token = data.get("refresh_token")
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required"
        )
    
    # Verify refresh token
    payload = verify_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id = payload.get("sub")
    
    # Kiểm tra session có tồn tại không
    query = await db.execute(
        select(Session).where(
            (Session.user_id == uuid.UUID(user_id)) &
            (Session.expires_at > datetime.utcnow())
        )
    )
    session_obj = query.scalar()
    
    if not session_obj or not bcrypt.verify(refresh_token, session_obj.refresh_token_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )
    
    # Tạo access token mới
    new_access_token, new_jti = create_access_token(user_id)
    
    # Cập nhật JTI trong session
    session_obj.access_token_jti = new_jti
    await db.commit()
    
    return {
        "status": "success",
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": 15 * 60
    }


@router.post("/logout")
async def logout(data: dict, db: AsyncSession = Depends(get_db)):
    access_token = data.get("access_token")
    
    if not access_token:
        return {"status": "error", "message": "No access token provided"}

    # Xóa session dựa trên JTI hoặc user_id
    try:
        # Nếu có refresh token, xóa bằng đó
        refresh_token = data.get("refresh_token")
        if refresh_token:
            payload = verify_refresh_token(refresh_token)
            if payload:
                user_id = uuid.UUID(payload.get("sub"))
                query = await db.execute(
                    select(Session).where(Session.user_id == user_id)
                )
                session_obj = query.scalar()
                if session_obj:
                    await db.delete(session_obj)
                    await db.commit()
                    return {"status": "success", "message": "Logged out"}
        
        return {"status": "error", "message": "Session not found"}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}