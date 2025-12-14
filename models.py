from sqlalchemy.orm import declarative_base, mapped_column, relationship
from sqlalchemy import String, Boolean, DateTime, ForeignKey, text, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid     

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = mapped_column(String, unique=True, nullable=False)
    password_hash = mapped_column(String, nullable=False)
    full_name = mapped_column(String, nullable=True)
    avatar_url = mapped_column(String, nullable=True)
    is_verified = mapped_column(Boolean, server_default=text("false"), nullable=False)
    
    # --- [QUAN TRỌNG] CÁC CỘT MỚI CHO THANH TOÁN & GIỚI HẠN ---
    plan_type = mapped_column(String, default="free")   # 'free' hoặc 'pro'
    pro_expires_at = mapped_column(DateTime(timezone=True), nullable=True) # Ngày hết hạn gói Pro
    
    credits = mapped_column(Integer, default=100)       # Ví tiền (Xu). Mặc định tặng 100 xu.
    
    daily_requests_count = mapped_column(Integer, default=0) # Đếm số tin nhắn trong ngày
    last_request_date = mapped_column(DateTime(timezone=True), nullable=True) # Lưu ngày chat cuối để reset bộ đếm
    # ----------------------------------------------------------

    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    
    # Quan hệ
    sessions = relationship("Session", back_populates="user", cascade="all, delete")
    otps = relationship("OTP", back_populates="user", cascade="all, delete")


class Session(Base):
    __tablename__ = "sessions"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token_hash = mapped_column(String, nullable=False)
    user_agent = mapped_column(String, nullable=True)
    ip_address = mapped_column(String, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    expires_at = mapped_column(DateTime(timezone=True))
    user = relationship("User", back_populates="sessions")

class Bot(Base):
    __tablename__ = "bots"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = mapped_column(String, nullable=False)
    description = mapped_column(String, nullable=True)
    system_prompt = mapped_column(Text, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))

class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # [QUAN TRỌNG] Cột này quyết định file thuộc về ai:
    # - Có bot_id: Kiến thức riêng cho Bot đó.
    # - bot_id là NULL: Kiến thức chung (General).
    bot_id = mapped_column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=True)
    
    filename = mapped_column(String, nullable=False)
    file_path = mapped_column(String, nullable=False)
    file_size = mapped_column(String, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))

class OTP(Base):
    __tablename__ = "otps"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    code = mapped_column(String, nullable=False)
    expires_at = mapped_column(DateTime(timezone=True), nullable=False)
    is_used = mapped_column(Boolean, server_default=text("false"))
    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    user = relationship("User", back_populates="otps")

class Referral(Base):
    __tablename__ = "referrals"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    referrer_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    referred_email = mapped_column(String, nullable=False)
    status = mapped_column(String, default="PENDING")
    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))