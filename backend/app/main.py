import shutil
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.core import add_knowledge_to_bot, ask_bot

# --- QUAN TRỌNG: PHẢI CÓ DÒNG NÀY ---
app = FastAPI() 
# ------------------------------------

# Tạo thư mục tạm
os.makedirs("temp_uploads", exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "AI-CaaS Backend is running!"}

# API 1: Upload file
@app.post("/bots/{bot_id}/upload")
async def upload_document(bot_id: str, file: UploadFile = File(...)):
    file_path = f"temp_uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    success = add_knowledge_to_bot(file_path, bot_id)
    os.remove(file_path)

    if success:
        return {"status": "success", "message": "Bot đã học xong tài liệu!"}
    else:
        raise HTTPException(status_code=500, detail="Lỗi xử lý file")

# API 2: Chat
class ChatRequest(BaseModel):
    question: str

@app.post("/bots/{bot_id}/chat")
async def chat(bot_id: str, payload: ChatRequest):
    try:
        answer = ask_bot(payload.question, bot_id)
        return {"bot_id": bot_id, "answer": answer}
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))