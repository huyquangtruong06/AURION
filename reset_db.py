import asyncio
from sqlalchemy import text
from connect_database import engine
from models import Base, User, Session, Bot, KnowledgeBase

async def reset_database():
    print("⏳ Đang kết nối tới Database...")
    
    async with engine.begin() as conn:
        print("🔥 Đang cưỡng chế xóa toàn bộ bảng (CASCADE)...")
        
        # Dùng Raw SQL để Drop bảng với CASCADE (Xóa bất chấp ràng buộc)
        # Liệt kê tất cả các bảng có thể tồn tại, bao gồm cả 'documents' gây lỗi
        drop_command = text("""
            DROP TABLE IF EXISTS 
            sessions, 
            bots, 
            knowledge_bases, 
            documents, 
            users 
            CASCADE;
        """)
        
        await conn.execute(drop_command)
        print("✅ Đã xóa sạch sẽ (bao gồm cả các bảng rác)!")

        # Tạo lại bảng mới từ đầu
        print("CTV  Đang tạo lại bảng mới theo models.py...")
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Đã tạo xong bảng mới!")

    await engine.dispose()
    print("🎉 HOÀN TẤT! Database đã được reset mới tinh.")

if __name__ == "__main__":
    try:
        asyncio.run(reset_database())
    except Exception as e:
        print(f"❌ Lỗi: {e}")