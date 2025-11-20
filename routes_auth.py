from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import User, Session
from connect_database import get_db  # Sửa import này nếu file kết nối của bạn tên là database.py
from passlib.hash import bcrypt
from datetime import datetime, timedelta
import secrets # Thêm thư viện tạo token ngẫu nhiên

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- ĐĂNG KÝ ---
@router.post("/register")
async def register(data: dict, db: AsyncSession = Depends(get_db)):
    email = data.get("email")
    password = data.get("password")

    # Kiểm tra email đã tồn tại
    query = await db.execute(select(User).where(User.email == email))
    if query.scalar():
        return {"status": "error", "message": "Email đã tồn tại"}

    new_user = User(
        email=email,
        password_hash=bcrypt.hash(password)
    )
    db.add(new_user)
    await db.commit()

    return {"status": "success", "redirect": "/chat.html"}


# --- ĐĂNG NHẬP ---
@router.post("/login")
async def login(data: dict, db: AsyncSession = Depends(get_db)):
    email = data.get("email")
    password = data.get("password")

    # 1. Tìm user theo email
    query = await db.execute(select(User).where(User.email == email))
    user = query.scalar()

    # 2. Kiểm tra password
    if not user or not bcrypt.verify(password, user.password_hash):
        return {"status": "error", "message": "Sai email hoặc mật khẩu"}

    # 3. Tạo token và phiên đăng nhập
    # Tạo chuỗi ngẫu nhiên an toàn (Token gốc để trả về cho client)
    raw_token = secrets.token_hex(32) 
    
    # Mã hóa token để lưu vào DB (Bảo mật)
    token_hash = bcrypt.hash(raw_token)
    
    expires = datetime.utcnow() + timedelta(days=7)
    
    # LƯU Ý: Dùng đúng tên cột 'refresh_token_hash' như trong Database
    session = Session(
        user_id=user.id,
        refresh_token_hash=token_hash, 
        expires_at=expires
    )
    db.add(session)
    await db.commit()

    # 4. Trả về kết quả
    return {
        "status": "success",
        "redirect": "/chat.html",
        "session_token": raw_token  # Trả về token gốc cho người dùng lưu
    }