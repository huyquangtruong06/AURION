# connect_database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from contextlib import asynccontextmanager

DATABASE_URL = "postgresql+asyncpg://postgres:123456789@localhost:5432/database_app"

# Tạo engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Tạo Session Factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession
)

# Dependency dùng trong route
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Lifespan: chạy khi server khởi động và tắt
@asynccontextmanager
async def lifespan(app):
    print("🔄 Đang kết nối Database...")
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))  # Test
        print("✅ Kết nối Database thành công!")
    except Exception as e:
        print(f"❌ Lỗi kết nối Database: {e}")

    yield

    print("🛑 Đang đóng kết nối Database...")
    await engine.dispose()
