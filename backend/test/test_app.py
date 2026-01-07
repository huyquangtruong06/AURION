import pytest
import uuid
from httpx import AsyncClient
# pip install pytest pytest-asyncio httpx

async def get_auth_token(client, email=None):
    if not email:
        email = f"user_{uuid.uuid4().hex[:8]}@test.com"
        
    await client.post("/api/register", data={"email": email, "password": "pass", "full_name": "App User"})
    
    res = await client.post("/api/login", data={"email": email, "password": "pass"})
    return res.json()["data"]["token"]

@pytest.mark.asyncio
async def test_create_bot(client: AsyncClient):
    token = await get_auth_token(client)
    headers = {"Authorization": token}
    
    unique_name = f"Test Bot {uuid.uuid4().hex[:8]}"
    
    payload = {
        "name": unique_name,
        "description": "A bot for testing",
        "system_prompt": "You are a test bot."
    }
    
    response = await client.post("/api/bots/create", data=payload, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "bot_id" in data
    
    return data["bot_id"], headers

@pytest.mark.asyncio
async def test_get_bots_list(client: AsyncClient):
    token = await get_auth_token(client)
    headers = {"Authorization": token}
    
    await client.post("/api/bots/create", data={"name": f"Bot {uuid.uuid4()}", "system_prompt": "x"}, headers=headers)
    
    response = await client.get("/api/bots", headers=headers)
    assert response.status_code == 200
    bots = response.json()["data"]
    assert len(bots) >= 1

@pytest.mark.asyncio
async def test_chat_with_ai(client: AsyncClient):
    token = await get_auth_token(client) 
    headers = {"Authorization": token}
    
    unique_name = f"Chat Bot {uuid.uuid4().hex[:8]}"
    create_res = await client.post("/api/bots/create", data={
        "name": unique_name, "system_prompt": "act as ai"
    }, headers=headers)
    
    bot_id = create_res.json()["bot_id"]
    
    # Chat
    payload = {
        "message": "Hello AI",
        "bot_id": bot_id,
        "model": "gemini-2.5-flash"
    }
    
    response = await client.post("/api/chat/message", json=payload, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["response"] == "This is a Mock AI Response for Testing."

@pytest.mark.asyncio
async def test_upload_knowledge(client: AsyncClient):
    token = await get_auth_token(client) # new User 
    headers = {"Authorization": token}
    
    files = {'file': ('test_doc.txt', b'This is content', 'text/plain')}
    
    response = await client.post("/api/knowledge/upload", files=files, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"

@pytest.mark.asyncio
async def test_buy_credits(client: AsyncClient):
    token = await get_auth_token(client) 
    headers = {"Authorization": token}
    
    response = await client.post("/api/subscription/buy-credits", data={"amount": 500}, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["new_balance"] == 600