# Frontend API Requirements

> Extracted from `meditriage-fe/BACKEND_REQUESTS.md`. This document describes **what** the frontend needs — new endpoints, response shapes, and entity changes. Implementation details are omitted.

---

## New API Endpoints

### 1. `GET /api/v1/triage/queue`
Returns the **active triage queue** for the Nurse Dashboard.

- **Auth**: Nurse role required
- **Response**: `List[EncounterQueueItem]`

```json
[
  {
    "id": "uuid",
    "patient_id": "uuid",
    "nurse_id": "uuid",
    "doctor_id": "uuid | null",
    "status": "WAITING | URGENT",
    "risk_score": "H | M | L",
    "chief_complaint": "string",
    "start_time": "datetime",
    "patient_name": "string",
    "patient_age": 34,
    "patient_gender": "string"
  }
]
```

- **Filters internally**: `TRIAGE_IN_PROGRESS` + `AWAITING_REVIEW` encounters
- **Ordering**: Latest updated first

---

### 2. `GET /api/v1/triage/history`
Returns **completed triage encounters** for the Nurse Dashboard history tab.

- **Auth**: Nurse role required
- **Response**: `List[EncounterQueueItem]` *(same shape as `/queue`)*
- **Filters internally**: `COMPLETED` encounters

---

### 3. `POST /api/v1/patients/{patient_id}/encounters`
Creates a **new triage encounter** for a given patient.

- **Auth**: Nurse or Admin role required
- **Path param**: `patient_id` (UUID)
- **Request Body**:

```json
{
  "chief_complaint": "string"
}
```

- **Response**: `EncounterResponse` (HTTP 201)
- **Behaviour**: Validates patient exists; links encounter to the calling nurse's ID

---

## Entity & Schema Changes

### `patients` Table

| Field | Change |
|---|---|
| `gender` | **Add column** — Enum or String (e.g., `Male`, `Female`, `Other`) |
| `name` | **API output**: Return computed `name` = `first_name + " " + last_name` |
| `age` | **API output**: Return computed `age` derived from `date_of_birth` |

---

### `medical_encounters` Table

| Field | Change |
|---|---|
| `status` enum | **Rename/map values** in API response: `TRIAGE_IN_PROGRESS` → `WAITING` · `AWAITING_REVIEW` → `URGENT` · `COMPLETED` → `TREATED` |
| `status` enum | **Add new value**: `REMOVED` |
| `chief_complaint` | **API output field name**: Return as `chiefComplaint` (camelCase) |
| `encounter_timestamp` | **API output field name**: Return as `startTime` |

---

### `clinical_notes` Table

| Field | Change |
|---|---|
| `is_finalized` | **API output field name**: Return as `isFinalized` (camelCase) |

---

### `triage_interactions` Table

| Field | Change |
|---|---|
| `sender_type` | **Map values** in API output: `PATIENT` / `NURSE` → `user` · `AI` → `model` |
| `message_content` | **API output field name**: Return as `text` |

---

### `users` (Staff) Table

| Field | Change |
|---|---|
| `full_name` | **API output field name**: Return as `name` |

---

## New Response Schema: `EncounterQueueItem`

Extends the base `EncounterResponse` with three extra fields:

| Field | Type | Notes |
|---|---|---|
| `patient_name` | `string` | Derived: `first_name + last_name` |
| `patient_age` | `integer` | Derived from `date_of_birth` |
| `patient_gender` | `string` | From new `patients.gender` column; default `"Unknown"` |
