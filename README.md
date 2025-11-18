# AI-CaaS Platform – README.md

AURION (AI-CaaS Platform) is a **Chatbot-as-a-Service** system that enables users to build customized AI chatbots using their own documents and instructions — without coding. This README summarizes the system based on the official project plan, including technologies, architecture, scope, and development phases.

---

## 🚀 Overview

Modern Large Language Models (LLMs) are powerful, but lack access to private organizational data. Building a full Retrieval-Augmented Generation (RAG) system requires expertise in vector databases, embeddings, APIs, and backend engineering.

**AI-CaaS solves this** by offering a centralized web platform where users can:

- Create custom chatbots
- Upload private documents
- Automatically build RAG pipelines
- Interact via a friendly chat UI
- Share bots with teammates

The platform abstracts all complexity and enables deployment in minutes.

---

## 🎯 Objectives

- Provide a no-code solution for creating specialized AI chatbots
- Automatically process documents for retrieval-augmented generation
- Support multiple AI model providers (OpenAI, Google, Anthropic)
- Deliver a modern, fast, and scalable web application
- Ensure secure user authentication and bot-sharing permissions

---

## 📌 Core Features

### 1. User & Authentication

- Register and log in using JWT-based authentication
- Access a personal dashboard of created and shared chatbots

### 2. Chatbot Creation

- Name the bot
- Select LLM model (e.g., GPT-4o, Gemini 1.5 Pro)
- Write a system prompt to define bot behavior

### 3. Knowledge Ingestion (RAG)

- Upload PDFs, TXT, DOCX
- Automatic text splitting and embedding generation
- Store embeddings using PostgreSQL + pgvector
- Retrieve relevant chunks during chat

### 4. Chat Interface

- Real-time interactive chat UI
- Answers augmented with retrieved context

### 5. Bot Sharing

- Invite other platform users to collaborate and use the bot

---

## 🏗 System Architecture

### **Frontend – Next.js**

- Modern React framework
- Supports SSR + SSG for fast performance
- Communicates with backend via REST APIs

### **Backend – FastAPI (Python 3.10+)**

- Handles authentication, bot management, file processing
- Manages AI model integrations
- Implements RAG pipeline using LangChain / LlamaIndex

### **Database – PostgreSQL + pgvector**

Stores both:

- Structured data: users, bots, permissions
- Vector data: embeddings of documents

### **External AI APIs**

Supports multiple providers:

- OpenAI
- Google Gemini
- Anthropic Claude

### **Architecture Flow**

```
Browser (Next.js)
      ↓
FastAPI (Backend)
      ↓
PostgreSQL + pgvector ←→ External LLM APIs
```

---

## 🛠 Tools & Technologies

### **Languages**

- Python 3.10+ (Backend)
- JavaScript / TypeScript (Frontend)

### **Frameworks**

- FastAPI
- Next.js
- LangChain / LlamaIndex

### **Infrastructure**

- Uvicorn (ASGI server)
- Nginx (reverse proxy)
- PostgreSQL 15+

### **Authentication**

- JWT tokens

### **Documentation Standards**

- PEP 8, Docstrings (Python)
- ESLint (Frontend)
- Formal SRS & SDD documents

---

## 📚 Project Scope

### Included

- User registration/login
- Chatbot creation
- Document upload & RAG processing
- Chat UI
- Bot invitation/sharing

### Excluded (Future Work)

- Payment integration
- Embedding bots into external websites
- Helpdesk automation

---

## 🧠 Development Plan

### **1. Requirements Analysis**

Deliverables:

- SRS document
- Product Backlog

### **2. Software Design**

Deliverables:

- SDD (architecture diagrams)
- Database ERD
- UI/UX mockups

### **3. Implementation (Iterations)**

- **Iteration 1:** Backend & frontend setup, authentication
- **Iteration 2:** RAG pipeline (embedding & vector storage)
- **Iteration 3:** UI integration for bots, docs, chat
- **Iteration 4:** MVP (end-to-end system)
- **Iteration 5:** Bot sharing + refinements

### **4. Testing**

Deliverables:

- Test plan & test cases
- Test report

### **5. Deployment**

Deliverables:

- Deployment Guide
- Final running application

---

## 👥 Team Structure

- **Project Manager:** Phan Trung Tuấn
- **Backend Developer:** Nguyễn Bách Khoa
- **Frontend Developer:** Nguyễn Nhật Nam
- **AI/ML Engineer:** Trần Danh Thiện
- **QA & Tester:** Trương Quang Huy

---

## 💵 Costing Summary

- Total Notional Labor Cost: **$12,600**
- Total Direct Costs: **$62**
- Total Project Value: **$12,662**

---

## 📦 Repository Structure

```
📁 src
   ├── backend (FastAPI)
   ├── frontend (Next.js)
   └── ai-pipeline (RAG logic)
📁 docs
   ├── management
   ├── requirements
   ├── analysis-and-design
   └── test
📁 pa
   ├── pa1
   ├── pa2
   └── ...
```

---

## 🔧 Tools Setup

- **Slack** – communication
- **Zoom** – meetings
- **JIRA** – task management & sprint tracking
- **GitHub** – version control & code reviews
- **Google Docs** – collaborative documents
- **Figma** – UI/UX design
- **Moodle** – official assignment submission

---

## 📄 License

MIT License

---

## 🌟 Vision

To democratize access to private, knowledge-aware AI systems — enabling anyone to deploy a powerful, personalized AI assistant with minimal effort.
