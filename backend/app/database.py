import os
from dotenv import load_dotenv

# Nạp biến môi trường
load_dotenv()

# Lấy chuỗi kết nối từ file .env
DATABASE_URL = os.getenv("DATABASE_URL")

# --- ĐÂY LÀ HÀM MÀ PYTHON ĐANG TÌM ---
def get_db_connection_string():
    if not DATABASE_URL:
        raise ValueError("Chưa cấu hình DATABASE_URL trong file .env")
    return DATABASE_URL
