from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func # <--- [ADDED] func để đếm số lượng referral
from models import User, Session, OTP, Referral # <--- [ADDED] Referral
from connect_database import get_db
from passlib.hash import bcrypt 
from datetime import datetime, timedelta, timezone
import secrets
import uuid
import re
import random
import os
from dotenv import load_dotenv
load_dotenv()
# --- THƯ VIỆN GỬI MAIL ---
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr, make_msgid, formatdate

raw_token = secrets.token_hex(32)
token_hash = bcrypt.hash(raw_token)
expires = datetime.now(timezone.utc) + timedelta(days=7)
router = APIRouter(prefix="/api", tags=["Authentication"])

# ========================================================
# GMAIL CONFIGURATION (PLEASE ENTER YOUR INFO HERE)
# ========================================================
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
# --- EDIT THESE 2 LINES ---
SENDER_EMAIL = os.getenv("SENDER_EMAIL")  # Enter your email
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")  # Enter your 16-char app password
# ========================================================

# Function to send OTP Email
def send_email_otp(to_email, otp_code):
    print(f"🚀 Sending email to: {to_email}...")
    
    if not SENDER_EMAIL or "email_cua_ban" in SENDER_EMAIL:
        return False

    try:
        # Create container for Text and HTML
        msg = MIMEMultipart('alternative')
        
        # [IMPORTANT] Add Headers for credibility
        msg['From'] = formataddr(("AI-CaaS Security", SENDER_EMAIL))
        msg['To'] = to_email
        msg['Subject'] = f"Verification Code: {otp_code} - AI-CaaS"
        msg['Message-ID'] = make_msgid() # Create unique ID to avoid spam detection
        msg['Date'] = formatdate(localtime=True) 

        text_body = f"Your OTP code is: {otp_code}. Code expires in 10 minutes."
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
            <div style="max-w-md mx-auto background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0;">
                <h2 style="color: #4F46E5; text-align: center; margin-top: 0;">AI-CaaS Security</h2>
                <p style="color: #333;">Hello,</p>
                <p>Your password reset verification code (OTP) is:</p>
                <div style="background-color: #f0f7ff; border: 2px dashed #4F46E5; padding: 15px; margin: 20px 0; text-align: center; border-radius: 8px;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4F46E5;">{otp_code}</span>
                </div>
                <p style="color: #777; font-size: 14px; text-align: center;">Expires in <strong>10 minutes</strong>.</p>
            </div>
          </body>
        </html>
        """

        # Attach both versions
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"❌ ERROR SENDING MAIL: {e}")
        return False

# --- Helper to authenticate User from Token ---
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if ":" in token:
        session_id_str, raw_token = token.split(":", 1)
        try:
            session_id = uuid.UUID(session_id_str)
            query = await db.execute(select(Session).where(Session.id == session_id))
            session = query.scalar()
            
            if session and bcrypt.verify(raw_token, session.refresh_token_hash):
                user_res = await db.execute(select(User).where(User.id == session.user_id))
                user = user_res.scalars().first()
                if user: return user
        except:
            pass
    raise HTTPException(status_code=401, detail="Invalid token")

# ============================
# AUTHENTICATION API (Updated with Referral Logic)
# ============================
@router.post("/register")
async def register(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        email = data.get("email")
        password = data.get("password")
        full_name = data.get("full_name")
        referral_code = data.get("referral_code") # <--- Lấy mã giới thiệu từ Frontend

        # 1. Validate Email & Exist Check
        email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if not email or not re.match(email_regex, email):
            return {"status": "error", "message": "Invalid email format"}
        query = await db.execute(select(User).where(User.email == email))
        if query.scalar():
            return {"status": "error", "message": "Email already exists"}

        # 2. Tạo User mới
        hashed_pw = bcrypt.hash(password)
        new_user = User(email=email, password_hash=hashed_pw, full_name=full_name, credits=100)
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user) # Lấy ID user mới

        # 3. --- [LOGIC REFERRAL MỚI - GIỮ CODE CŨ VÀ THÊM LOGIC] ---
        if referral_code:
            try:
                referrer_uuid = uuid.UUID(referral_code)
                # Kiểm tra người giới thiệu có tồn tại không
                referrer = (await db.execute(select(User).where(User.id == referrer_uuid))).scalars().first()
                
                if referrer:
                    # Tạo bản ghi Referral thành công
                    new_ref = Referral(
                        referrer_id=referrer.id,
                        referred_email=email,
                        status="SUCCESS" # Đánh dấu thành công ngay khi đăng ký
                    )
                    db.add(new_ref)
                    
                    # Cần flush để new_ref được tính vào count bên dưới (trong cùng transaction)
                    await db.flush()

                    # --- TÍNH THƯỞNG (REWARD LOGIC) ---
                    # Đếm số người đã mời thành công
                    count_stmt = select(func.count(Referral.id)).where(
                        Referral.referrer_id == referrer.id, 
                        Referral.status == "SUCCESS"
                    )
                    count = (await db.execute(count_stmt)).scalar() or 0
                    
                    print(f"User {referrer.email} invited {count} people.")

                    # CỘNG THƯỞNG DỰA TRÊN MỐC (3 người = 1 tháng, 7 người = 1 năm)
                    reward_days = 0
                    if count == 3:
                        reward_days = 30 # Tặng 1 tháng
                    elif count == 7:
                        reward_days = 365 # Tặng 1 năm
                    
                    if reward_days > 0:
                        # Logic cộng ngày Pro
                        now = datetime.now(timezone.utc)
                        
                        # Nếu đang Pro và chưa hết hạn -> Cộng nối tiếp
                        if referrer.plan_type == 'pro' and referrer.pro_expires_at and referrer.pro_expires_at > now:
                            referrer.pro_expires_at += timedelta(days=reward_days)
                        else:
                            # Nếu đang Free hoặc Pro đã hết hạn -> Kích hoạt mới từ hôm nay
                            referrer.plan_type = 'pro'
                            referrer.pro_expires_at = now + timedelta(days=reward_days)
            except Exception as e_ref:
                print(f"Referral Error: {e_ref}") # Log lỗi nhưng không chặn đăng ký
                pass
        # -------------------------------

        await db.commit()

        try:
            send_welcome_email(email, full_name)
        except Exception as e_mail:
            print(f"Error sending mail: {e_mail}")
            
        return {"status": "success", "redirect": "/frontend/chat.html"}
    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}

@router.post("/login")
async def login(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        email = data.get("email")
        password = data.get("password")
        query = await db.execute(select(User).where(User.email == email))
        user = query.scalar()
        if not user or not bcrypt.verify(password, user.password_hash):
            return {"status": "error", "message": "Incorrect email or password"}
        raw_token = secrets.token_hex(32)
        token_hash = bcrypt.hash(raw_token)
        expires = datetime.utcnow() + timedelta(days=7)
        client_ip = str(request.client.host) if request.client else "unknown"
        user_agent = request.headers.get("user-agent")
        session = Session(user_id=user.id, refresh_token_hash=token_hash, expires_at=expires, ip_address=client_ip, user_agent=user_agent)
        db.add(session)
        await db.commit()
        await db.refresh(session)
        combined_token = f"{session.id}:{raw_token}"
        return {"status": "success", "redirect": "/frontend/chat.html", "session_token": combined_token}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/logout")
async def logout(data: dict, db: AsyncSession = Depends(get_db)):
    try:
        combined_token = data.get("session_token")
        if not combined_token or ":" not in combined_token:
            return {"status": "error", "message": "Invalid token"}
        session_id_str, raw_token = combined_token.split(":", 1)
        session_id = uuid.UUID(session_id_str)
        query = await db.execute(select(Session).where(Session.id == session_id))
        session_obj = query.scalar()
        if session_obj and bcrypt.verify(raw_token, session_obj.refresh_token_hash):
            await db.delete(session_obj)
            await db.commit()
            return {"status": "success", "message": "Logged out"}
        return {"status": "error", "message": "Session not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ============================
# [NEW] PROFILE & PASSWORD API
# ============================

@router.get("/profile")
async def get_profile(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user = await get_current_user(request, db)
        return {
            "status": "success",
            "data": {
                "id": str(user.id),  # <--- [ADDED] Trả về ID để frontend tạo link giới thiệu
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url or "https://ui-avatars.com/api/?name=" + (user.full_name or "User"),
                # --- [ADDED FOR CREDITS] ---
                "plan": user.plan_type, 
                "credits": user.credits
                # ----------------------------------------
            }
        }
    except HTTPException:
        return {"status": "error", "message": "Unauthorized"}

@router.post("/profile/update")
async def update_profile(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        user = await get_current_user(request, db)
        if "full_name" in data:
            user.full_name = data["full_name"]
        await db.commit()
        return {"status": "success", "message": "Profile updated"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/profile/change-password")
async def change_password(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    try:
        user = await get_current_user(request, db)
        old_pass = data.get("old_password")
        new_pass = data.get("new_password")
        
        if not bcrypt.verify(old_pass, user.password_hash):
            return {"status": "error", "message": "Incorrect old password"}
        
        user.password_hash = bcrypt.hash(new_pass)
        await db.commit()
        return {"status": "success", "message": "Password changed successfully!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ============================
# [NEW] FORGOT PASSWORD (OTP)
# ============================

# 1. Send OTP (Step 1 - Send Actual Mail)
@router.post("/forgot-password")
async def forgot_password(data: dict, db: AsyncSession = Depends(get_db)):
    email = data.get("email")
    query = await db.execute(select(User).where(User.email == email))
    user = query.scalar()
    
    # [FIXED] If user not found -> Return error immediately
    if not user:
        return {"status": "error", "message": "Email not registered!"}

    # Only create OTP if user exists
    otp_code = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=10)

    new_otp = OTP(user_id=user.id, code=otp_code, expires_at=expires)
    db.add(new_otp)
    await db.commit()

    # Send mail
    result = send_email_otp(email, otp_code)
    
    if result:
        return {"status": "success", "message": "OTP sent. Please check your email."}
    else:
        return {"status": "error", "message": "Error sending mail (Server misconfigured)"}

# 2. Reset Password (Step 2 - Verify OTP)
@router.post("/reset-password")
async def reset_password(data: dict, db: AsyncSession = Depends(get_db)):
    email = data.get("email")
    otp_code = data.get("otp")
    new_password = data.get("new_password")

    user_q = await db.execute(select(User).where(User.email == email))
    user = user_q.scalar()
    if not user: return {"status": "error", "message": "Invalid request"}

    otp_q = await db.execute(select(OTP).where(
        OTP.user_id == user.id,
        OTP.code == otp_code,
        OTP.is_used == False,
        OTP.expires_at > datetime.utcnow()
    ))
    otp_record = otp_q.scalars().first()

    if not otp_record:
        return {"status": "error", "message": "Invalid or expired OTP"}

    user.password_hash = bcrypt.hash(new_password)
    otp_record.is_used = True
    await db.commit()

    return {"status": "success", "message": "Password reset successful. Please login."}

# --- OLD EMAIL FUNCTIONS (KEPT & TRANSLATED) ---

def send_welcome_email(to_email, full_name):
    print(f"🚀 Sending Welcome Email to: {to_email}...")
    
    if not SENDER_EMAIL or "email_cua_ban" in SENDER_EMAIL:
        print("⚠️ Sender Email not configured in .env or environment variables")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = formataddr(("AI-CaaS Team", SENDER_EMAIL)) # Sender Name
        msg['To'] = to_email
        msg['Subject'] = "Welcome to AI-CaaS!"
        msg['Date'] = formatdate(localtime=True)

        # Email content (HTML)
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-w-md mx-auto background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #4F46E5; text-align: center;">🎉 Registration Successful!</h2>
                <p style="color: #333; font-size: 16px;">Hello <strong>{full_name}</strong>,</p>
                <p style="color: #555; line-height: 1.6;">
                    Thank you for joining <strong>AI-CaaS</strong>. Your account has been activated and is ready to use.
                </p>
                <div style="background-color: #f0f7ff; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #333;"> <strong>Login Email:</strong> {to_email}</p>
                    <p style="margin: 5px 0 0; color: #333;">✨ <strong>Current Plan:</strong> Free Plan</p>
                </div>
                <p style="text-align: center; margin-top: 30px;">
                    <a href="https://csc13002-group6-aurion.vercel.app" 
                       style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Access Now
                    </a>
                </p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">If you did not create this account, please ignore this email.</p>
            </div>
          </body>
        </html>
        """

        msg.attach(MIMEText(html_body, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Welcome Mail sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"❌ ERROR SENDING WELCOME MAIL: {e}")
        return False

def send_pro_success_email(to_email, full_name, expired_date_str):
    if not SENDER_EMAIL: return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = formataddr(("AI-CaaS Billing", SENDER_EMAIL))
        msg['To'] = to_email
        msg['Subject'] = "Payment Confirmation: AI-CaaS Pro Upgrade"
        msg['Date'] = formatdate(localtime=True)

        html_body = f"""
        <html>
          <body style="font-family: Helvetica, Arial, sans-serif; background-color: #f0f2f5; padding: 20px;">
            <div style="max-w-md mx-auto background-color: #ffffff; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="background-color: #10a37f; padding: 20px; text-align: center;">
                    <h2 style="color: white; margin: 0;">Payment Successful!</h2>
                </div>
                <div style="padding: 30px;">
                    <p>Hello <strong>{full_name}</strong>,</p>
                    <p>Thank you for upgrading to a <strong>Pro</strong> account. Your transaction has been confirmed.</p>
                    
                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <table style="width: 100%;">
                            <tr>
                                <td style="color: #6b7280; padding: 5px 0;">Service Package:</td>
                                <td style="font-weight: bold; text-align: right;">AI-CaaS Pro (1 Month)</td>
                            </tr>
                            <tr>
                                <td style="color: #6b7280; padding: 5px 0;">Amount:</td>
                                <td style="font-weight: bold; text-align: right; color: #10a37f;">99,000 VND</td>
                            </tr>
                            <tr>
                                <td style="color: #6b7280; padding: 5px 0;">Expiration Date:</td>
                                <td style="font-weight: bold; text-align: right; color: #dc2626;">{expired_date_str}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="font-size: 13px; color: #6b7280; text-align: center;">
                        Thank you for staying with us.
                    </p>
                </div>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html_body, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ Invoice email sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Error sending invoice email: {e}")
        return False

# --- [NEW] SEND CREDIT TOP-UP EMAIL (ADDED AT END) ---
def send_credit_success_email(to_email, full_name, amount, cost):
    if not SENDER_EMAIL: return False
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = formataddr(("AI-CaaS Billing", SENDER_EMAIL))
        msg['To'] = to_email
        msg['Subject'] = f"Payment Successful: Loaded {amount} Credits"
        msg['Date'] = formatdate(localtime=True)

        html_body = f"""
        <html>
          <body style="font-family: Helvetica, Arial, sans-serif; background-color: #f0f2f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <div style="background-color: #10a37f; padding: 20px; text-align: center;">
                    <h2 style="color: white; margin: 0;">Top-up Successful!</h2>
                </div>
                
                <div style="padding: 30px;">
                    <p>Hello <strong>{full_name}</strong>,</p>
                    <p>You have successfully purchased <strong>{amount} Credits</strong>. Your transaction has been confirmed.</p>
                    
                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <table style="width: 100%;">
                            <tr>
                                <td style="color: #6b7280; padding: 5px 0;">Item Purchased:</td>
                                <td style="font-weight: bold; text-align: right;">{amount} Credits</td>
                            </tr>
                            <tr>
                                <td style="color: #6b7280; padding: 5px 0;">Total Amount:</td>
                                <td style="font-weight: bold; text-align: right; color: #10a37f;">{cost:,.0f} VND</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="font-size: 13px; color: #6b7280; text-align: center;">
                        Thank you for using our service!
                    </p>
                </div>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html_body, 'html'))
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Error sending Credit email: {e}")
        return False