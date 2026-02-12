Medi-Triage: API & Service Layer Architecture

Project: Medi-Triage (RoboZen404)
Architectural Style: Modular Monolith with Service-Repository Pattern
Frameworks: FastAPI, SQLModel, LangChain

1. Domain: User & Authentication

Separation of Identity (Auth) from Profile (User) to support future RBAC & Multi-provider login.

A. API Endpoints (app/api/v1/endpoints/auth.py & users.py)

Method

Endpoint

Request Schema

Response Schema

Required Role

Responsibility

POST

/auth/login

UserLoginRequest

TokenResponse

Public

Authenticates credentials & issues JWT.

POST

/auth/register

UserRegisterRequest

UserResponse

Public (MVP)

Atomic Transaction: Creates Auth & User.

GET

/auth/me

-

UserResponse

Any Auth User

Returns the active user's profile.

PATCH

/auth/me

UserProfileUpdate

UserResponse

Any Auth User

Update own profile (Name, License, etc.).

GET

/users

?skip=0&limit=10

List[UserResponse]

Admin

List all staff members (for Admin Dashboard).

DELETE

/users/{id}

-

{status: bool}

Admin

Soft Delete: Deactivates a staff account.

B. Service Layer (app/services/auth_service.py)

Core Logic:

register_user(data, db):

Check for existing username or email (Reference Auth model).

Hash password using security.hash_password(data.password).

Transaction: Create Auth (Identity) + User (Profile).

Return the User object (joined with Auth info).

authenticate_user(username, password, db):

Fetch Auth record by username.

Verify credentials using security.verify_password.

Return User object if valid, else None.

Security Utilities (app/core/security.py):

Hashing: Uses passlib with bcrypt.

Tokens: Uses python-jose to generate JWTs with expiration (ACCESS_TOKEN_EXPIRE_MINUTES) and payload {"sub": user_id, "role": role}.

2. Domain: Patient Management

Focused on Identity and Demographics. Clinical data is strictly linked via Encounters, not stored directly here.

A. API Endpoints (app/api/v1/endpoints/patients.py)

Method

Endpoint

Request Body

Response

Required Role

Responsibility

POST

/patients

{ first_name, ... }

{ PatientSchema }

Nurse, Admin

Registers a new patient. Checks for duplicate NIC.

GET

/patients/search

?nic=...

[PatientSchema]

Nurse, Doctor

Search for patient before Triage/Consultation.

GET

/patients/{id}

-

{ PatientSchema }

Nurse, Doctor

Get specific patient details (Demographics).

PUT

/patients/{id}

{ contact_num... }

{ PatientSchema }

Nurse, Admin

Update patient details (e.g., Phone number).

DELETE

/patients/{id}

-

{ success: bool }

Admin

Soft Delete: Mark patient record as inactive.

GET

/patients/{id}/history

-

[EncounterSum]

Nurse, Doctor

Returns past triage dates and chief complaints.

B. Service Layer (app/services/patient_service.py)

Core Logic:

Duplicate Check: Before creating, query repo to see if national_id (NIC) exists. Raise 409 Conflict if true.

Search Algorithm:

If nic provided: Exact match (High precision).

If name provided: ILIKE partial match (High recall).

3. Domain: Clinical & Triage (The Core Engine)

Manages the specific Medical Encounter, the Chat Loop, and the SOAP Note generation.

A. API Endpoints (app/api/v1/endpoints/triage.py)

Method

Endpoint

Request Body

Response

Required Role

Responsibility

POST

/triage/start

{ patient_id }

{ encounter_id }

Nurse

Initializes MedicalEncounter. Returns AI greeting.

POST

/triage/chat

{ encounter_id, text }

{ ai_text }

Nurse

The Main Loop: Sends text to AI, gets next question.

GET

/triage/{id}/messages

-

[MessageSchema]

Nurse, Doctor

