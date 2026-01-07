import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from main import app
from connect_database import get_db
from models import Base
import os
from unittest.mock import MagicMock

TEST_DATABASE_URL = os.getenv("DATABASE_URL")

@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        pool_pre_ping=True
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    yield engine
    
    await engine.dispose()

@pytest_asyncio.fixture(scope="function")
async def async_session(db_engine):
    """Tạo session từ engine của test hiện tại"""
    TestingSessionLocal = sessionmaker(bind=db_engine, class_=AsyncSession, expire_on_commit=False)
    
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture(scope="function")
async def client(async_session):
    async def override_get_db():
        yield async_session

    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
def mock_external_services(monkeypatch):
    mock_smtp = MagicMock()
    monkeypatch.setattr("smtplib.SMTP", mock_smtp)
    
    mock_genai = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "This is a Mock AI Response for Testing."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response
    monkeypatch.setattr("google.generativeai.GenerativeModel", MagicMock(return_value=mock_model))
    
    mock_cloudinary = MagicMock()
    mock_cloudinary.uploader.upload.return_value = {
        "secure_url": "http://mock-cloudinary.com/fake-image.jpg"
    }
    monkeypatch.setattr("cloudinary.uploader", mock_cloudinary.uploader)
    
    mock_groq = MagicMock()
    mock_chat = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Mock Groq Response"
    mock_chat.choices = [mock_choice]
    mock_groq.chat.completions.create.return_value = mock_chat
    monkeypatch.setattr("routes.app.groq_client", mock_groq)