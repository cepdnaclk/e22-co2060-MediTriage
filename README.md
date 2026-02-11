
# MediTriage

A comprehensive AI-powered triage system for medical patient management.

## Project Structure

```
e22-co2060-MediTriage/
├── code/
│   ├── meditriage-be/    # Backend (Python/FastAPI)
│   └── meditriage-fe/    # Frontend (React/Vite)
└── docs/
```

## Prerequisites

- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)

## Backend Setup (meditriage-be)

### 1. Navigate to Backend Directory

```bash
cd code\meditriage-be
```

### 2. Create Virtual Environment

```bash
python -m venv venv
```

### 3. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables

Copy `.env.dev` to `.env` and update as needed:

```bash
copy .env.dev .env
```

Edit `.env` with your configuration:
- Database credentials
- API keys (OpenAI, etc.)
- Email settings
- Other service configurations

### 6. Run Migrations (if using Alembic)

```bash
alembic upgrade head
```

### 7. Start Backend Server

```bash
python main.py
```

The backend will be available at `http://localhost:8000`

**API Documentation:** `http://localhost:8000/docs`

## Frontend Setup (meditriage-fe)

### 1. Navigate to Frontend Directory

```bash
cd code\meditriage-fe
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (Optional)

Create `.env.local` if needed:

```
VITE_API_URL=http://localhost:8000
```

### 4. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Running Both Services

### Option 1: Separate Terminals

**Terminal 1 - Backend:**
```bash
cd code\meditriage-be
venv\Scripts\activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd code\meditriage-fe
npm run dev
```

### Option 2: Using VS Code

Open the project in VS Code and use the integrated terminal to run both commands in separate terminal sessions.

## Available Scripts

### Backend
- `python main.py` - Run development server
- `pytest` - Run tests (if configured)

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Common Issues

### Backend Issues

**ModuleNotFoundError: No module named 'app'**
- Ensure you're in the `meditriage-be` directory
- Verify virtual environment is activated
- Run `pip install -r requirements.txt` again

**Port 8000 already in use**
- Change the port in `main.py` or kill the process using port 8000

### Frontend Issues

**Cannot find module errors**
- Delete `node_modules` and run `npm install` again
- Clear npm cache: `npm cache clean --force`

**Port 5173 already in use**
- Change the port in `vite.config.js` or kill the process using port 5173

## Project Documentation

- Backend architecture: `code/meditriage-be/docs/architecture.md`
- API contracts: `code/meditriage-be/docs/api_contracts.md`
- Backend README: `code/meditriage-be/README.md`
- Frontend README: `code/meditriage-fe/README.md`

## Technology Stack

### Backend
- **Framework:** FastAPI
- **Database:** (See .env configuration)
- **ORM:** SQLAlchemy
- **Migrations:** Alembic
- **API:** RESTful with OpenAPI/Swagger

### Frontend
- **Framework:** React 18+
- **Build Tool:** Vite
- **Linting:** ESLint

## Support

For issues or questions, refer to the documentation in the `docs/` directory or check individual README files.