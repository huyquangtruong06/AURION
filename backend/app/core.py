import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
# --- GIỮ NGUYÊN: Dùng Google cho phần Chat (LLM) ---
from langchain_google_genai import ChatGoogleGenerativeAI
# --- THAY ĐỔI: Dùng HuggingFace cho phần Embedding (Chạy local) ---
from langchain_community.embeddings import HuggingFaceEmbeddings
# ---------------------------------------------------------------
from langchain_community.vectorstores import PGVector
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from app.database import get_db_connection_string

# 1. Cấu hình kết nối
CONNECTION_STRING = get_db_connection_string()

# --- THAY ĐỔI: Dùng Model Embedding Local (Miễn phí, Không giới hạn) ---
# Model này nhỏ gọn (80MB) nhưng rất xịn
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

def get_vector_store():
    return PGVector(
        connection_string=CONNECTION_STRING,
        embedding_function=embeddings,
        # Đổi tên bảng lần nữa để dùng hệ vector mới
        collection_name="knowledge_base_local", 
        use_jsonb=True,
    )

# --- CHỨC NĂNG 1: DẠY BOT HỌC ---
def add_knowledge_to_bot(file_path: str, bot_id: str):
    try:
        print(f"--- Đang xử lý file: {file_path} ---")
        loader = PyPDFLoader(file_path)
        docs = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)
        print(f"--- Đã cắt thành {len(splits)} đoạn. Đang tạo Vector... ---")

        for doc in splits:
            doc.metadata["bot_id"] = bot_id
            doc.metadata["source"] = file_path

        vector_store = get_vector_store()
        vector_store.add_documents(splits)
        print("--- Hoàn tất lưu vào Database ---")
        return True
    except Exception as e:
        print(f"Lỗi khi thêm kiến thức: {e}")
        return False

# --- CHỨC NĂNG 2: HỎI BOT ---
def ask_bot(question: str, bot_id: str):
    vector_store = get_vector_store()
    
    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": 3, 
            "filter": {"bot_id": bot_id}
        }
    )

# SỬA LẠI PROMPT NÀY:
    template = """Bạn là trợ lý AI thông minh và thân thiện.
    Nhiệm vụ của bạn là trả lời câu hỏi dựa trên ngữ cảnh được cung cấp.
    
    Quy tắc quan trọng:
    1. Ưu tiên dùng thông tin trong Ngữ cảnh để trả lời.
    2. Nếu Ngữ cảnh thiếu thông tin, HÃY DÙNG KIẾN THỨC CỦA BẠN để trả lời bổ sung một cách hữu ích.
    3. Trả lời chi tiết, rõ ràng, trình bày đẹp mắt.
    
    Ngữ cảnh: {context}
    
    Câu hỏi: {question}
    """
    prompt = ChatPromptTemplate.from_template(template)
    
    # Vẫn dùng Gemini Flash để Chat (Vì nó miễn phí và token lớn)
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)

    rag_chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return rag_chain.invoke(question)
