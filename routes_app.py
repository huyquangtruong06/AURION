from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete
from connect_database import get_db
from models import Bot, Referral, KnowledgeBase, User,  Group, GroupMember, GroupBot, Session
import shutil
import os
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import Request
import bcrypt
from passlib.hash import bcrypt
from routes_auth import send_pro_success_email, send_credit_success_email

router = APIRouter(prefix="/api", tags=["App"])
PLAN_LIMITS = {
    "free": 10,   
    "pro": 1000   
}
BOT_CREATION_COST = 50 

# --- HÀM LẤY USER MẶC ĐỊNH ---
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

# ===========================
# 1. QUẢN LÝ BOT
# ===========================

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
                "is_owner": (g.owner_id == user_id), "member_count": count, "bot_name": bot.name if bot else "None"
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
