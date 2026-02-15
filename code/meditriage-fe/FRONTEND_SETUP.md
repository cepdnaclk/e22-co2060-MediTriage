# MediTriage Frontend Setup Guide

This guide details how to install and run the MediTriage frontend application.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

## Installation

1.  **Navigate to the Directory**
    ```bash
    cd code/meditriage-fe
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

## Configuration

-   **API Connection**: The frontend is explicitly configured to connect to the backend at `http://localhost:8000/api/v1`.
-   **Environment Variables**: No `.env` file is required in the `meditriage-fe` directory for standard local development.
    -   Host/Port settings are defined in `vite.config.ts`.
    -   API Helper is defined in `src/services/api.ts`.

## Running the Application

1.  **Start Development Server**
    ```bash
    npm run dev
    ```

2.  **Access the Application**
    Open your browser and navigate to:
    **`http://localhost:3000`**

    *(Note: The default Vite port is overridden to 3000 in `vite.config.ts`)*

## Building for Production

To create a production-ready build:

1.  **Run Build Command**
    ```bash
    npm run build
    ```

2.  **Preview Build**
    ```bash
    npm run preview
    ```

## Local Backend Setup (Reference)

If you are running the backend locally for full integration testing, create a `.env` file in the **`meditriage-be`** directory. This example configures the backend to use local **Ollama models (phi3)** instead of paid APIs, allowing for cost-free testing.

**File:** `code/meditriage-be/.env`

```env
# ── MediTriage Backend Environment ──

# Database (PostgreSQL)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<your password>
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=meditriage
DATABASE_URL=postgresql+psycopg2://postgres:<your password>@localhost:5432/meditriage

# Security
SECRET_KEY=meditriage-dev-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ── AI Provider ──
# Using Ollama locally (phi3) via OpenAI-compatible endpoint.
# No code changes needed — just swap these values for DeepSeek in production.
ACTIVE_LLM=DEEPSEEK
DEEPSEEK_API_KEY=ollama
DEEPSEEK_BASE_URL=http://localhost:11434/v1
DEEPSEEK_MODEL=phi3

# Production values (uncomment when deploying):
# DEEPSEEK_API_KEY=your-real-deepseek-api-key
# DEEPSEEK_BASE_URL=https://api.deepseek.com
# DEEPSEEK_MODEL=deepseek-chat

# PII Scrubber (Ollama local model)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_SCRUBBER_MODEL=phi3

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/meditriage.log
```

## Creating Users (Manual)

Since there is currently no frontend interface for user registration, you must create users via the backend API using `curl` or a tool like Postman.

### 1. Create a Nurse Account
**Formatted Command (Bash/Git Bash):**
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
           "username": "nurse1",
           "email": "nurse@meditriage.com",
           "password": "password123",
           "full_name": "Nurse Joy",
           "role": "NURSE",
           "license_number": "RN-1001"
         }'
```
**One-Liner (Windows PowerShell):**
*Uses native `Invoke-RestMethod` to avoid quoting issues.*
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/auth/register" -ContentType "application/json" -Body (@{username="nurse1"; email="nurse@meditriage.com"; password="password123"; full_name="Nurse Joy"; role="NURSE"; license_number="RN-1001"} | ConvertTo-Json)
```

### 2. Create a Doctor Account
**Formatted Command (Bash/Git Bash):
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
           "username": "doctor1",
           "email": "doctor@meditriage.com",
           "password": "password123",
           "full_name": "Dr. House",
           "role": "DOCTOR",
           "license_number": "MD-2002"
         }'
```
**One-Liner (Windows PowerShell):**
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/auth/register" -ContentType "application/json" -Body (@{username="doctor1"; email="doctor@meditriage.com"; password="password123"; full_name="Dr. House"; role="DOCTOR"; license_number="MD-2002"} | ConvertTo-Json)
```
