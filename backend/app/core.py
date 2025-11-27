from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import PGVector
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from app.database import get_db_connection_string

# 1. Cấu hình kết nối
CONNECTION_STRING = get_db_connection_string()
embeddings = OpenAIEmbeddings() # Dùng OpenAI để chuyển chữ thành số

# Hàm lấy kho chứa Vector
def get_vector_store():
    return PGVector(
        connection_string=CONNECTION_STRING,
        embedding_function=embeddings,
        collection_name="knowledge_base_gpt4o", # Tên bảng trong DB
        use_jsonb=True,
    )

# --- CHỨC NĂNG 1: DẠY BOT HỌC (Ingestion) ---
def add_knowledge_to_bot(file_path: str, bot_id: str):
    try:
        # Bước A: Đọc file PDF
        loader = PyPDFLoader(file_path)
        docs = loader.load()

        # Bước B: Cắt nhỏ văn bản (Mỗi đoạn 1000 ký tự)
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)

        # Bước C: Đóng dấu chủ quyền (Metadata) - Quan trọng nhất!
        for doc in splits:
            doc.metadata["bot_id"] = bot_id
            doc.metadata["source"] = file_path

        # Bước D: Lưu vào Database
        vector_store = get_vector_store()
        vector_store.add_documents(splits)
        return True
    except Exception as e:
        print(f"Lỗi khi thêm kiến thức: {e}")
        return False

# --- CHỨC NĂNG 2: HỎI BOT (Retrieval) ---
def ask_bot(question: str, bot_id: str):
    vector_store = get_vector_store()
    
    # Bước A: Tìm kiếm dữ liệu liên quan (Chỉ tìm của bot_id này)
    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": 3, # Lấy 3 đoạn văn giống nhất
            "filter": {"bot_id": bot_id} # Lọc theo Bot ID
        }
    )

    # Bước B: Tạo kịch bản trả lời (Prompt)
    template = """Bạn là trợ lý AI. Chỉ trả lời dựa trên ngữ cảnh dưới đây:
    {context}
    
    Câu hỏi: {question}
    """
    prompt = ChatPromptTemplate.from_template(template)
    
    # Bước C: Dùng GPT-3.5 để trả lời
    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)

    # Bước D: Ghép chuỗi xử lý
    rag_chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    # Chạy và trả về kết quả
    return rag_chain.invoke(question)