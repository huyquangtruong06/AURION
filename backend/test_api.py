import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

# 1. Nạp biến môi trường từ file .env
load_dotenv()

def test_openai():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ [OPENAI] Không tìm thấy API Key trong file .env")
        return

    print(f"⏳ [OPENAI] Đang test kết nối với key: {api_key[:5]}...*****")
    try:
        # Thử model gpt-4o-mini (Rẻ và nhanh)
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        response = llm.invoke("Chào bạn, hãy nói 'OpenAI hoạt động tốt' bằng tiếng Việt.")
        print(f"✅ [OPENAI] THÀNH CÔNG! Phản hồi: {response.content}")
    except Exception as e:
        print(f"❌ [OPENAI] THẤT BẠI. Lỗi: {e}")

def test_gemini():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("⚠️ [GEMINI] Không tìm thấy API Key (Nếu bạn chỉ dùng OpenAI thì bỏ qua).")
        return

    print(f"⏳ [GEMINI] Đang test kết nối với key: {api_key[:5]}...*****")
    try:
        # Thử model gemini-1.5-flash (Miễn phí)
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
        response = llm.invoke("Chào bạn, hãy nói 'Gemini hoạt động tốt' bằng tiếng Việt.")
        print(f"✅ [GEMINI] THÀNH CÔNG! Phản hồi: {response.content}")
    except Exception as e:
        print(f"❌ [GEMINI] THẤT BẠI. Lỗi: {e}")

if __name__ == "__main__":
    print("--- BẮT ĐẦU TEST API ---")
    test_openai()
    print("-" * 30)
    test_gemini()
    print("--- KẾT THÚC ---")