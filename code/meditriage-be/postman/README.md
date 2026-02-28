# MediTriage API - Postman Collection

This folder contains Postman collections for testing the MediTriage backend API.

## Import Instructions

1. Open Postman
2. Click **Import** button (top left)
3. Select `MediTriage-API.postman_collection.json`
4. The collection will appear in your sidebar

## Collection Structure

### 📁 Authentication
- **Register User (Nurse)** — Create a nurse account
- **Register User (Doctor)** — Create a doctor account
- **Login** — Get JWT token (auto-saves to `{{access_token}}` variable)
- **Get Current User** — Test protected endpoint

### 📁 Triage
- **Start Triage Interview** — Begin AI-powered triage
- **Send Triage Chat Message** — Continue interview conversation

### 📁 Health Check
- **Root Health Check** — Verify server is running

## Quick Start

### 1. Start the server
```bash
uvicorn app.main:app --reload
```

### 2. Test the workflow

**Step 1:** Run **Register User (Nurse)**
- Creates a test nurse account
- ✅ Expect: 201 Created

**Step 2:** Run **Login**
- Uses the nurse credentials
- ✅ Expect: 200 OK with `access_token`
- 🔑 Token is **automatically saved** to collection variable

**Step 3:** Run **Get Current User**
- Uses the saved token automatically
- ✅ Expect: 200 OK with user data

**Step 4:** Create a medical encounter in the database (manual step)
- You'll need an `encounter_id` for triage endpoints

**Step 5:** Run **Start Triage Interview**
- Replace `REPLACE_WITH_ENCOUNTER_UUID` with your encounter ID
- ✅ Expect: AI greeting message

**Step 6:** Run **Send Triage Chat Message**
- Continue the conversation
- ✅ Expect: AI follow-up question

## Variables

The collection uses these variables:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:8000` | API base URL |
| `access_token` | (auto-set) | JWT token from login |

## Test Scripts

Each request includes automated tests that verify:
- ✅ Correct HTTP status codes
- ✅ Response structure
- ✅ Required fields present

Tests run automatically after each request.

## Notes

- 🔒 Protected endpoints automatically use `{{access_token}}`
- 🔄 Login request auto-saves the token
- 📝 All requests include example data
- ✅ All requests include test assertions
