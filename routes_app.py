from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from connect_database import get_db
from models import Bot, Referral, KnowledgeBase, User,  Session
import shutil
import os
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import Request
from routes_auth import send_pro_success_email, send_credit_success_email

router = APIRouter(prefix="/api", tags=["App"])
PLAN_LIMITS = {
    "free": 10,   
    "pro": 1000   
}
# --- HÀM LẤY USER MẶC ĐỊNH ---
async def get_current_user_id(db: AsyncSession):
    result = await db.execute(select(User).limit(1))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=400, detail="Chưa có tài khoản nào. Vui lòng Đăng ký trước!")
    return user.id

# ===========================
# 1. QUẢN LÝ BOT
# ===========================



@router.get("/bots")
async def get_bots(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Bot).order_by(desc(Bot.created_at)))
        bots = result.scalars().all()
        
        # [QUAN TRỌNG] Chuyển đổi dữ liệu sang JSON thủ công để tránh lỗi hiển thị
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
async def create_bot(
    name: str = Form(...),
    description: str = Form(None),
    system_prompt: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id = await get_current_user_id(db)
        new_bot = Bot(
            user_id=user_id,
            name=name,
            description=description,
            system_prompt=system_prompt
        )
        db.add(new_bot)
        await db.commit()
        await db.refresh(new_bot)
        return {"status": "success", "message": "Bot created", "bot_id": str(new_bot.id)}
    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}

@router.delete("/bots/{bot_id}")
async def delete_bot(bot_id: str, db: AsyncSession = Depends(get_db)):
    try:
        bot_uuid = uuid.UUID(bot_id)
        result = await db.execute(select(Bot).where(Bot.id == bot_uuid))
        bot = result.scalars().first()
        
        if not bot:
            return {"status": "error", "message": "Bot not found"}

        await db.delete(bot)
        await db.commit()
        return {"status": "success", "message": "Bot deleted successfully"}
    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}

# ===========================
# 2. QUẢN LÝ KNOWLEDGE
# ===========================

@router.get("/knowledge")
async def get_knowledge(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(KnowledgeBase).order_by(desc(KnowledgeBase.created_at)))
        files = result.scalars().all()
        
        # [QUAN TRỌNG] Chuyển đổi dữ liệu file sang JSON
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
async def upload_knowledge(
    file: UploadFile = File(...),
    bot_id: str = Form(None),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id = await get_current_user_id(db)
        upload_dir = "uploads"
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
            
        file_ext = os.path.splitext(file.filename)[1]
        new_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(upload_dir, new_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size_mb = f"{round(file.size / 1024 / 1024, 2)} MB" if file.size else "Unknown"
        
        # Xử lý Bot ID
        target_bot_uuid = None
        if bot_id and bot_id.lower() not in ['null', 'undefined', ''] and bot_id.strip() != '':
            try:
                target_bot_uuid = uuid.UUID(bot_id)
            except ValueError:
                pass 

        new_kb = KnowledgeBase(
            user_id=user_id,
            bot_id=target_bot_uuid, 
            filename=file.filename,
            file_path=file_path,
            file_size=file_size_mb
        )
        
        db.add(new_kb)
        await db.commit()
        
        msg_type = f"cho Bot" if target_bot_uuid else "General (Chung)"
        return {"status": "success", "message": f"Đã upload {file.filename} ({msg_type})"}
    except Exception as e:
        return {"status": "error", "message": f"Lỗi upload: {str(e)}"}

@router.delete("/knowledge/{kb_id}")
async def delete_knowledge(kb_id: str, db: AsyncSession = Depends(get_db)):
    try:
        kb_uuid = uuid.UUID(kb_id)
        result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_uuid))
        kb = result.scalars().first()
        
        if not kb:
            return {"status": "error", "message": "File not found"}

        if os.path.exists(kb.file_path):
            try:
                os.remove(kb.file_path)
            except Exception as e:
                print(f"Không thể xóa file vật lý: {e}")

        await db.delete(kb)
        await db.commit()
        
        return {"status": "success", "message": "File deleted successfully"}
    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}
    
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
                "expires_at": expires_str
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