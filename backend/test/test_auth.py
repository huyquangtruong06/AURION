import pytest
import uuid
from httpx import AsyncClient

def generate_unique_email():
    return f"tester_{uuid.uuid4().hex[:8]}@example.com"

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    unique_email = generate_unique_email()
    payload = {
        "email": unique_email,
        "password": "TestPassword123!",
        "full_name": "Test User"
    }
    
    response = await client.post("/api/register", data=payload)
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"

@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    email = generate_unique_email()
    password = "TestPassword123!"
    
    await client.post("/api/register", data={
        "email": email, 
        "password": password, 
        "full_name": "Login User"
    })

    response = await client.post("/api/login", data={
        "email": email,
        "password": password
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "token" in data["data"]

@pytest.mark.asyncio
async def test_get_profile(client: AsyncClient):
    email = generate_unique_email()
    password = "pass"
    
    await client.post("/api/register", data={"email": email, "password": password, "full_name": "Pro"})
    login_res = await client.post("/api/login", data={"email": email, "password": password})
    token = login_res.json()["data"]["token"]

    response = await client.get("/api/profile", headers={"Authorization": token})
    
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["email"] == email
    assert data["data"]["credits"] == 100 

@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    response = await client.post("/api/login", data={
        "email": "non_existent@test.com",
        "password": "WrongPassword"
    })
    data = response.json()
    assert data["status"] == "error"