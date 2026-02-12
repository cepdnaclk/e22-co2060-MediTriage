# 🏥 MediTriage Frontend

**AI-Powered Clinical Decision Support System - React Frontend**

A modern, responsive React application built with Vite, providing an intuitive interface for medical triage workflows and patient management.

---

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [Project Structure](#project-structure)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

- **🚀 Fast Development**: Vite with Hot Module Replacement (HMR)
- **⚛️ Modern React**: React 19.2 with hooks and functional components
- **🎨 Responsive Design**: Mobile-first, adaptive UI
- **🔐 Authentication**: JWT-based login system
- **👥 Role-Based UI**: Different views for Nurses, Doctors, and Admins
- **💬 Real-time Triage**: Conversational AI interface for patient assessment
- **📊 Patient Management**: Search, create, and manage patient records
- **📝 Clinical Notes**: View and edit SOAP notes
- **🎯 ESLint**: Code quality and consistency

---

## 🛠 Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | React | 19.2.0 |
| **Build Tool** | Vite | 7.2.4 |
| **Language** | JavaScript (ES6+) | Latest |
| **Linting** | ESLint | 9.39.1 |
| **Package Manager** | npm | 8.0+ |

---

## 📦 Prerequisites

Ensure you have the following installed:

### Required Software

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```
   Download: [https://nodejs.org/](https://nodejs.org/)

2. **npm 8+** (comes with Node.js)
   ```bash
   npm --version  # Should be 8.0.0 or higher
   ```

3. **Backend API Running**
   - The MediTriage backend must be running on `http://localhost:8000`
   - See backend README for setup instructions

---

## 🚀 Installation

### Step 1: Navigate to Frontend Directory

```bash
cd meditriage-fe
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React 19.2
- React DOM
- Vite build tool
- ESLint and plugins

**Expected output:**
```
added 200+ packages in 30s
```

---

## 🔧 Configuration

### Environment Variables (Optional)

Create a `.env` file in the root directory if you need to customize the API URL:

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000
```

**Default Configuration:**
- API Base URL: `http://localhost:8000`
- Frontend Port: `5173` (Vite default)

> **Note**: Vite requires environment variables to be prefixed with `VITE_` to be exposed to the client.

### Proxy Configuration (For Development)

If you're experiencing CORS issues, you can configure a proxy in `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

---

## ▶️ Running the Application

### Development Mode (Recommended)

Start the development server with hot-reload:

```bash
npm run dev
```

**Expected output:**
```
  VITE v7.2.4  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Access the application:**
- Open browser: [http://localhost:5173](http://localhost:5173)

### Preview Production Build

Build and preview the production version locally:

```bash
npm run build
npm run preview
```

### Custom Port

Run on a different port:

```bash
npm run dev -- --port 3000
```

---

## 🏗️ Building for Production

### Create Production Build

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

**Output:**
```
vite v7.2.4 building for production...
✓ 150 modules transformed.
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-abc123.css      1.25 kB │ gzip:  0.65 kB
dist/assets/index-def456.js     150.50 kB │ gzip: 48.20 kB
✓ built in 3.5s
```

### Serve Production Build Locally

```bash
npm run preview
```

### Deploy to Production

The `dist/` folder contains all the static files ready for deployment:

**Option 1: Static Hosting (Netlify, Vercel, GitHub Pages)**
```bash
# Example for Netlify
netlify deploy --prod --dir=dist
```

**Option 2: Traditional Web Server (Nginx, Apache)**
```bash
# Copy dist folder to web server root
cp -r dist/* /var/www/html/
```

**Option 3: Docker**
```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 📁 Project Structure

```
meditriage-fe/
├── public/                      # Static assets
│   └── vite.svg                # Vite logo
├── src/
│   ├── assets/                 # Images, fonts, etc.
│   ├── components/             # Reusable React components
│   ├── pages/                  # Page components
│   ├── services/               # API service layer
│   ├── utils/                  # Utility functions
│   ├── App.jsx                 # Main App component
│   ├── App.css                 # App styles
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── index.html                  # HTML template
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite configuration
├── eslint.config.js            # ESLint configuration
└── README.md                   # This file
```

---

## 🛠️ Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

### Code Linting

Run ESLint to check for code issues:

```bash
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint -- --fix
```

### Hot Module Replacement (HMR)

Vite provides instant HMR - changes to your code are reflected immediately without full page reload:

1. Edit any `.jsx` or `.css` file
2. Save the file
3. Browser updates instantly without losing state

### Adding Dependencies

**Production dependency:**
```bash
npm install axios
```

**Development dependency:**
```bash
npm install -D prettier
```

### Common Dependencies You Might Add

```bash
# HTTP Client
npm install axios

# Routing
npm install react-router-dom

# State Management
npm install zustand  # or redux, jotai, etc.

# UI Components
npm install @mui/material @emotion/react @emotion/styled

# Forms
npm install react-hook-form

# Date handling
npm install date-fns
```

---

## 🐛 Troubleshooting

### Issue: Port 5173 Already in Use

**Error**: `Port 5173 is in use, trying another one...`

**Solution 1**: Stop the process using port 5173
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill -9
```

**Solution 2**: Use a different port
```bash
npm run dev -- --port 3000
```

---

### Issue: Cannot Connect to Backend API

**Error**: `Network Error` or `CORS Policy` errors in browser console

**Checklist:**
1. **Verify backend is running:**
   ```bash
   curl http://localhost:8000/
   # Should return: {"project": "MediTriage API", "status": "running"}
   ```

2. **Check CORS settings** in backend `app/main.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173"],  # Frontend URL
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **Update API base URL** in your frontend code if needed

---

### Issue: npm install Fails

**Error**: `ERESOLVE unable to resolve dependency tree`

**Solution 1**: Clear npm cache
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Solution 2**: Use legacy peer dependencies
```bash
npm install --legacy-peer-deps
```

---

### Issue: ESLint Errors

**Error**: Multiple ESLint warnings/errors

**Solution**: Fix automatically fixable issues
```bash
npm run lint -- --fix
```

For configuration errors, check `eslint.config.js` matches your project setup.

---

### Issue: Blank White Screen

**Causes & Solutions:**

1. **Check browser console** (F12) for errors
2. **Verify backend API** is accessible
3. **Check network tab** for failed requests
4. **Clear browser cache** and hard refresh (Ctrl+Shift+R)

---

### Issue: Slow Development Server

**Solutions:**

1. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

2. **Optimize dependencies** in `vite.config.js`:
   ```javascript
   export default defineConfig({
     plugins: [react()],
     optimizeDeps: {
       include: ['react', 'react-dom']
     }
   })
   ```

---

## 🔗 Integration with Backend

### API Endpoints Used

The frontend communicates with these backend endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/login` | POST | User authentication |
| `/api/v1/auth/register` | POST | User registration |
| `/api/v1/auth/me` | GET | Get current user info |
| `/api/v1/patients` | GET/POST | Patient management |
| `/api/v1/patients/search` | GET | Search patients |
| `/api/v1/triage/start` | POST | Start triage interview |
| `/api/v1/triage/chat` | POST | Send triage messages |
| `/api/v1/triage/{id}/note` | GET/PUT | Clinical notes |

**See backend README for complete API documentation.**

### Setting Up API Connection

**Example API service file** (`src/services/api.js`):

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = {
  async login(username, password) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  },
  
  async getPatients(token) {
    const response = await fetch(`${API_BASE_URL}/api/v1/patients`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
};
```

---

## 📱 Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

---

## 🤝 Development Workflow

### Recommended Workflow

1. **Start Backend:**
   ```bash
   cd ../meditriage-be
   uvicorn app.main:app --reload
   ```

2. **Start Frontend:**
   ```bash
   cd ../meditriage-fe
   npm run dev
   ```

3. **Open Browser:**
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

4. **Make Changes:**
   - Edit React components
   - See changes instantly with HMR
   - Check browser console for errors

5. **Test:**
   - Use browser DevTools
   - Check Network tab for API calls
   - Verify authentication flows

---

## 📄 License

This project is part of the University of Peradeniya academic work.

---

## 👥 Support

For issues or questions:
- **Backend API**: See `meditriage-be/README.md`
- **Issues**: Open a GitHub issue
- **Documentation**: Check inline code comments

---

**Built with ⚛️ React + ⚡ Vite**
