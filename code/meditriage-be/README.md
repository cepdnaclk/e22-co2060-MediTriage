# 🏥 MediTriage Backend API

**AI-Powered Clinical Decision Support System**

A FastAPI-based backend service that provides intelligent medical triage through conversational AI, integrating local LLM processing (Ollama) with cloud-based reasoning (DeepSeek) for HIPAA-compliant patient assessment.

---

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Ollama Setup (Local LLM)](#ollama-setup-local-llm)
- [Environment Configuration](#environment-configuration)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

- **🤖 AI-Powered Triage**: Conversational medical assessment using LLM
- **🔒 Privacy-First**: Local PII scrubbing with Ollama before cloud processing
- **👥 Role-Based Access Control**: Nurse, Doctor, and Admin roles
- **📝 Clinical Notes**: Automated SOAP note generation
- **📊 Patient Management**: Comprehensive patient records with search
- **🔐 JWT Authentication**: Secure token-based authentication
- **📮 RESTful API**: 20+ endpoints with full CRUD operations
- **📖 Interactive Docs**: Auto-generated Swagger UI documentation

---

## 🛠 Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | FastAPI 0.104.0 |
| **Database** | PostgreSQL + SQLAlchemy |
| **Authentication** | JWT (python-jose) + bcrypt |
| **AI/LLM** | LangChain + Ollama (local) + DeepSeek (cloud) |
| **Validation** | Pydantic v2 |
| **Migration** | Alembic |
| **Server** | Uvicorn (ASGI) |

---

## 📦 Prerequisites

Ensure you have the following installed:

### Required Software

1. **Python 3.10+**
   ```bash
   python --version  # Should be 3.10 or higher
   ```

2. **PostgreSQL 14+**
   - Download: [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
   - Verify installation:
     ```bash
     psql --version
     ```

3. **Ollama** (for local LLM)
   - Download: [https://ollama.ai/download](https://ollama.ai/download)
   - Verify installation:
     ```bash
     ollama --version
     ```

4. **Git**
   ```bash
   git --version
   ```

---

## 🚀 Installation

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd meditriage-be
```

### Step 2: Create Virtual Environment

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

### Step 3: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **⚠️ Important**: If you encounter bcrypt errors, ensure you have `bcrypt==3.2.2` (not 4.x or 5.x):
> ```bash
> pip install bcrypt==3.2.2
> ```

---

## 🗄️ Database Setup

### Step 1: Start PostgreSQL Service

**Windows:**
```bash
# Start PostgreSQL service (if not auto-started)
# Search for "Services" → Start "postgresql-x64-XX"
```

**macOS:**
```bash
brew services start postgresql
```

**Linux:**
```bash
sudo systemctl start postgresql
```

### Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql prompt:
CREATE DATABASE meditriage;
\q
```

### Step 3: Run Migrations

```bash
# Initialize Alembic (if not already done)
alembic upgrade head
```

**Verify Database:**
```bash
psql -U postgres -d meditriage -c "\dt"
# Should list tables: auth, users, patients, medical_encounters, triage_interactions, clinical_notes
```

---

## 🦙 Ollama Setup (Local LLM)

MediTriage uses **Ollama** for local PII scrubbing to ensure sensitive patient data never leaves your infrastructure before being anonymized.

### Step 1: Install Ollama

Download and install from: [https://ollama.ai/download](https://ollama.ai/download)

### Step 2: Pull Required Model

```bash
# Pull the lightweight Llama 3.2 1B model for PII scrubbing
ollama pull llama3.2:1b
```

**Verify model is available:**
```bash
ollama list
# Should show: llama3.2:1b
```

### Step 3: Start Ollama Service

**Windows/macOS:**
- Ollama runs automatically as a background service after installation

**Linux:**
```bash
# Start Ollama service
ollama serve
```

**Verify Ollama is running:**
```bash
curl http://localhost:11434/api/tags
# Should return JSON with available models
```

### Alternative Models (Optional)

For better performance (requires more RAM):
```bash
# Llama 3.2 3B - Better accuracy, needs ~6GB RAM
ollama pull llama3.2:3b

# Update .env file:
OLLAMA_SCRUBBER_MODEL=llama3.2:3b
```

---

## 🔧 Environment Configuration

### Step 1: Create .env File

Copy the template and fill in your credentials:

```bash
cp .env.example .env  # Or create manually
```

### Step 2: Configure Environment Variables

Edit `.env` with your settings:

```ini
# ========================================
# Project Configuration
# ========================================
PROJECT_NAME="MediTriage API"
API_V1_STR="/api/v1"

# ========================================
# Database Configuration
# ========================================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password_here
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=meditriage

# Auto-constructed (don't change unless using custom connection)
DATABASE_URL=postgresql+psycopg2://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_SERVER}:${POSTGRES_PORT}/${POSTGRES_DB}

# ========================================
# AI Services - Cloud Reasoning
# ========================================
# Get your API key from: https://platform.deepseek.com/
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

# ========================================
# AI Services - Local PII Scrubbing (Ollama)
# ========================================
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_SCRUBBER_MODEL=llama3.2:1b

# ========================================
# Security
# ========================================
# Generate with: openssl rand -hex 32
SECRET_KEY=your_secret_key_here_use_openssl_rand_hex_32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ========================================
# Logging (Optional)
# ========================================
LOG_LEVEL=INFO
LOG_FILE=logs/meditriage.log
```

### Step 3: Generate SECRET_KEY

**Windows (PowerShell):**
```powershell
# Install OpenSSL (if not present): https://slproweb.com/products/Win32OpenSSL.html
openssl rand -hex 32
```

**macOS/Linux:**
```bash
openssl rand -hex 32
```

**Alternative (Python):**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the generated key to `.env` → `SECRET_KEY`

### Step 4: Get DeepSeek API Key

1. Visit: [https://platform.deepseek.com/](https://platform.deepseek.com/)
2. Sign up / Log in
3. Navigate to API Keys
4. Create new key
5. Copy to `.env` → `DEEPSEEK_API_KEY`

---

## ▶️ Running the Server

### Development Mode (with auto-reload)

```bash
uvicorn app.main:app --reload
```

**⚠️ CRITICAL**: Use `app.main:app` (NOT `main:app`)
- ❌ `uvicorn main:app` → Loads wrong file (returns "Hello World")
- ✅ `uvicorn app.main:app` → Loads correct application (all 20+ endpoints)

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Custom Port

```bash
uvicorn app.main:app --reload --port 8080
```

### Verify Server is Running

1. **Health Check:**
   ```bash
   curl http://localhost:8000/
   ```
   Expected: `{"project": "MediTriage API", "status": "running"}`

2. **Interactive Docs:**
   Open in browser: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📚 API Documentation

### Endpoints Overview

| Category | Endpoint | Method | Auth Required | Role |
|----------|----------|--------|---------------|------|
| **Authentication** | `/api/v1/auth/register` | POST | No | - |
| | `/api/v1/auth/login` | POST | No | - |
| | `/api/v1/auth/me` | GET | Yes | All |
| | `/api/v1/auth/me` | PATCH | Yes | All |
| **Patient Management** | `/api/v1/patients` | POST | Yes | Nurse, Admin |
| | `/api/v1/patients/search` | GET | Yes | Nurse, Doctor |
| | `/api/v1/patients/{id}` | GET | Yes | Nurse, Doctor |
| | `/api/v1/patients/{id}` | PUT | Yes | Nurse, Admin |
| | `/api/v1/patients/{id}` | DELETE | Yes | **Admin Only** |
| | `/api/v1/patients/{id}/history` | GET | Yes | Nurse, Doctor |
| **User Management** | `/api/v1/users` | GET | Yes | **Admin Only** |
| | `/api/v1/users/{id}` | DELETE | Yes | **Admin Only** |
| **Triage & Clinical** | `/api/v1/triage/start` | POST | Yes | Nurse |
| | `/api/v1/triage/chat` | POST | Yes | Nurse |
| | `/api/v1/triage/{id}/messages` | GET | Yes | Nurse, Doctor |
| | `/api/v1/triage/{id}` | PATCH | Yes | Nurse |
| | `/api/v1/triage/{id}/note` | GET | Yes | Nurse, Doctor |
| | `/api/v1/triage/{id}/note` | PUT | Yes | **Doctor Only** |

**Total: 20 API Endpoints**

### Interactive Documentation

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI JSON**: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)

---

## 🧪 Testing

### Using Postman

1. **Import Collection:**
   ```
   File → Import → postman/MediTriage-API.postman_collection.json
   ```

2. **Set Base URL Variable:**
   - Collection → Variables → `base_url` = `http://localhost:8000`

3. **Test Flow:**
   ```
   1. Auth → Register Nurse
   2. Auth → Login (saves token automatically)
   3. Patients → Create Patient
   4. Patients → Search Patient
   5. Triage → Start Interview
   6. Triage → Send Chat Message
   ```

### Manual Testing with cURL

**Register User:**
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nurse_jane",
    "email": "jane@hospital.com",
    "password": "SecurePass123",
    "full_name": "Jane Doe",
    "role": "NURSE",
    "license_number": "NUR12345"
  }'
```

**Login:**
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nurse_jane",
    "password": "SecurePass123"
  }'
```

**Create Patient (with token):**
```bash
curl -X POST "http://localhost:8000/api/v1/patients" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "national_id": "123456789V",
    "first_name": "John",
    "last_name": "Patient",
    "date_of_birth": "1990-05-15",
    "contact_number": "+94771234567"
  }'
```

---

## 🐛 Troubleshooting

### Issue: 404 Not Found on All Endpoints

**Cause**: Wrong `main.py` file is being loaded

**Solution**:
```bash
# ❌ WRONG: uvicorn main:app
# ✅ CORRECT:
uvicorn app.main:app --reload
```

Verify by checking root endpoint:
- Wrong: `{"Hello": "World"}`
- Correct: `{"project": "MediTriage API", "status": "running"}`

---

### Issue: bcrypt/passlib Error

**Error**: `AttributeError: module 'bcrypt' has no attribute '__about__'`

**Solution**:
```bash
pip uninstall bcrypt
pip install bcrypt==3.2.2
```

**Explanation**: bcrypt 4.x+ has breaking changes incompatible with passlib 1.7.4

---

### Issue: Database Connection Failed

**Error**: `FATAL: password authentication failed for user "postgres"`

**Solution**:
1. Verify PostgreSQL is running:
   ```bash
   # Windows: Check Services
   # macOS: brew services list
   # Linux: systemctl status postgresql
   ```

2. Test connection manually:
   ```bash
   psql -U postgres -d meditriage
   ```

3. Update `.env` with correct credentials

---

### Issue: Ollama Model Not Found

**Error**: `Model 'llama3.2:1b' not found`

**Solution**:
```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# Pull the model
ollama pull llama3.2:1b

# Verify model is available
ollama list
```

---

### Issue: Alembic Migration Errors

**Error**: `Can't locate revision identified by 'xxxx'`

**Solution**:
```bash
# Reset migrations (CAUTION: This will drop all data!)
alembic downgrade base
alembic upgrade head

# Or start fresh:
rm -rf alembic/versions/*.py  # Keep folder
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

---

### Issue: Import Errors

**Error**: `ModuleNotFoundError: No module named 'app'`

**Solution**:
```bash
# Ensure you're in the project root directory
cd meditriage-be

# Verify virtual environment is activated
# (venv) should appear in your terminal prompt

# Reinstall dependencies
pip install -r requirements.txt
```

---

## 📁 Project Structure

```
meditriage-be/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py          # Authentication endpoints
│   │   │   │   ├── patients.py      # Patient management
│   │   │   │   ├── users.py         # User management (Admin)
│   │   │   │   └── triage.py        # Triage & clinical notes
│   │   │   └── api.py                # Router aggregation
│   │   └── dependencies.py           # RBAC & JWT dependencies
│   ├── core/
│   │   ├── config.py                 # Settings management
│   │   ├── security.py               # JWT & password hashing
│   │   └── logging.py                # Centralized logging
│   ├── db/
│   │   └── session.py                # Database session
│   ├── models/                       # SQLAlchemy models
│   ├── schemas/                      # Pydantic schemas
│   ├── services/                     # Business logic layer
│   │   ├── llm/                      # LLM integration
│   │   ├── auth_service.py
│   │   ├── patient_service.py
│   │   ├── user_service.py
│   │   ├── encounter_service.py
│   │   └── triage_engine.py
│   └── main.py                       # FastAPI application
├── alembic/                          # Database migrations
├── postman/                          # Postman collection
├── requirements.txt                  # Python dependencies
├── .env                               # Environment variables
└── README.md                         # This file
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is part of the University of Peradeniya academic work.

---

## 👥 Support

For issues or questions:
- **Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Issues**: Open a GitHub issue
- **Email**: [Your team email]

---

**Built with ❤️ for healthcare innovation**
