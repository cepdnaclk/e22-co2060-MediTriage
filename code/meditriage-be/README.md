# Medi-Triage Backend

This is the backend API for **Medi-Triage**, an AI-powered clinical decision support system.

## Environment Setup

### Prerequisites
* **Python:** 3.10 or higher.
* **Database:** PostgreSQL (must be installed and running locally).
* **Package Manager:** `pip`.

### Installation Steps

1. **Clone & Navigate:**
   ```bash
   git clone <repo-url>
   cd meditriage-be
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

## Running the Server

To start the development server with hot-reload enabled:

```bash
uvicorn app.main:app --reload
```

* **API Root:** `http://localhost:8000`
* **Interactive Docs (Swagger UI):** `http://localhost:8000/docs`
* **ReDoc:** `http://localhost:8000/redoc`