Chat History: Reloads the full chat log (e.g., on refresh).

PATCH

/triage/{id}

{ is_urgent: bool }

{ status }

Nurse

Manual Toggle: Nurse flags urgency.

POST

/triage/{id}/end

-

{ ClinicalNote }

Nurse

Ends chat. Triggers AI Summarization (SOAP).

GET

/triage/{id}/note

-

{ ClinicalNote }

Nurse, Doctor

Fetches the generated note.

PUT

/triage/{id}/note

{ subjective, ... }

{ ClinicalNote }

Doctor ONLY

Finalization: Doctor edits/approves the AI draft.

B. Service Layer (app/services/triage_engine.py)

This service acts as the Orchestrator between the Database and the AI Pipeline.

The process_message(encounter_id, text) Workflow:

Validation: Check if MedicalEncounter exists and status == IN_PROGRESS.

Save User Message: Call EncounterRepo to save TriageInteraction(sender=PATIENT/NURSE).

Fetch Context: Retrieve last 10 messages from EncounterRepo for context window.

AI Pipeline Execution (The "Brain"):

Call 1 (Scrubber): Pass text to app/services/llm/scrubber.py (Local LLM) $\to$ Get Redacted Text.

Call 2 (Reasoning): Pass Redacted Text + History to app/services/llm/pipeline.py.

Save AI Response: Call EncounterRepo to save TriageInteraction(sender=AI).

Return: The AI's text response to the controller.

The update_urgency(encounter_id, is_urgent) Workflow:

Fetch Encounter: Check if ID exists.

Update: Set encounter.is_urgent = is_urgent.

Commit: Save to DB and return updated status.

The finalize_interview(encounter_id) Workflow:

Fetch Full History: Get all TriageInteraction rows for this ID.

AI Summarization: Pass history to LLMPipeline.generate_soap_note().

Constraint: Uses strict Pydantic parsing to ensure JSON output.

Save Draft: Create ClinicalNote record with is_finalized=False.

Update Encounter: Set status = AWAITING_REVIEW.

4. Security & RBAC Implementation

To enforce the roles defined above, implement a Role Checker in app/api/dependencies.py.

The Role Checker Pattern

class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_active_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(status_code=403, detail="Not authorized")
        return user

# Usage in Endpoints:
allow_nurses = RoleChecker([UserRole.NURSE])
allow_doctors = RoleChecker([UserRole.DOCTOR])
allow_staff = RoleChecker([UserRole.NURSE, UserRole.DOCTOR])


Applying it to Routes

Triage Chat: Depends(allow_nurses)

Finalize Note: Depends(allow_doctors)

Search Patient: Depends(allow_staff)

Delete User: Depends(RoleChecker([UserRole.ADMIN]))

5. Data Flow Visualization

sequenceDiagram
    participant Nurse as Nurse UI
    participant API as FastAPI Controller
    participant Service as TriageService
    participant DB as Postgres (Repo)
    participant AI as AI Pipeline (Local->Cloud)

    Nurse->>API: POST /chat (text="Headache for 3 days")
    Note over API: RBAC Check: Is Role == NURSE?
    API->>Service: process_message(id, text)
    
    rect rgb(240, 248, 255)
        note right of Service: 1. Persistence
        Service->>DB: Save "Headache..." (Sender=Patient)
        Service->>DB: Fetch Chat History
    end
    
    rect rgb(255, 240, 245)
        note right of Service: 2. AI Logic (No Urgency Check)
        Service->>AI: Scrubber.clean(text)
        AI-->>Service: "[REDACTED]"
        Service->>AI: Provider.get_next_question(history)
        AI-->>Service: "Is the pain throbbing or dull?"
    end

    rect rgb(240, 248, 255)
        note right of Service: 3. Response
        Service->>DB: Save "Is the pain..." (Sender=AI)
    end
    
    Service-->>API: Return Response
    API-->>Nurse: Display AI Question
