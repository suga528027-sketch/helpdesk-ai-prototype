# SolveWise AI: Advanced Agentic IT Resolution System 🚀

An enterprise-grade, multi-agent AI helpdesk system designed for automated classification, technical diagnostic, and proactive resolution.

## 🌟 Advanced Features

- **Multi-Agent Reasoning**: Tickets are processed by a pipeline of AI agents:
  - **The Scrubber**: Scans for and masks PII (Privacy).
  - **The Vision Agent**: Parses attached screenshots for error codes.
  - **The Auditor**: Reviews AI-generated resolutions for technical accuracy.
  - **The RCA Analyst**: Generates deep Root Cause Analysis for major incidents.
- **Real-Time Connectivity**: WebSockets power live status updates and notification bells.
- **Predictive Analytics**: AI-driven volume forecasting for infrastructure capacity planning.
- **RBAC & Security**: Tiered access for End-Users, Support Agents, and Admins.

## 🛠️ Tech Stack
- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Recharts, Axios.
- **Backend**: FastAPI (Python 3.12), SQLAlchemy (Async), Claude 3.5 Sonnet (Vision & LLM).
- **Intelligence**: FAISS Vector DB, Sentence-Transformers (RAG).

## 🚀 Quick Start

1. **Setup Backend**:
   ```cmd
   cd backend
   pip install -r requirements.txt
   set ANTHROPIC_API_KEY=your_key
   python -m uvicorn main:app --reload
   ```

2. **Setup Frontend**:
   ```cmd
   cd frontend
   npm install
   npm run dev
   ```

3. **Try the Chatbot**: Click the blue bubble in the bottom corner to ask AI about your live ticket status!

---
Built with 💜 by SolveWise AI
