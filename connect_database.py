from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from contextlib import asynccontextmanager

# JWT Configuration
SECRET_KEY = "bi_mat_khong_bat_mi_12345"
DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_Hm5wARG8nODQ@ep-cold-sun-a1xplpet-pooler.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

engine = create_async_engine(DATABASE_URL, echo=False)

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
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))  # Test
    except Exception as e:
        print(f" Error Database: {e}")

    yield

    await engine.dispose()
