from sqlalchemy.orm import declarative_base, mapped_column, relationship
from sqlalchemy import String, Boolean, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, CITEXT, INET
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    
    email = mapped_column(CITEXT, unique=True, nullable=False)
    password_hash = mapped_column(String, nullable=False)
    
    full_name = mapped_column(String, nullable=True)
    avatar_url = mapped_column(String, nullable=True)
    
    is_verified = mapped_column(Boolean, server_default=text("false"), nullable=False)
    
    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    sessions = relationship("Session", back_populates="user", cascade="all, delete")


class Session(Base):
    __tablename__ = "sessions"
    
    id = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    refresh_token_hash = mapped_column(String, nullable=False)
    
    user_agent = mapped_column(String, nullable=True)
    ip_address = mapped_column(INET, nullable=True)
    
    created_at = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    expires_at = mapped_column(DateTime(timezone=True))

    user = relationship("User", back_populates="sessions")