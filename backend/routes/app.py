from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_, delete, update, and_
from connect_database import get_db
from connect_database import AsyncSessionLocal
from models import Bot, Referral, KnowledgeBase, User, Message, Group, GroupMember, GroupBot, Session, Group, Ticket, TicketMessage
import shutil
import os
import uuid
import mimetypes
from datetime import datetime, timedelta, timezone
from fastapi import Request
import bcrypt
from passlib.hash import bcrypt
from pydantic import BaseModel
import cloudinary
import cloudinary.uploader
import requests
import io
import tempfile
from groq import Groq 

# --- IMPORT GOOGLE GENAI ---
from dotenv import load_dotenv
import google.generativeai as genai
import pypdf
from docx import Document
from routes.auth import send_pro_success_email, send_credit_success_email 
from pydantic import BaseModel

class PublicChatRequest(BaseModel):
    message: str
    bot_id: str

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

cloudinary.config( 
  cloud_name = os.getenv("cloud_name"), 
  api_key = os.getenv("api_key"), 
  api_secret = os.getenv("api_secret"),
  secure = True
)

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

groq_client = None
if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)

router = APIRouter(prefix="/api", tags=["App"])

PLAN_LIMITS = {
    "free": 10,   
    "pro": 1000   
}
BOT_CREATION_COST = 50 

def ai_extract_content(file_bytes, mime_type):
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = "Extract all text content from this document/image verbatim. If it's an image without text, describe it in detail."
        file_part = {
            "mime_type": mime_type,
            "data": file_bytes
        }
        response = model.generate_content([prompt, file_part])
        return response.text
    except Exception as e:
        return f"[AI Extraction Error: {str(e)}]"
    
async def process_ticket_ai_reply(ticket_id: uuid.UUID, user_content: str, subject_context: str = ""):
    async with AsyncSessionLocal() as db: 
        try:
            ai_prompt = f"""
            You are a polite Tier 1 Support Agent for the AI-CaaS system.
            Ticket Subject: "{subject_context}"
            User Message: "{user_content}"
            
            Instructions:
            - Acknowledge the user's issue based on the subject and message.
            - If it looks like a billing issue, ask for the Transaction ID.
            - If it's a technical error, suggest refreshing the page or checking the connection.
            - Keep the tone professional and empathetic.
            - Answer in under 100 words.
            """
            
            ai_reply = "System Error: AI could not generate a response." 
            
            try:
                try:
                    model = genai.GenerativeModel("gemini-2.5-flash")
                    response = model.generate_content(ai_prompt)
                    ai_reply = response.text
                except:
                    model = genai.GenerativeModel("gemini-pro")
                    response = model.generate_content(ai_prompt)
                    ai_reply = response.text

            except Exception as e_ai:
                ai_reply = f"System note: AI is currently unavailable. Our human support will check this shortly. (Error: {str(e_ai)})"

            db.add(TicketMessage(ticket_id=ticket_id, sender_role="ai", content=ai_reply))
            
            stmt = select(Ticket).where(Ticket.id == ticket_id)
            ticket = (await db.execute(stmt)).scalars().first()
            if ticket:
                ticket.status = "ANSWERED"
                ticket.updated_at = datetime.now(timezone.utc) 
            
            await db.commit()
            print(f"Background AI reply sent successfully for ticket {ticket_id}")
            
        except Exception as e:
            print(f"Background Task Critical Error: {e}")
            await db.rollback()

async def check_and_update_quota(db: AsyncSession, user_id: uuid.UUID):
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    now = datetime.now(timezone.utc)
    if not user.last_request_date or user.last_request_date.date() < now.date():
        user.daily_requests_count = 0
        user.last_request_date = now

    limit = PLAN_LIMITS.get(user.plan_type, 10)
    if user.daily_requests_count >= limit:
        raise HTTPException(status_code=402, detail=f"You have reached your daily chat limit ({limit}/{limit}). Please upgrade to PRO!")

    user.daily_requests_count += 1
    return user

async def get_current_user_id(request: Request, db: AsyncSession): 
    token = request.headers.get("Authorization")
    
    if not token or ":" not in token:
        raise HTTPException(status_code=401, detail="You are not logged in!")
    
    try:
        session_id_str, raw_token = token.split(":", 1)
        session_id = uuid.UUID(session_id_str)
        
        query = await db.execute(select(Session).where(Session.id == session_id))
        session = query.scalar()
        
        if session and bcrypt.verify(raw_token, session.refresh_token_hash):
            if session.expires_at > datetime.now(timezone.utc):
                return session.user_id
            
    except Exception as e:
        print(f"Auth Error: {e}")
        pass
        
    raise HTTPException(status_code=401, detail="Invalid session")

