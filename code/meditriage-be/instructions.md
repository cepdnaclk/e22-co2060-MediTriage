# Medi-Triage Backend: Developer Instructions

**Project:** Medi-Triage (RoboZen404)

**Stack:** Python (FastAPI), PostgreSQL, LangChain, SQLModel

**Architecture:** Modular Monolith (Service-Repository Pattern)

---

## 1. Project Overview

This is the backend API for **Medi-Triage**, an AI-powered clinical decision support system. It manages patient data, conducts AI-driven interviews (text/voice), and generates structured SOAP notes for doctors.

**Key Architectural Principles:**

* **Separation of Concerns:** API Routes  Services (Business Logic)  Repositories (Data Access).
* **Audit & Compliance:** All database entities inherit from `BaseAuditModel` to enforce soft-deletion and timestamp tracking automatically.
* 
**Scalability:** Designed to support the transition from Text-Only MVP (Sem 3) to Voice & Localization (Sem 6) without refactoring.



---

## 2. Environment Setup

### 2.1 Prerequisites

* 
**Python:** 3.10 or higher.


* 
**Database:** PostgreSQL (must be installed and running locally).


* **Package Manager:** `pip`.

### 2.2 Installation Steps

1. **Clone & Navigate:**
```bash
git clone <repo-url>
cd medi-triage-backend

```


2. **Create Virtual Environment:**
```bash
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

```


3. **Install Dependencies:**
```bash
pip install -r requirements.txt

```


4. **Environment Variables:**
Create a `.env` file in the root directory. Copy the structure below and fill in your local credentials:
```ini
# .env
PROJECT_NAME="Medi-Triage API"
API_V1_STR="/api/v1"

# Database (Local PostgreSQL)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=meditriage_dev

# AI Services (Get Key from OpenAI/Google)
OPENAI_API_KEY=sk-proj-...
# GEMINI_API_KEY=... (If switching providers)

# Security (Generate a random string: openssl rand -hex 32)
SECRET_KEY=supersecretkeyrequiredforjwttokens

```



---

## 3. Database Management (Migrations)

We use **Alembic** for migrations. Never modify the database schema manually in pgAdmin/SQL client.

### 3.1 Initial Setup

1. Ensure your Postgres server is running and the database `meditriage_dev` exists.
```sql
CREATE DATABASE meditriage_dev;

```


2. Generate the initial migration:
```bash
alembic revision --autogenerate -m "Initial migration"

```


3. Apply the migration to the DB:
```bash
alembic upgrade head

```



### 3.2 Making Schema Changes

Whenever you modify a model in `app/models/`:

1. Run: `alembic revision --autogenerate -m "Descriptive message"`
2. Review the generated file in `alembic/versions/` (sanity check).
3. Run: `alembic upgrade head`

---

## 4. Running the Server

To start the development server with hot-reload enabled:

```bash
uvicorn app.main:app --reload

```

* **API Root:** `http://localhost:8000`
* **Interactive Docs (Swagger UI):** `http://localhost:8000/docs`
* **ReDoc:** `http://localhost:8000/redoc`

---

## 5. Development Workflow & Standards

### 5.1 The "Feature Flow"

When adding a new feature (e.g., "Prescription Management"), strictly follow this layered approach:

1. **Model (`app/models/`):** Define the database table.
* *Rule:* Must inherit from `BaseAuditModel`.


2. **Schema (`app/schemas/`):** Define the Pydantic DTOs (Request/Response).
* *Rule:* Never return a raw Model to the API; always convert to a Schema.


3. **Repository (`app/repositories/`):** specific CRUD operations.
* *Rule:* Use `select(Model).where(Model.is_active == True)` to respect soft deletes.


4. **Service (`app/services/`):** Implement the business logic.
* *Rule:* This layer handles AI calls, external APIs, and complex validations.


5. **Endpoint (`app/api/v1/endpoints/`):** The HTTP interface.
* *Rule:* Keep this thin. It should only validate input and call the Service.



### 5.2 Coding Standards

* **Naming:**
* Classes: `PascalCase` (e.g., `TriageService`)
* Variables/Functions: `snake_case` (e.g., `get_patient_history`)
* Constants: `UPPER_CASE` (e.g., `MAX_RETRY_ATTEMPTS`)


* **Type Hinting:** Mandatory for all function arguments and return types.
```python
def get_user(user_id: UUID) -> UserSchema: ...

```


* **Async/Await:** Use `async def` for all route handlers and DB operations to prevent blocking the main thread.

### 5.3 Git Strategy

* **Main Branch:** `main` (Production-ready code only).
* **Dev Branch:** `develop` (Integration branch).
* **Feature Branches:** `feature/feature-name` (e.g., `feature/voice-input`).
* **Commit Messages:** Use imperative mood (e.g., "Add user authentication", not "Added user auth").

---

## 6. Directory Structure Reference

Refer to this structure when deciding where to place new files.

```text
app/
├── api/v1/endpoints/   # Route Controllers (Keep thin!)
├── core/               # Config, Security, Logging
├── db/                 # DB Session & Base Setup
├── models/             # Database Tables (SQLModel)
├── schemas/            # Pydantic Models (Input/Output validation)
├── repositories/       # Data Access Layer (CRUD)
├── services/           # Business Logic (AI, Triage, Auth)
│   ├── llm/            # Specific logic for LangChain/OpenAI
│   └── ...
├── clients/            # External Integrations (Email, SMS, Cloud Storage)
└── main.py             # App Entry Point

```

---

## 7. Testing

We use `pytest` for unit and integration testing.

* **Run all tests:**
```bash
pytest

```


* **Run a specific test file:**
```bash
pytest tests/api/test_triage.py

```



---

## 8. Troubleshooting

**Issue: `alembic` command not found**

* *Fix:* Ensure you are inside the virtual environment (`source venv/bin/activate`).

**Issue: Database connection refused**

* *Fix:* Check if the PostgreSQL service is running (`sudo service postgresql status` or check Task Manager). Verify credentials in `.env`.

**Issue: "ImportError" when running scripts**

* *Fix:* Run python modules from the root directory using the `-m` flag (e.g., `python -m app.initial_data`).