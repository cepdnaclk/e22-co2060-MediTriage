# MediTriage | Frontend

**AI-Powered Emergency Triage & Clinical Decision Support System**

A role-based clinical dashboard built with **React 19**, **TypeScript**, and **Vite**, designed for hospital OPD and emergency departments. The application provides distinct workflows for **Nurses** (patient intake, AI-assisted triage interviews) and **Doctors** (clinical review, SOAP note finalization, diagnosis).

---

## Table of Contents

- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Available Scripts](#available-scripts)
- [Environment Configuration](#environment-configuration)
- [API Integration](#api-integration)
- [Troubleshooting](#troubleshooting)

---

## Technology Stack

| Category            | Technology              | Version   |
| ------------------- | ----------------------- | --------- |
| **UI Framework**    | React                   | 19.2.0    |
| **Language**        | TypeScript              | 5.8.x     |
| **Build Tool**      | Vite                    | 5.4.x     |
| **Routing**         | React Router DOM        | 7.13.x    |
| **PDF Generation**  | jsPDF                   | 2.5.1     |
| **Linting**         | ESLint                  | 9.39.x    |
| **Styling**         | Tailwind CSS (utility)  | CDN       |

---

## Prerequisites

| Requirement                  | Minimum Version |
| ---------------------------- | --------------- |
| **Node.js**                  | 18.0+           |
| **npm**                      | 8.0+            |
| **MediTriage Backend (API)** | Running on `localhost:8000` |

> The backend API must be running before launching the frontend. Refer to `meditriage-be/README.md` for backend setup.

---

## Getting Started

```bash
# 1. Navigate to the frontend directory
cd code/meditriage-fe

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## Project Structure

```
meditriage-fe/
├── public/                          # Static assets (branding, images)
│   └── assets/
│       ├── branding/                # Logo and wordmark
│       └── images/                  # Avatar and role images
├── src/
│   ├── components/
│   │   ├── doctor/                  # Doctor-specific views
│   │   │   ├── DiagnosisModal.tsx   # Clinical diagnosis and SOAP editing
│   │   │   ├── OverviewPane.tsx     # Doctor dashboard overview
│   │   │   ├── PatientsPane.tsx     # Assigned patient list
│   │   │   └── SettingsPane.tsx     # Doctor profile settings
│   │   ├── nurse/                   # Nurse-specific views
│   │   │   ├── AdmitPatientModal.tsx# Patient intake form
│   │   │   ├── AnalyzingModal.tsx   # AI processing indicator
│   │   │   ├── ChatPane.tsx         # AI triage interview chat
│   │   │   ├── NicGatekeeperModal.tsx # NIC-based patient lookup
│   │   │   ├── OverviewPane.tsx     # Nurse dashboard overview
│   │   │   ├── PatientsPane.tsx     # Patient queue management
│   │   │   ├── ReviewModal.tsx      # Triage review and SOAP preview
│   │   │   └── SettingsPane.tsx     # Nurse profile settings
│   │   ├── shared/                  # Cross-role components
│   │   │   ├── PatientDetailModal.tsx # Full patient record view
│   │   │   └── SOAPNoteModal.tsx    # Clinical note viewer
│   │   ├── ui/                      # Reusable UI primitives
│   │   │   ├── AnimatedModal.tsx    # Modal with enter/exit animations
│   │   │   ├── Button.tsx           # Standardized button component
│   │   │   ├── ConfirmModal.tsx     # Destructive action confirmation
│   │   │   ├── CustomSelect.tsx     # Styled dropdown selector
│   │   │   └── Toast.tsx            # Notification toast system
│   │   ├── Login.tsx                # Authentication screen
│   │   ├── Sidebar.tsx              # Navigation sidebar
│   │   └── TopHeader.tsx            # Top bar with search and actions
│   ├── services/                    # API communication layer
│   │   ├── api.ts                   # HTTP client, JWT interceptor, 401 handling
│   │   ├── authService.ts           # Login, logout, user profile
│   │   ├── patientService.ts        # Patient CRUD and encounter creation
│   │   └── triageService.ts         # Triage sessions, chat, clinical notes
│   ├── utils/
│   │   └── helpers.ts               # Shared utility functions
│   ├── App.tsx                      # Root component, routing, global state
│   ├── types.ts                     # TypeScript interfaces and enums
│   └── main.tsx                     # Application entry point
├── index.html                       # HTML shell with Tailwind CDN
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript compiler options
├── vite.config.ts                   # Vite build and dev-server config
└── eslint.config.js                 # ESLint rules
```

---

## Architecture Overview

### Authentication & Session Management

- JWT tokens are stored in memory via `api.ts` and attached to every outgoing request.
- A global `401` interceptor detects expired sessions and triggers a re-login modal — with a carve-out for the `/auth/login` endpoint to prevent false triggers on incorrect passwords.
- Token expiration is governed by the backend (`ACCESS_TOKEN_EXPIRE_MINUTES`).

### Role-Based Routing

| Role       | Base Routes                              | Key Capabilities                                      |
| ---------- | ---------------------------------------- | ----------------------------------------------------- |
| **Nurse**  | `/overview`, `/patients`, `/settings`, `/chat` | Patient admission, AI triage interview, queue management |
| **Doctor** | `/overview`, `/patients`, `/settings`    | Patient review, SOAP note editing, diagnosis finalization |

### State Management

- Global patient case state (`PatientCase[]`) is managed in `App.tsx` and passed to child components via props and callbacks.
- A **10-second polling interval** keeps the patient list synchronized with the backend.
- Background enrichment automatically calculates and caches patient ages from dates of birth.

### Component Hierarchy

```
App.tsx
├── Login.tsx                    (unauthenticated)
├── Sidebar.tsx + TopHeader.tsx  (authenticated shell)
├── Nurse Views
│   ├── OverviewPane  →  PatientDetailModal
│   ├── PatientsPane  →  PatientDetailModal
│   ├── ChatPane      →  ReviewModal → AnalyzingModal
│   └── SettingsPane
└── Doctor Views
    ├── OverviewPane   →  PatientDetailModal / DiagnosisModal
    ├── PatientsPane   →  PatientDetailModal / DiagnosisModal
    └── SettingsPane
```

---

## Available Scripts

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Start Vite dev server on port `3000` with HMR  |
| `npm run build`     | Create optimized production build in `dist/`    |
| `npm run preview`   | Serve the production build locally              |
| `npm run lint`      | Run ESLint across the codebase                  |

---

## Environment Configuration

### Vite Dev Server

The development server is preconfigured in `vite.config.ts`:

```typescript
export default defineConfig({
    server: {
        port: 3000,
        host: '0.0.0.0',
    },
    // ...
});
```

### API Base URL

The API base URL is set in `src/services/api.ts`. By default it points to:

```
http://localhost:8000/api/v1
```

Update this value if the backend runs on a different host or port.

### Path Aliases

The `@/` alias resolves to `./src/`, configured in both `tsconfig.json` and `vite.config.ts`:

```typescript
import { SomeComponent } from '@/components/ui/Button';
```

---

## API Integration

The frontend communicates with the MediTriage backend through four service modules:

### `authService.ts` — Authentication

| Method              | Endpoint           | Purpose                        |
| ------------------- | ------------------ | ------------------------------ |
| `login()`           | `POST /auth/login` | Authenticate and receive JWT   |
| `getCurrentUser()`  | `GET /auth/me`     | Fetch authenticated user profile |
| `updateUserProfile()` | `PATCH /users/:id` | Update display name          |

### `patientService.ts` — Patient Management

| Method              | Endpoint                       | Purpose                          |
| ------------------- | ------------------------------ | -------------------------------- |
| `searchByNIC()`     | `GET /patients/search?nic=`    | Lookup patient by National ID    |
| `createPatient()`   | `POST /patients`               | Register a new patient           |
| `getPatient()`      | `GET /patients/:id`            | Fetch full patient record        |
| `createEncounter()` | `POST /patients/:id/encounters`| Open a new medical encounter     |
| `getPatientHistory()` | `GET /patients/:id/encounters` | Fetch visit history            |

### `triageService.ts` — AI Triage & Clinical Notes

| Method              | Endpoint                            | Purpose                              |
| ------------------- | ----------------------------------- | ------------------------------------ |
| `listEncounters()`  | `GET /triage/encounters`            | List all active encounters           |
| `startInterview()`  | `POST /triage/:id/start`            | Begin AI-assisted triage session     |
| `sendMessage()`     | `POST /triage/:id/chat`             | Send a message in triage interview   |
| `getClinicalNote()` | `GET /triage/:id/note`              | Retrieve SOAP note for an encounter  |
| `updateClinicalNote()` | `PUT /triage/:id/note`           | Doctor edits and finalizes SOAP note |
| `listDoctors()`     | `GET /users/doctors`                | Fetch active doctors for assignment  |
| `assignDoctor()`    | `PATCH /triage/encounters/:id`      | Assign a doctor to an encounter      |

---

## Troubleshooting

### Port 3000 Already in Use

```powershell
# Find the process
netstat -ano | findstr :3000

# Kill by PID
taskkill /PID <PID> /F
```

Or start on a different port:
```bash
npm run dev -- --port 3001
```

### Cannot Connect to Backend API

1. Confirm the backend is running:
   ```bash
   curl http://localhost:8000/
   # Expected: {"project": "MediTriage API", "status": "running"}
   ```
2. Verify CORS is configured in the backend (`app/main.py`).
3. Check the API base URL in `src/services/api.ts`.

### Dependency Installation Fails

```bash
# Clear cache and reinstall
npm cache clean --force
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

### Blank Screen After Login

1. Open browser DevTools (F12) → Console tab for errors.
2. Check the Network tab for failed API requests (red entries).
3. Hard refresh with `Ctrl + Shift + R`.

---

## License

This project is developed as part of the **CO2060 - Software Systems Design Project** at the **University of Peradeniya**, Faculty of Engineering.

---

**Built with React + TypeScript + Vite**
