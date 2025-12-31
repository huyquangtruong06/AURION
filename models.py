from sqlalchemy.orm import declarative_base, mapped_column, relationship
from sqlalchemy import String, Boolean, DateTime, ForeignKey, text, Text, UniqueConstraint, Integer
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

Base = declarative_base()

# ========================================================
# 1. BẢNG USER (ĐÃ CẬP NHẬT CREDITS VÀ GÓI CƯỚC)
# ========================================================
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


# ========================================================
# 2. CÁC BẢNG CƠ BẢN KHÁC (SESSION, BOT, MESSAGE...)
# ========================================================

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
    bot_id = mapped_column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=True)
    filename = mapped_column(String, nullable=False)
    file_path = mapped_column(String, nullable=False)
    file_size = mapped_column(String, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))

class Message(Base):
    __tablename__ = "messages"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    bot_id = mapped_column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=True)
    role = mapped_column(String, nullable=False) 
    content = mapped_column(Text, nullable=False)
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


# ========================================================
# 3. QUẢN LÝ NHÓM (GROUPS)
# ========================================================

class Group(Base):
    __tablename__ = "groups"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = mapped_column(String, nullable=False)
    description = mapped_column(String, nullable=True)
    owner_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))

class GroupMember(Base):
    __tablename__ = "group_members"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    group_id = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = mapped_column(String, default="MEMBER") 
    joined_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    # Ràng buộc: Một người chỉ được vào 1 nhóm một lần
    __table_args__ = (UniqueConstraint('group_id', 'user_id', name='uq_group_member'),)

class GroupBot(Base):
    __tablename__ = "group_bots"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    group_id = mapped_column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    bot_id = mapped_column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    added_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    # Ràng buộc: Một nhóm chỉ có 1 Bot (hoặc các bot không trùng nhau)
    __table_args__ = (UniqueConstraint('group_id', 'bot_id', name='uq_group_bot'),)

class Ticket(Base):
    __tablename__ = "tickets"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject = mapped_column(String, nullable=False)
    status = mapped_column(String, default="OPEN") # OPEN, ANSWERED, CLOSED
    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    
    # Quan hệ
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete")

class TicketMessage(Base):
    __tablename__ = "ticket_messages"
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    ticket_id = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    sender_role = mapped_column(String, nullable=False) # 'user', 'support', 'ai'
    content = mapped_column(Text, nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    
    ticket = relationship("Ticket", back_populates="messages")