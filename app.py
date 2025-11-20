# app.py
import uvicorn
from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text
import os
from routes_auth import router as auth_router


# Import từ file connect_database
from connect_database import lifespan, get_db

app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)

# --- 1. STATIC FILES ---
if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")

if os.path.exists("img"):
    app.mount("/img", StaticFiles(directory="img"), name="img")


# --- 2. ROUTE TRANG CHỦ ---
@app.get("/")
async def read_root():
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    return {"message": "Không tìm thấy file index.html"}


# --- 3. API TEST DATABASE ---
@app.get("/api/test-db")
async def test_db_connection(db=Depends(get_db)):
    try:
        result = await db.execute(text("SELECT count(*) FROM users"))
        count = result.scalar()

        return {
            "status": "success",
            "message": "Kết nối PostgreSQL thành công!",
            "user_count": count
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


# --- 4. ROUTE TRANG CON ---
@app.get("/{page_name}")
async def read_page(page_name: str):
    if os.path.exists(page_name) and page_name.endswith(".html"):
        return FileResponse(page_name)
    return {"error": "File not found"}


# --- 5. RUN SERVER ---
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
