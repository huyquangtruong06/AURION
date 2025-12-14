from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from contextlib import asynccontextmanager
import os

# Import Base để biết cần tạo những bảng nào
from models import Base, User, Session, Bot, KnowledgeBase 

# URL Database của bạn
DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_Hm5wARG8nODQ@ep-cold-sun-a1xplpet-pooler.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

# --- CẬP NHẬT CẤU HÌNH ENGINE ĐỂ TRÁNH LỖI CACHE ---
engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    # Tự động kiểm tra kết nối sống hay chết trước khi dùng
    pool_pre_ping=True,
    # Tắt tính năng cache câu lệnh SQL (Fix lỗi InvalidCachedStatementError khi reset DB)
    connect_args={
        "statement_cache_size": 0
    }
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

@asynccontextmanager
async def lifespan(app):
    print("🚀 Server đang khởi động...")
    
    # 1. Tự động tạo bảng nếu chưa có (Create Tables)
    try:
        async with engine.begin() as conn:
            # Dòng này sẽ tạo bảng sessions, users, bots... nếu chúng chưa tồn tại
            await conn.run_sync(Base.metadata.create_all)
            print("✅ Đã kiểm tra và tạo các bảng database thành công!")
    except Exception as e:
        print(f"⚠️ Lỗi khi tạo bảng: {e}")

    # 2. Test kết nối
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            print("✅ Kết nối Database thành công!")
    except Exception as e:
        print(f"❌ Lỗi kết nối Database: {e}")

    yield

    await engine.dispose()
    print("🛑 Server đã tắt.")