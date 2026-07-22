# 🏥 MediTriage — AI-Powered Pre-Consultation Triage & Collaboration System

MediTriage is a comprehensive AI-powered clinical intake and collaboration platform designed for hospital settings. It guides clinical staff (e.g., nurses) through structured patient interviews, scrubs Patient Identifiable Information (PII) locally, generates draft SOAP Notes using cloud AI, and provides secure real-time Multi-Disciplinary Team (MDT) conference rooms for doctors.

---

## 📁 Project Structure

```
e22-co2060-MediTriage/
├── code/
│   ├── meditriage-be/    # Backend (Python / FastAPI)
│   └── meditriage-fe/    # Frontend (React 19 / Vite 7)
├── docs/                 # University project page source and assets
└── README.md             
```

---

## ✨ Key Capabilities

- **🤖 Conversational AI Triage** — A LangChain-powered interview engine guides the nurse through a clinically structured question flow, adapting dynamically to patient responses.
- **🔒 Privacy-First Architecture** — Patient Identifiable Information (PII) is scrubbed locally using a lightweight Llama 3.2 model (via Ollama) *before* any data is sent to a cloud AI provider, ensuring patient data never leaves the facility unprotected.
- **📝 Automated SOAP Note Generation** — Cloud AI (DeepSeek or OpenAI) synthesises the scrubbed conversation into a structured SOAP clinical note ready for doctor review.
- **💬 Real-Time MDT Conferences** — Secure real-time collaboration rooms for Multi-Disciplinary Teams (MDT) of doctors to discuss clinical cases, share encrypted messages (AES-256), and collaborate on attachments.
- **👥 Role-Based Access Control** — Dedicated portals and permissions for Nurses, Doctors, and Administrators.

---

## 🛠 Technology Stack

### Backend (`meditriage-be`)
- **Framework:** FastAPI (Python 3.10+)
- **AI Orchestration:** LangChain
- **PII Scrubbing:** Local Ollama + Llama 3.2 1B
- **Cloud Reasoning:** DeepSeek API or OpenAI API (using dynamic Adapter Pattern)
- **Database:** PostgreSQL with SQLAlchemy ORM & Alembic migrations
- **Real-Time Communication:** WebSockets (FastAPI Connection Manager)
- **Security & Encryption:** JWT Authentication, cryptography (AES-256 Fernet) for encrypted clinical room messages and attachments

### Frontend (`meditriage-fe`)
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite 7
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Real-Time Communication:** Native WebSocket API

---

## 📦 Prerequisites

Ensure you have the following installed:
- **Python 3.10+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Ollama** (for local LLM PII scrubbing) - [Download](https://ollama.ai/download)
- **Git** - [Download](https://git-scm.com/)

---

## 🚀 Backend Setup (meditriage-be)

### 1. Navigate to Backend Directory
```bash
cd code/meditriage-be
```

### 2. Set Up Virtual Environment

**Windows:**
```bash
python -m venv venv
.\venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note:** If you encounter passlib/bcrypt configuration issues, ensure you install bcrypt version 3.2.2: `pip install bcrypt==3.2.2`.

### 4. Set Up Local Ollama Model (PII Scrubber)
1. Download and start [Ollama](https://ollama.ai/download).
2. Pull the lightweight Llama 3.2 1B model:
   ```bash
   ollama pull llama3.2:1b
   ```

### 5. Set Up PostgreSQL Database
1. Ensure your PostgreSQL service is running.
2. Connect to PostgreSQL and create a database named `meditriage`:
   ```sql
   CREATE DATABASE meditriage;
   ```

### 6. Configure Environment Variables
Copy the environment example file:
```bash
cp .env.example .env
```
Open `.env` and configure:
- `POSTGRES_PASSWORD` with your PostgreSQL password.
- `DEEPSEEK_API_KEY` (or `OPENAI_API_KEY` if configured).
- `SECRET_KEY` (generate one via `openssl rand -hex 32` or `python -c "import secrets; print(secrets.token_hex(32))"`).

### 7. Run Migrations & Seed Data
Apply database migrations to create tables:
```bash
alembic upgrade head
```
Seed the database with default test accounts (5 Nurses and 5 Doctors):
```bash
psql -U postgres -d meditriage -f scripts/seed_users.sql
```
*(All test accounts share the password `SecurePass@123`. See backend README for usernames).*

### 8. Start Backend Server
Start the FastAPI server in development mode:
```bash
uvicorn app.main:app --reload
```
The server will run on `http://localhost:8000`. You can access interactive Swagger documentation at `http://localhost:8000/docs`.

---

## 💻 Frontend Setup (meditriage-fe)

### 1. Navigate to Frontend Directory
```bash
cd code/meditriage-fe
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env.local` file if you need to override the API endpoint URL (default is `http://localhost:8000/api/v1`):
```env
VITE_API_URL=http://localhost:8000/api/v1
```

### 4. Start Development Server
```bash
npm run dev
```
The frontend application will be available at `http://localhost:5173`.

---

## 🔄 Running Both Services

### macOS/Linux
**Terminal 1 - Backend:**
```bash
cd code/meditriage-be
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd code/meditriage-fe
npm run dev
```

### Windows
**Terminal 1 - Backend:**
```bash
cd code\meditriage-be
.\venv\Scripts\activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd code\meditriage-fe
npm run dev
```

---

## 🐛 Common Issues

### ModuleNotFoundError: No module named 'app'
- Ensure you are running commands from the `code/meditriage-be/` directory.
- Verify that your virtual environment is activated.

### Port 8000 already in use
- Kill the process using port 8000, or run uvicorn on a custom port:
  ```bash
  uvicorn app.main:app --reload --port 8080
  ```

### 404 Not Found on all Backend API Endpoints
- **Warning:** Running `uvicorn main:app` loads the wrong file (returns a generic message). Ensure you run **`uvicorn app.main:app --reload`** to load the complete application.

---

## 📚 Project Documentation

- **University Project Page README:** [docs/README.md](docs/README.md)
- **Backend README:** [code/meditriage-be/README.md](code/meditriage-be/README.md)
- **Frontend README:** [code/meditriage-fe/README.md](code/meditriage-fe/README.md)