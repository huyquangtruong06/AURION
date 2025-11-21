import uvicorn
from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text
import os
from routes_auth import router as auth_router
from connect_database import lifespan, get_db

app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)

#STATIC FILES
if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")

if os.path.exists("img"):
    app.mount("/img", StaticFiles(directory="img"), name="img")

if os.path.exists("script"):
    app.mount("/script", StaticFiles(directory="script"), name="script")

if os.path.exists("frontend"):
    app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

# ROUTE HOME PAGE 
@app.get("/")
async def read_root():
    if os.path.exists("index.html"):
        return FileResponse("index.html")

    frontend_index = os.path.join("frontend", "index.html")
    if os.path.exists(frontend_index):
        return FileResponse(frontend_index)

    return {"message": "Không tìm thấy file index.html"}


# API TEST DATABASE 
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


# ROUTE CHILD PAGES
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


# RUN SERVER 
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
