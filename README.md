# AURION AI-CaaS Platform

AI Chatbot as a Service - Create and manage AI chatbots

## Requirements
- Python 3.10+
- Node.js 18+
- PostgreSQL

## Quick Start

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd AURION
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:3000

### 3. Setup Backend
```bash
cd backend
pip install -r requirements.txt
# Create .env file (see below)
python app.py
```
Backend: http://localhost:8000

### Environment Variables

**Backend (.env):**
```env
DATABASE_URL=postgresql://user:password@localhost/dbname
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Features
- Chat with AI bots
- Create custom bots with knowledge base
- Data analytics
- Group chat
- Referral system
- Subscription plans
- Profile management
- Helpdesk support tickets
- Embeddable chat widget