async def check_is_owner(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID):
    stmt = select(GroupMember).where(
        GroupMember.group_id == group_id, 
        GroupMember.user_id == user_id, 
        GroupMember.role == "OWNER"
    )
    check = (await db.execute(stmt)).scalars().first()
    
    if not check:
        raise HTTPException(status_code=403, detail="Only the Group Owner has this permission!")

@router.get("/bots")
async def get_bots(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        
        result = await db.execute(select(Bot).where(Bot.user_id == user_id).order_by(desc(Bot.created_at)))
        bots = result.scalars().all()
        
        data = []
        for bot in bots:
            data.append({
                "id": str(bot.id),
                "name": bot.name,
                "description": bot.description,
                "system_prompt": bot.system_prompt,
                "created_at": bot.created_at.isoformat() if bot.created_at else None
            })
            
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/bots/create")
async def create_bot(request: Request, name: str = Form(...), description: str = Form(None), system_prompt: str = Form(...), db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        
        user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
        if not user: return {"status": "error", "message": "User not found"}

        # Kiểm tra trùng tên bot
        existing_bot = (await db.execute(
            select(Bot).where(Bot.user_id == user_id, Bot.name == name)
        )).scalars().first()
        if existing_bot:
            return {"status": "error", "message": f"You already have a bot named '{name}'. Please choose a different name."}

        cost = BOT_CREATION_COST
        if user.plan_type == "pro":
            cost = int(cost * 0.7) 
            
        if user.credits < cost:
            return {"status": "error", "message": f"Insufficient Credits! Need {cost} credits (You have {user.credits})."}
        
        user.credits -= cost

        new_bot = Bot(
            user_id=user_id,
            name=name,
            description=description,
            system_prompt=system_prompt
        )
        db.add(new_bot)
        
        await db.commit() 
        await db.refresh(new_bot)
        
        return {
            "status": "success", 
            "message": f"Bot created (Cost: {cost} credits)", 
            "bot_id": str(new_bot.id),
            "remaining_credits": user.credits
        }
    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/bots/{bot_id_str}")
async def get_bot_detail(bot_id_str: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        bot_uuid = uuid.UUID(bot_id_str)
        
        bot = (await db.execute(select(Bot).where(Bot.id == bot_uuid))).scalars().first()
        if not bot:
            return {"status": "error", "message": "Bot not found"}

        is_allowed = False
        
        if bot.user_id == user_id:
            is_allowed = True
        else:
            group_bot = (await db.execute(select(GroupBot).where(GroupBot.bot_id == bot_uuid))).scalars().first()
            if group_bot:
                mem = (await db.execute(select(GroupMember).where(
                    GroupMember.group_id == group_bot.group_id, 
                    GroupMember.user_id == user_id
                ))).scalars().first()
                if mem: is_allowed = True
        
        if not is_allowed:
            return {"status": "error", "message": "You do not have permission to access this Bot"}

        return {
            "status": "success", 
            "data": {
                "id": str(bot.id),
                "name": bot.name,
                "description": bot.description,
                "system_prompt": bot.system_prompt
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
@router.delete("/bots/{bot_id}")
async def delete_bot(request: Request, bot_id: str, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        bot_uuid = uuid.UUID(bot_id)
        
        result = await db.execute(select(Bot).where(Bot.id == bot_uuid))
        bot = result.scalars().first()
        
        if not bot: return {"status": "error", "message": "Bot not found"}
        
        if bot.user_id != user_id:
            return {"status": "error", "message": "You do not have permission to delete this Bot (Only Owner can delete)"}

        await db.delete(bot)
        await db.commit()
        return {"status": "success", "message": "Bot deleted successfully"}
    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/knowledge")
async def get_knowledge(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        
        result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.user_id == user_id).order_by(desc(KnowledgeBase.created_at)))
        files = result.scalars().all()
        data = []
        for f in files:
            data.append({
                "id": str(f.id),
                "filename": f.filename,
                "file_size": f.file_size,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "bot_id": str(f.bot_id) if f.bot_id else None
            })
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/knowledge/upload")
async def upload_knowledge(request: Request, file: UploadFile = File(...), bot_id: str = Form(None), db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        
        target_bot_uuid = None
        if bot_id and bot_id.lower() not in ['null', 'undefined', ''] and bot_id.strip() != '':
            try:
                target_bot_uuid = uuid.UUID(bot_id)
                
                bot = (await db.execute(select(Bot).where(Bot.id == target_bot_uuid))).scalars().first()
                if not bot: return {"status": "error", "message": "Bot does not exist"}
                
                is_owner = bot.user_id == user_id
                is_group_member = False

                if not is_owner:
                    group_bot = (await db.execute(select(GroupBot).where(GroupBot.bot_id == target_bot_uuid))).scalars().first()
                    if group_bot:
                        mem_check = (await db.execute(select(GroupMember).where(
                            GroupMember.group_id == group_bot.group_id, 
                            GroupMember.user_id == user_id
                        ))).scalars().first()
                        if mem_check: is_group_member = True
                
                if not is_owner and not is_group_member:
                    return {"status": "error", "message": "You do not have permission to upload documents for this Bot!"}

            except ValueError:
                pass 

        # Sanitize filename for Cloudinary public_id (remove special chars, spaces)
        import re
        sanitized_filename = re.sub(r'[^\w\-.]', '_', file.filename)
        
        upload_result = cloudinary.uploader.upload(file.file, resource_type="raw", public_id=sanitized_filename)
        
        file_path = upload_result.get("secure_url")
        
        file_size_mb = f"{round(file.size / 1024 / 1024, 2)} MB" if file.size else "Unknown"

        new_kb = KnowledgeBase(
            user_id=user_id,
            bot_id=target_bot_uuid, 
            filename=file.filename,
            file_path=file_path, 
            file_size=file_size_mb
        )
        db.add(new_kb)
        await db.commit()
        
        msg_type = f"for Bot" if target_bot_uuid else "General"
        return {"status": "success", "message": f"Uploaded {file.filename} ({msg_type})"}
        
    except Exception as e:
        return {"status": "error", "message": f"Upload error: {str(e)}"}

@router.delete("/knowledge/{kb_id}")
async def delete_knowledge(request: Request, kb_id: str, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        kb_uuid = uuid.UUID(kb_id)
        
        result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_uuid))
        kb = result.scalars().first()
        if not kb: return {"status": "error", "message": "File not found"}
        
        if kb.user_id != user_id:
            return {"status": "error", "message": "You do not have permission to delete this file (Only uploader can delete)"}

        if os.path.exists(kb.file_path):
            try: os.remove(kb.file_path)
            except Exception as e: print(f"Physical file deletion error: {e}")
            
        await db.delete(kb)
        await db.commit()
        return {"status": "success", "message": "File deleted successfully"}
    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}
@router.delete("/chat/history/{bot_id}")
async def clear_chat_history(bot_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        bot_uuid = uuid.UUID(bot_id)
        
        # Kiểm tra quyền sở hữu bot
        bot = (await db.execute(select(Bot).where(Bot.id == bot_uuid))).scalars().first()
        if not bot:
            return {"status": "error", "message": "Bot not found"}
        
        if bot.user_id != user_id:
            # Kiểm tra nếu user là thành viên group có bot này
            group_bot = (await db.execute(select(GroupBot).where(GroupBot.bot_id == bot_uuid))).scalars().first()
            if group_bot:
                mem = (await db.execute(select(GroupMember).where(
                    GroupMember.group_id == group_bot.group_id, 
                    GroupMember.user_id == user_id
                ))).scalars().first()
                if not mem:
                    return {"status": "error", "message": "You do not have permission to clear this bot's history"}
            else:
                return {"status": "error", "message": "You do not have permission to clear this bot's history"}
        
        # Xóa tất cả messages của bot này
        await db.execute(delete(Message).where(Message.bot_id == bot_uuid))
        await db.commit()
        
        return {"status": "success", "message": "Chat history cleared successfully"}
        
    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}
    
@router.get("/chat/history")
async def get_chat_history(request: Request, bot_id: str = None, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        
        # Get bot_id(s) that belong to the current user
        user_bots = (await db.execute(select(Bot.id).where(Bot.user_id == user_id))).scalars().all()
        
        stmt = select(Message).order_by(Message.created_at.asc())
        target_uuid = None
        if bot_id and bot_id.lower() not in ['null', 'undefined', '']:
            try:
                target_uuid = uuid.UUID(bot_id)
                # Only show messages from user's own bots
                if target_uuid not in user_bots:
                    return {"status": "success", "data": []}
                stmt = stmt.where(Message.bot_id == target_uuid)
            except:
                pass
        else:
            # Only show messages from user's bots or no bot
            if user_bots:
                stmt = stmt.where(or_(Message.bot_id.is_(None), Message.bot_id.in_(user_bots)))
            else:
                stmt = stmt.where(Message.bot_id.is_(None))
            
        result = await db.execute(stmt)
        msgs = result.scalars().all()
        
        data = []
        for m in msgs:
            data.append({
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat()
            })
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class ChatRequest(BaseModel):
    message: str
    bot_id: str | None = None
    model: str | None = "gemini-2.5-flash" 

async def retrieve_knowledge(db: AsyncSession, bot_id: uuid.UUID | None, query: str):
    stmt = select(KnowledgeBase).order_by(desc(KnowledgeBase.created_at)).limit(3)
    if bot_id:
        stmt = stmt.where((KnowledgeBase.bot_id == bot_id) | (KnowledgeBase.bot_id.is_(None)))
    else:
        stmt = stmt.where(KnowledgeBase.bot_id.is_(None))
    
    result = await db.execute(stmt)
    files = result.scalars().all()

    context = ""
    files_read_count = 0
    
    for f in files:
        file_content = ""
        file_ext = os.path.splitext(f.filename)[1].lower()
        mime_type, _ = mimetypes.guess_type(f.filename)
        
        file_url = f.file_path 

        try:
            response = requests.get(file_url, timeout=10)
            if response.status_code != 200: continue
            
            file_bytes = response.content
            file_stream = io.BytesIO(file_bytes)

            if file_ext == ".pdf":
                pdf_text = ""
                is_scanned_or_failed = False
                
                try:
                    reader = pypdf.PdfReader(file_stream) 
                    for i, page in enumerate(reader.pages):
                        if i >= 10: break 
                        extracted = page.extract_text()
                        if extracted: pdf_text += extracted + "\n"
                    
                    if len(pdf_text.strip()) < 50:
                        is_scanned_or_failed = True
                except Exception as e:
                    print(f"PyPDF Error: {e}")
                    is_scanned_or_failed = True

                if is_scanned_or_failed:
                    try:
                        print("PDF appears scanned or empty. Switching to Gemini Vision...")
                        
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                            tmp.write(file_bytes)
                            tmp_path = tmp.name

                        uploaded_file = genai.upload_file(tmp_path, mime_type="application/pdf")
                        
                        vision_model = genai.GenerativeModel("gemini-2.5-flash") 
                        vision_response = vision_model.generate_content(
                            ["Please extract all text content from this PDF file verbatim. Ignore layout, just text.", uploaded_file]
                        )
                        pdf_text = f"[AI Extracted from Scan]:\n{vision_response.text}"
                        
                        os.remove(tmp_path)
                        
                    except Exception as e_ai:
                        pdf_text = f"[Error reading PDF via AI: {str(e_ai)}]"
                        if len(pdf_text) < 50 and not is_scanned_or_failed: 
                            pass 

                file_content = pdf_text

            elif file_ext == ".docx":
                try:
                    doc = Document(file_stream)
                    for para in doc.paragraphs:
                        file_content += para.text + "\n"
                except:
                    file_content = "[Error reading DOCX]"

            elif file_ext in ['.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.csv', '.sql']:
                file_content = response.content.decode('utf-8', errors='ignore')

            elif file_ext in ['.jpg', '.jpeg', '.png', '.webp', '.heic']:
                real_mime = mime_type if mime_type else "image/jpeg"
                file_content = f"[Image Content]:\n{ai_extract_content(file_bytes, real_mime)}"

            else:
                file_content = f"[Unsupported file format: {file_ext}]"
                
            files_read_count += 1

        except Exception as e:
            file_content = f"[Error downloading/processing file: {str(e)}]"

        if len(file_content) > 4000:
            file_content = file_content[:4000] + "... [Content truncated]"

        context += f"\n--- DOCUMENT: {f.filename} ---\n{file_content}\n--- END DOCUMENT ---\n"

    if context:
        context += f"\n[SYSTEM NOTE: Loaded {files_read_count} recent documents via RAG.]"

    return context if context else "No knowledge base documents found."

@router.post("/chat/message")
async def chat_message(request: Request, body: ChatRequest, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        user = await check_and_update_quota(db, user_id) 
    except HTTPException as e:
        return {"status": "error", "message": e.detail}

    print(f"User {user.email} is chatting. Daily usage: {user.daily_requests_count}")
    user_message = body.message
    bot_id_str = body.bot_id
    selected_model = body.model if body.model else "gemini-2.5-flash"
    
    system_prompt = """
        You are AI-CaaS, a highly advanced and versatile AI assistant designed to be helpful, harmless, and honest. Your capabilities span across creative writing, technical problem-solving, data analysis, and general knowledge.

        **YOUR CORE INSTRUCTIONS:**

        1.  **Adaptability (Role & Tone):**
            * Analyze the user's request to determine the appropriate persona.
            * **Creative Tasks:** If asked to write (emails, stories, poems), use engaging, natural, and varied language. Be imaginative.
            * **Academic/Logic:** If asked to explain or solve math/logic problems, think step-by-step (Chain of Thought) and explain your reasoning clearly.
            * **Casual Chat:** Be friendly, empathetic, and conversational.
            * **Technical:** Be precise and provide production-ready solutions.

        2.  **Response Structure:**
            * Always use **Markdown** to format your answers beautifully (use Bold for emphasis, Lists for clarity, and Headers for sections).
            * Keep answers concise but comprehensive. Do not ramble, but do not skip important details.

        3.  **Knowledge Domain:**
            * You are an expert in sciences, history, literature, and arts, not just technology.
            * If the user asks about a specific topic (e.g., "History of Rome"), provide a well-structured summary.

        4.  **Coding (When applicable):**
            * Only when explicitly asked for code, provide clean, commented, and efficient code snippets. Explain how they work.

        **GOAL:** Provide the best possible assistance to the user, regardless of the topic.
    """
    bot_name = "AI Assistant"
    target_bot_uuid = None

    try:
        if bot_id_str and bot_id_str.lower() not in ['null', 'undefined', '']:
            try:
                target_bot_uuid = uuid.UUID(bot_id_str)
                bot_result = await db.execute(select(Bot).where(Bot.id == target_bot_uuid))
                target_bot = bot_result.scalars().first()
                
                if target_bot:
                    allowed = (target_bot.user_id == user_id)
                    
                    if not allowed:
                        group_bot = (await db.execute(select(GroupBot).where(GroupBot.bot_id == target_bot_uuid))).scalars().first()
                        if group_bot:
                            mem = (await db.execute(select(GroupMember).where(
                                GroupMember.group_id == group_bot.group_id, 
                                GroupMember.user_id == user_id
                            ))).scalars().first()
                            if mem: allowed = True
                    
                    if not allowed:
                        return {"status": "error", "message": "You do not have permission to chat with this Bot (Not in group)."}

                    bot_name = target_bot.name
                    if target_bot.system_prompt:
                        system_prompt = target_bot.system_prompt
            except ValueError:
                pass 

        user_msg_db = Message(bot_id=target_bot_uuid, role="user", content=user_message)
        db.add(user_msg_db)
        await db.commit()

        context = await retrieve_knowledge(db, target_bot_uuid, user_message)

        final_prompt = (
            f"SYSTEM INSTRUCTIONS: {system_prompt}\n"
            f"CONTEXT INFO (Files): {context}\n"
            f"--- \n"
            f"USER: {user_message}\n"
            f"AI:"
        )

        print(f"---------> ĐANG DÙNG MODEL: {selected_model} <---------", flush=True)

        if any(m in selected_model.lower() for m in ["llama", "qwen", "mixtral", "gemma", "groq", "moonshot", "openai", "allam"]):
            if not groq_client:
                 return {"status": "error", "message": "Server Groq Key not configured"}
            
            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": f"{system_prompt}\nCONTEXT FROM FILES: {context}"
                    },
                    {
                        "role": "user",
                        "content": user_message
                    }
                ],
                model=selected_model,
                temperature=0.7,
                max_tokens=4096,
            )
            ai_text = chat_completion.choices[0].message.content
        else:
            if not GEMINI_API_KEY:
                return {"status": "error", "message": "Server Gemini Key not configured"}

            try:
                model = genai.GenerativeModel(selected_model)
                response = model.generate_content(final_prompt)
                ai_text = response.text
            except Exception as e:
                print(f"Error with model {selected_model}: {e}. Switching to flash.")
                fallback_model = genai.GenerativeModel('gemini-2.5-flash')
                response = fallback_model.generate_content(final_prompt)
                ai_text = f"[Fallback 2.5] {response.text}"

        ai_msg_db = Message(bot_id=target_bot_uuid, role="ai", content=ai_text)
        db.add(ai_msg_db)
        await db.commit()

        return {"status": "success", "response": ai_text, "bot_name": bot_name}

    except Exception as e:
        print(f"AI API Error: {e}")
        return {"status": "error", "message": f"AI Error: {str(e)}"}

@router.post("/groups/create")
async def create_group_direct(request: Request, name: str = Form(...), description: str = Form(None), bot_id: str = Form(...), db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        bid = uuid.UUID(bot_id)

        bot = (await db.execute(select(Bot).where(Bot.id == bid, Bot.user_id == user_id))).scalars().first()
        if not bot: return {"status": "error", "message": "Invalid Bot or it does not belong to you"}

        new_group = Group(name=name, description=description, owner_id=user_id)
        db.add(new_group)
        await db.commit()
        await db.refresh(new_group)
        
        db.add(GroupMember(group_id=new_group.id, user_id=user_id, role="OWNER"))
        db.add(GroupBot(group_id=new_group.id, bot_id=bid))
        
        await db.commit()
        return {"status": "success", "message": "Group created and Bot shared!"}
    except Exception as e: 
        await db.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/groups")
async def get_my_groups(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        stmt = select(Group).join(GroupMember, Group.id == GroupMember.group_id).where(GroupMember.user_id == user_id)
        groups = (await db.execute(stmt)).scalars().all()
        
        data = []
        for g in groups:
            count = len((await db.execute(select(GroupMember).where(GroupMember.group_id == g.id))).scalars().all())
            bot = (await db.execute(select(Bot).join(GroupBot, Bot.id == GroupBot.bot_id).where(GroupBot.group_id == g.id))).scalars().first()
            data.append({
                "id": str(g.id), "name": g.name, "description": g.description, 
                "is_owner": (g.owner_id == user_id), "member_count": count, 
                "bot_name": bot.name if bot else "None",
                "bot_id": str(bot.id) if bot else None
            })
        return {"status": "success", "data": data}
    except Exception as e: return {"status": "error", "message": str(e)}

@router.get("/groups/{group_id}/knowledge")
async def get_group_knowledge(group_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        gid = uuid.UUID(group_id)
        
        mem = (await db.execute(select(GroupMember).where(GroupMember.group_id == gid, GroupMember.user_id == user_id))).scalars().first()
        if not mem: return {"status": "error", "message": "You are not a group member"}
        
        gb = (await db.execute(select(GroupBot).where(GroupBot.group_id == gid))).scalars().first()
        if not gb: return {"status": "success", "data": []}

        stmt = select(KnowledgeBase, User.full_name, User.email)\
            .join(User, KnowledgeBase.user_id == User.id)\
            .where(KnowledgeBase.bot_id == gb.bot_id)\
            .order_by(desc(KnowledgeBase.created_at))
            
        results = (await db.execute(stmt)).all()
        
        data = []
        for kb, fname, email in results:
            data.append({
                "id": str(kb.id),
                "filename": kb.filename,
                "size": kb.file_size,
                "uploaded_by": fname or email,
                "is_mine": (kb.user_id == user_id), 
                "date": kb.created_at.strftime("%Y-%m-%d %H:%M")
            })
            
        return {"status": "success", "data": data}
    except Exception as e: return {"status": "error", "message": str(e)}

@router.post("/groups/add-member")
async def add_member_direct(request: Request, group_id: str = Form(...), email: str = Form(...), db: AsyncSession = Depends(get_db)):
    try:
        uid = await get_current_user_id(request, db)
        gid = uuid.UUID(group_id)
        await check_is_owner(db, gid, uid)
        
        target = (await db.execute(select(User).where(User.email == email))).scalars().first()
        if not target: return {"status": "error", "message": "Email does not exist"}
        
        exists = (await db.execute(select(GroupMember).where(GroupMember.group_id == gid, GroupMember.user_id == target.id))).scalars().first()
        if exists: return {"status": "error", "message": "User already in group"}

        db.add(GroupMember(group_id=gid, user_id=target.id, role="MEMBER"))
        await db.commit()
        return {"status": "success", "message": f"Added {email} to group"}
    except Exception as e: return {"status": "error", "message": str(e)}

@router.put("/groups/leave/{group_id}")
async def leave_group(group_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        gid = uuid.UUID(group_id)

        group = (await db.execute(select(Group).where(Group.id == gid))).scalars().first()
        if not group:
            return {"status": "error", "message": "Group does not exist"}

        if group.owner_id == user_id:
            return {
                "status": "error", 
                "message": "You are the Owner. You cannot leave the group. Please delete the group if you want to disband it."
            }

        member_record = (await db.execute(select(GroupMember).where(
            GroupMember.group_id == gid, 
            GroupMember.user_id == user_id
        ))).scalars().first()

        if not member_record:
            return {"status": "error", "message": "You are not a member of this group"}

        group_bot = (await db.execute(select(GroupBot).where(GroupBot.group_id == gid))).scalars().first()
        if group_bot:
            files_to_delete = (await db.execute(select(KnowledgeBase).where(
                KnowledgeBase.user_id == user_id,
                KnowledgeBase.bot_id == group_bot.bot_id
            ))).scalars().all()
            
            for f in files_to_delete:
                if os.path.exists(f.file_path):
                    try: os.remove(f.file_path)
                    except: pass
                await db.delete(f)

        await db.delete(member_record)
        await db.commit()

        return {"status": "success", "message": "You have left the group successfully"}

    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}
    
@router.post("/groups/remove-member")
async def remove_member(request: Request, group_id: str = Form(...), email: str = Form(...), db: AsyncSession = Depends(get_db)):
    try:
        uid = await get_current_user_id(request, db)
        gid = uuid.UUID(group_id)
        
        await check_is_owner(db, gid, uid)
        
        target = (await db.execute(select(User).where(User.email == email))).scalars().first()
        if not target: return {"status": "error", "message": "Email does not exist"}
        if target.id == uid: return {"status": "error", "message": "Cannot remove yourself"}

        group_bot = (await db.execute(select(GroupBot).where(GroupBot.group_id == gid))).scalars().first()
        
        if group_bot:
            files_to_delete = (await db.execute(select(KnowledgeBase).where(
                KnowledgeBase.user_id == target.id,  
                KnowledgeBase.bot_id == group_bot.bot_id
            ))).scalars().all()
            
            for f in files_to_delete:
                if os.path.exists(f.file_path): 
                    try: os.remove(f.file_path)
                    except: pass
                await db.delete(f)

        await db.execute(delete(GroupMember).where(GroupMember.group_id == gid, GroupMember.user_id == target.id))
        await db.commit()
        return {"status": "success", "message": f"Removed {email} and their data from the group."}
    except Exception as e:
        await db.rollback() 
        return {"status": "error", "message": str(e)}

@router.get("/groups/{group_id}/details")
async def get_group_details(group_id: str, db: AsyncSession = Depends(get_db)):
    try:
        gid = uuid.UUID(group_id)
        stmt = select(User, GroupMember.role).join(GroupMember, User.id==GroupMember.user_id).where(GroupMember.group_id==gid)
        results = (await db.execute(stmt)).all()
        members = [{"email": u.email, "full_name": u.full_name, "role": role} for u, role in results]
        
        bot = (await db.execute(select(Bot).join(GroupBot, Bot.id==GroupBot.bot_id).where(GroupBot.group_id==gid))).scalars().first()
        bots = [{"id": str(bot.id), "name": bot.name}] if bot else []
        return {"status": "success", "data": {"members": members, "bots": bots}}
    except Exception as e: return {"status": "error", "message": str(e)}

@router.delete("/groups/{group_id}")
async def delete_group(request: Request, group_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uid = await get_current_user_id(request, db)
        gid = uuid.UUID(group_id)
        await check_is_owner(db, gid, uid)
        
        group_bot = (await db.execute(select(GroupBot).where(GroupBot.group_id == gid))).scalars().first()
        
        if group_bot:
            stmt_files = select(KnowledgeBase).where(
                KnowledgeBase.bot_id == group_bot.bot_id,
                KnowledgeBase.user_id != uid 
            )
            files = (await db.execute(stmt_files)).scalars().all()
            for f in files:
                if os.path.exists(f.file_path):
                    try: os.remove(f.file_path)
                    except: pass
                await db.delete(f)

        group = (await db.execute(select(Group).where(Group.id == gid))).scalars().first()
        if group:
            await db.delete(group)
            await db.commit()
            return {"status": "success", "message": "Group deleted"}
        return {"status": "error", "message": "Group does not exist"}
    except Exception as e: return {"status": "error", "message": str(e)}

@router.get("/referrals")
async def get_referrals(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        uid = await get_current_user_id(request, db)
        refs = (await db.execute(select(Referral).where(Referral.referrer_id == uid).order_by(desc(Referral.created_at)))).scalars().all()
        
        data = [{"email": r.referred_email, "status": r.status, "date": r.created_at.strftime("%Y-%m-%d")} for r in refs]
        return {"status": "success", "data": data, "count": len(data)}
    except Exception as e: return {"status": "error", "message": str(e)}

@router.post("/referrals/create")
async def create_referral(request: Request, email: str = Form(...), db: AsyncSession = Depends(get_db)):
    try:
        uid = await get_current_user_id(request, db)
        
        exist = (await db.execute(select(Referral).where(Referral.referrer_id == uid, Referral.referred_email == email))).scalars().first()
        if exist: return {"status": "error", "message": "This email has already been referred"}
        
        db.add(Referral(referrer_id=uid, referred_email=email))
        await db.commit()
        return {"status": "success", "message": "Referral saved"}
    except Exception as e: return {"status": "error", "message": str(e)}

@router.get("/subscription")
async def get_subscription(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
        
        limit = PLAN_LIMITS.get(user.plan_type, 10)
        expires_str = user.pro_expires_at.strftime("%d/%m/%Y") if user.pro_expires_at else None
        return {
            "status": "success",
            "data": {
                "plan": user.plan_type, 
                "usage": user.daily_requests_count,
                "limit": limit,
                "percent": min(int((user.daily_requests_count / limit) * 100), 100),
                "expires_at": expires_str,
                "credits": user.credits or 0,
                "user_name": user.full_name or "User",
                "user_email": user.email
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/subscription/upgrade")
async def upgrade_plan(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
        
        user.plan_type = "pro"
        
        now = datetime.now(timezone.utc)
        expired_date = now + timedelta(days=30)
        user.pro_expires_at = expired_date
        
        await db.commit()
        
        date_str = expired_date.strftime("%d/%m/%Y")
        
        try:
            send_pro_success_email(user.email, user.full_name or "User", date_str)
        except Exception as e_mail:
            print(f"Upgrade email error: {e_mail}")
            
        return {"status": "success", "message": f"Pro upgrade successful! Valid until {date_str}"}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/subscription/buy-credits")
async def buy_credits(request: Request, amount: int = Form(...), db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
        
        if not user:
            return {"status": "error", "message": "User not found"}

        if amount <= 0:
            return {"status": "error", "message": "Invalid amount"}

        PACKAGES_PRICE = {
            100: 10000,   
            500: 45000,   
            2000: 160000  
        }

        base_cost = PACKAGES_PRICE.get(amount, amount * 100)
        
        final_cost = base_cost

        if user.plan_type == "pro":
            final_cost = int(base_cost * 0.7)
            
        user.credits += amount
        await db.commit()

        try:
            send_credit_success_email(user.email, user.full_name or "User", amount, final_cost)
        except Exception as ex:
            print(f"Credit email error: {ex}")
        
        return {
            "status": "success", 
            "message": f"Successfully loaded {amount} Credits!",
            "new_balance": user.credits,
            "cost_paid": final_cost 
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
@router.get("/tickets")
async def get_tickets(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        stmt = select(Ticket).where(Ticket.user_id == user_id).order_by(desc(Ticket.created_at))
        tickets = (await db.execute(stmt)).scalars().all()
        
        data = [{"id": str(t.id), "subject": t.subject, "status": t.status, "date": t.created_at.strftime("%Y-%m-%d")} for t in tickets]
        return {"status": "success", "data": data}
    except Exception as e: return {"status": "error", "message": str(e)}

@router.get("/tickets/{ticket_id}")
async def get_ticket_detail(ticket_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_current_user_id(request, db)
        tid = uuid.UUID(ticket_id)
        
        ticket = (await db.execute(select(Ticket).where(Ticket.id == tid, Ticket.user_id == user_id))).scalars().first()
        if not ticket: return {"status": "error", "message": "Ticket not found"}
        
        msgs = (await db.execute(select(TicketMessage).where(TicketMessage.ticket_id == tid).order_by(TicketMessage.created_at))).scalars().all()
        
        msg_data = [{"role": m.sender_role, "content": m.content, "date": m.created_at.strftime("%H:%M %d/%m")} for m in msgs]
        return {"status": "success", "data": {"subject": ticket.subject, "status": ticket.status, "messages": msg_data}}
    except Exception as e: return {"status": "error", "message": str(e)}

@router.post("/tickets/create")
async def create_ticket(
    request: Request, 
    background_tasks: BackgroundTasks, 
    subject: str = Form(...), 
    description: str = Form(...), 
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id = await get_current_user_id(request, db)
        
        new_ticket = Ticket(user_id=user_id, subject=subject, status="PENDING")
        db.add(new_ticket)
        await db.flush() 
        
        db.add(TicketMessage(ticket_id=new_ticket.id, sender_role="user", content=description))
        
        await db.commit() 
        
        background_tasks.add_task(process_ticket_ai_reply, new_ticket.id, description, subject)
        
        return {"status": "success", "message": "Ticket created. AI is processing..."}
    except Exception as e: 
        return {"status": "error", "message": str(e)}

@router.post("/tickets/{ticket_id}/reply")
async def reply_ticket(
    ticket_id: str, 
    request: Request, 
    background_tasks: BackgroundTasks, 
    message: str = Form(...), 
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id = await get_current_user_id(request, db)
        tid = uuid.UUID(ticket_id)
        
        ticket = (await db.execute(select(Ticket).where(Ticket.id == tid, Ticket.user_id == user_id))).scalars().first()
        if not ticket: return {"status": "error", "message": "Ticket not found"}
        
        db.add(TicketMessage(ticket_id=tid, sender_role="user", content=message))
        
        ticket.status = "PENDING" 
        
        await db.commit()
        
        background_tasks.add_task(process_ticket_ai_reply, tid, message, ticket.subject)
        
        return {"status": "success", "message": "Reply sent"}
    except Exception as e: 
        return {"status": "error", "message": str(e)}

@router.post("/chat/public")
async def public_chat(request: Request, body: PublicChatRequest, db: AsyncSession = Depends(get_db)):
    try:
        bot_uuid = uuid.UUID(body.bot_id)
        bot = (await db.execute(select(Bot).where(Bot.id == bot_uuid))).scalars().first()
        if not bot:
            return {"status": "error", "message": "Bot not found"}

        context = await retrieve_knowledge(db, bot_uuid, body.message)

        system_instructions = bot.system_prompt or "You are a helpful assistant."
        final_prompt = f"""
        System: {system_instructions}
        Context: {context}
        User: {body.message}
        """
        
        if not GEMINI_API_KEY:
            return {"status": "error", "message": "Server API Key missing"}
            
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        response = model.generate_content(final_prompt)
        
        return {"status": "success", "response": response.text}

    except Exception as e:
        return {"status": "error", "message": str(e)}