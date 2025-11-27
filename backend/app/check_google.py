import os
from dotenv import load_dotenv
import google.generativeai as genai

# Nạp Key
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

print(f"--- Đang kiểm tra Key: {api_key[:10]}... ---")
try:
    print("Danh sách các model bạn được dùng:")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f" - {m.name}")
except Exception as e:
    print(f"LỖI: {e}")