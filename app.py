import uvicorn
from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text
import os
from connect_database import lifespan, get_db
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(lifespan=lifespan)

# Cho phép mọi nguồn (để nhúng bot vào web bất kỳ)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Import 2 routers
from routes_auth import router as auth_router
from routes_app import router as app_router

app = FastAPI(lifespan=lifespan)

# Đăng ký Routers
app.include_router(auth_router)
app.include_router(app_router)

# Mount Static Files
if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")
if os.path.exists("img"):
    app.mount("/img", StaticFiles(directory="img"), name="img")
if os.path.exists("script"):
    app.mount("/script", StaticFiles(directory="script"), name="script")
if os.path.exists("frontend"):
    app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

@app.get("/")
async def read_root():
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    frontend_index = os.path.join("frontend", "index.html")
    if os.path.exists(frontend_index):
        return FileResponse(frontend_index)
    return {"message": "Do not find file index.html"}

@app.get("/api/test-db")
async def test_db_connection(db=Depends(get_db)):
    try:
        result = await db.execute(text("SELECT count(*) FROM users"))
        count = result.scalar()
        return {"status": "success", "message": "PostgreSQL connection successful!", "user_count": count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/{page_name:path}")
async def read_page(page_name: str):
    if os.path.exists(page_name) and page_name.endswith(".html"):
        return FileResponse(page_name)
    if page_name.startswith("frontend/"):
        stripped = page_name.split('/', 1)[1]
        frontend_path = os.path.join("frontend", stripped)
        if os.path.exists(frontend_path) and frontend_path.endswith(".html"):
            return FileResponse(frontend_path)
    frontend_path = os.path.join("frontend", page_name)
    if os.path.exists(frontend_path) and frontend_path.endswith(".html"):
        return FileResponse(frontend_path)
    return {"error": "File not found"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)