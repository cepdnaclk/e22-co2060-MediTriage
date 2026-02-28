# Backend API Requests

The following backend endpoints are needed or need modifications for the new frontend architecture.

---

## Required New Endpoints

### 1. `GET /users/doctors`
**Purpose**: Nurse needs to select a doctor when assigning a patient after triage.
**Current state**: `GET /users` exists but is admin-only.
**Request**: Create a new endpoint accessible by nurses that returns a list of active doctors.
```json
// Response
[
  { "id": "uuid", "full_name": "Dr. Perera", "license_number": "LN001" },
  { "id": "uuid", "full_name": "Dr. Fernando", "license_number": "LN002" }
]
```

### 2. `PATCH /triage/{encounter_id}` — extend for doctor assignment
**Purpose**: Assign a doctor to an encounter after triage.
**Current state**: Only supports `is_urgent` field.
**Request**: Allow `doctor_id` in the request body:
```json
{ "doctor_id": "uuid" }
```

### 3. `DELETE /triage/{encounter_id}` — delete encounter record
**Purpose**: Allow deletion of a triage/encounter record from the patient detail modal.
**Current state**: Does not exist.
**Request**: Soft-delete or hard-delete an encounter and its associated clinical notes.

---

## Existing Endpoints Used (Verified Working)

| Method | Endpoint | Status |
|--------|----------|--------|
| POST | `/auth/login` | ✅ Working |
| GET | `/auth/me` | ✅ Working |
| POST | `/patients` | ✅ Working |
| GET | `/patients/search?nic=...` | ✅ Working |
| GET | `/patients/{id}` | ✅ Working |
| PUT | `/patients/{id}` | ✅ Working |
| DELETE | `/patients/{id}` | ✅ Admin only |
| GET | `/patients/{id}/history` | ✅ Working |
| POST | `/triage/start` | ✅ Working |
| POST | `/triage/chat` | ✅ Working |
| GET | `/triage/{id}/messages` | ✅ Working |
| GET | `/triage/{id}/note` | ✅ Working |
| PUT | `/triage/{id}/note` | ✅ Working |
| PATCH | `/triage/{id}` | ✅ Working (urgency only) |

---

## Removed Endpoints (Were Not Real)

| Endpoint | Note |
|----------|------|
| `GET /triage/queue` | ❌ Never existed — was returning 405 |
| `GET /triage/history` | ❌ Never existed — was returning 405 |

These were frontend service functions calling non-existent backend endpoints.
The new frontend no longer depends on them.
