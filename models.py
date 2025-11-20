from sqlalchemy.orm import declarative_base, mapped_column
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID # Import UUID của Postgres
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    # SỬA: Đổi Integer -> UUID để khớp với Database
    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    email = mapped_column(String, unique=True, nullable=False)
    password_hash = mapped_column(String, nullable=False)
    created_at = mapped_column(DateTime, default=datetime.utcnow)


class Session(Base):
    __tablename__ = "sessions"
    
    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    refresh_token_hash = mapped_column(String, nullable=False)
    
    expires_at = mapped_column(DateTime)