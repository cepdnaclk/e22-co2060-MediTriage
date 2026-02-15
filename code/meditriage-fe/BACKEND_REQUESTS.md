# Backend Implementation Guide for Frontend Compatibility

This document provides the **exact implementation details** required to update the backend for the MediTriage Frontend.

## API Changes Summary

| Endpoint Route | Method | Change Type | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/triage/queue` | `GET` | **NEW** | Returns active encounters for the Nurse Dashboard. |
| `/api/v1/triage/history` | `GET` | **NEW** | Returns completed triage history for the Nurse Dashboard. |
| `/api/v1/patients/{patient_id}/encounters` | `POST` | **NEW** | Creates a new triage encounter for a specific patient. |

## Data Model & Schema Mappings

### 1. Table: `patients`
| Frontend Field (React) | Backend Column (SQL) | Status | Notes / Action |
| :--- | :--- | :--- | :--- |
| `id` (String) | `id` (UUID) | ✅ Exists | Frontend handles ID extraction. |
| `name` (Full Name) | `first_name`, `last_name` | ⚠️ Minor Change | **Update API**: Return combined `name` string. |
| `age` (Number) | `date_of_birth` (Date) | ⚠️ Minor Change | **Update API**: Return calculated `age`. |
| `gender` | *None* | ❌ Missing | **Add `gender` column** (Enum/String). |
| *None* | `national_id` (NIC) | ✅ Exists (Not Needed) | Frontend does not use this field. |
| *None* | `contact_number` | ✅ Exists (Not Needed) | Frontend does not use this field. |
| *None* | `created_at` | ✅ Exists (Not Needed) | Audit timestamp. |
| *None* | `updated_at` | ✅ Exists (Not Needed) | Audit timestamp. |

### 2. Table: `medical_encounters`
| Frontend Field (React) | Backend Column (SQL) | Status | Notes / Action |
| :--- | :--- | :--- | :--- |
| `id` (Case ID) | `id` (UUID) | ✅ Exists | Frontend handles display. |
| `patientName` | `patient_id` (Rel) | ✅ Exists | Joined via `patients` table. |
| `status` (WAITING) | `status` (TRIAGE_IN_PROGRESS) | ⚠️ Minor Change | **Map/Rename Enum**: `TRIAGE_IN_PROGRESS` -> `WAITING`. |
| `status` (URGENT) | `status` (AWAITING_REVIEW) | ⚠️ Minor Change | **Map/Rename Enum**: `AWAITING_REVIEW` -> `URGENT`. |
| `status` (TREATED) | `status` (COMPLETED) | ⚠️ Minor Change | **Map/Rename Enum**: `COMPLETED` -> `TREATED`. |
| `status` (REMOVED) | *None* | ❌ Missing | **Add Enum Value**: `REMOVED`. |
| `urgency` (Color) | `risk_score` (H/M/L) | ✅ Exists | Frontend maps `risk_score` to CSS Colors. |
| `chiefComplaint` | `chief_complaint` | ⚠️ Minor Change | **Rename Field**: Return as `camelCase` within API. |
| `startTime` | `encounter_timestamp` | ⚠️ Minor Change | **Rename Field**: Return as `startTime`. |
| `nurseId` | `nurse_id` | ✅ Exists | |
| *None* | `doctor_id` | ✅ Exists (Not Needed) | Frontend does not use Doctor assignment yet. |
| *None* | `created_at` | ✅ Exists (Not Needed) | Audit timestamp. |
| *None* | `updated_at` | ✅ Exists (Not Needed) | Audit timestamp. |

### 3. Table: `clinical_notes`
| Frontend Field (React) | Backend Column (SQL) | Status | Notes / Action |
| :--- | :--- | :--- | :--- |
| `id` | `id` (UUID) | ✅ Exists (Not Needed) | Internal ID. |
| `encounterId` | `encounter_id` (UUID) | ✅ Exists | Link to Encounter. |
| `subjective` | `subjective` (Text) | ✅ Exists | Matches perfectly. |
| `objective` | `objective` (Text) | ✅ Exists | Matches perfectly. |
| `assessment` | `assessment` (Text) | ✅ Exists | Matches perfectly. |
| `plan` | `plan` (Text) | ✅ Exists | Matches perfectly. |
| `isFinalized` | `is_finalized` (Bool) | ⚠️ Minor Change | **Rename Field**: Return as `camelCase`. |
| *None* | `version` | ✅ Exists (Not Needed) | Internal versioning. |
| *None* | `created_at` | ✅ Exists (Not Needed) | Audit timestamp. |
| *None* | `updated_at` | ✅ Exists (Not Needed) | Audit timestamp. |

### 4. Table: `triage_interactions`
| Frontend Field (React) | Backend Column (SQL) | Status | Notes / Action |
| :--- | :--- | :--- | :--- |
| `id` | `id` (UUID) | ✅ Exists | Message ID. |
| `encounterId` | `encounter_id` | ✅ Exists | Link to Encounter. |
| `role` (`user`) | `sender_type` (PATIENT/NURSE) | ⚠️ Minor Change | **Map Value**: Return `user`. |
| `role` (`model`) | `sender_type` (AI) | ⚠️ Minor Change | **Map Value**: Return `model`. |
| `text` | `message_content` | ⚠️ Minor Change | **Rename Field**: Return as `text`. |
| `timestamp` | `timestamp` | ✅ Exists | Matches perfectly. |
| *None* | `audio_url` | ✅ Exists (Not Needed) | Future proofing. |
| *None* | `transcription_confidence` | ✅ Exists (Not Needed) | Future proofing. |
| *None* | `created_at` | ✅ Exists (Not Needed) | Audit timestamp. |

### 5. Table: `users` (Staff)
| Frontend Field (React) | Backend Column (SQL) | Status | Notes / Action |
| :--- | :--- | :--- | :--- |
| `id` | `id` (UUID) | ✅ Exists | Staff ID. |
| `role` | `role` (Enum) | ✅ Exists | Matches (`NURSE`, `DOCTOR`). |
| `name` | `full_name` | ⚠️ Minor Change | **Rename Field**: Return as `name`. |
| `license_number` | `license_number` | ✅ Exists (Not Needed) | Not rendered in UI. |
| *None* | `created_at` | ✅ Exists (Not Needed) | Audit. |
| *None* | `updated_at` | ✅ Exists (Not Needed) | Audit. |

---

## 1. `app/api/v1/endpoints/triage.py`

**Purpose**: Adds endpoints to fetch the "Active Queue" and "Triage History" for the Nurse Dashboard.

**Changes required**:
1.  **Add Imports**:
    ```python
    from datetime import date
    from app.schemas.clinical import EncounterResponse
    from app.schemas.clinical import ClinicalNoteResponse
    from app.schemas.clinical import EncounterQueueItem
    from app.models.clinical import EncounterStatus
    from datetime import date
    ```

2.  **Add Endpoints**:
    ```python
    @router.get("/queue", response_model=List[EncounterQueueItem])
    def get_active_queue(
        db: Session = Depends(get_db),
        current_user: User = Depends(allow_nurse),
    ):
        """
        Get active triage queue (TRIAGE_IN_PROGRESS, AWAITING_REVIEW).
        Populates the dashboard 'Active Queue'.
        """
        try:
            encounters = encounter_service.get_encounters_by_status(
                [EncounterStatus.TRIAGE_IN_PROGRESS, EncounterStatus.AWAITING_REVIEW], db
            )
            
            # Map to schema with calculated fields
            results = []
            for enc in encounters:
                age = 0
                if enc.patient and enc.patient.date_of_birth:
                    age = (date.today() - enc.patient.date_of_birth).days // 365
                
                item = EncounterQueueItem(
                    id=enc.id,
                    patient_id=enc.patient_id,
                    nurse_id=enc.nurse_id,
                    doctor_id=enc.doctor_id,
                    status=enc.status,
                    risk_score=enc.risk_score,
                    chief_complaint=enc.chief_complaint,
                    encounter_timestamp=enc.encounter_timestamp,
                    created_at=enc.created_at,
                    updated_at=enc.updated_at,
                    patient_name=f"{enc.patient.first_name} {enc.patient.last_name}",
                    patient_age=age,
                    patient_gender="Unknown"
                )
                results.append(item)
                
            return results
        except Exception as e:
            logger.error(f"Failed to fetch queue: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch active queue"
            )


    @router.get("/history", response_model=List[EncounterQueueItem])
    def get_triage_history(
        db: Session = Depends(get_db),
        current_user: User = Depends(allow_nurse),
    ):
        """
        Get completed triage history.
        Populates the dashboard 'History'.
        """
        try:
            encounters = encounter_service.get_encounters_by_status(
                [EncounterStatus.COMPLETED], db
            )
            
            results = []
            for enc in encounters:
                age = 0
                if enc.patient and enc.patient.date_of_birth:
                    age = (date.today() - enc.patient.date_of_birth).days // 365
                
                item = EncounterQueueItem(
                    id=enc.id,
                    patient_id=enc.patient_id,
                    nurse_id=enc.nurse_id,
                    doctor_id=enc.doctor_id,
                    status=enc.status,
                    risk_score=enc.risk_score,
                    chief_complaint=enc.chief_complaint,
                    encounter_timestamp=enc.encounter_timestamp,
                    created_at=enc.created_at,
                    updated_at=enc.updated_at,
                    patient_name=f"{enc.patient.first_name} {enc.patient.last_name}",
                    patient_age=age,
                    patient_gender="Unknown"
                )
                results.append(item)
                
            return results
        except Exception as e:
            logger.error(f"Failed to fetch history: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch history"
            )
    ```

---

## 2. `app/api/v1/endpoints/patients.py`

**Purpose**: Adds an endpoint to create a triage encounter for a specific patient.

**Changes required**:
1.  **Add Imports**:
    ```python
    from app.schemas.clinical import EncounterCreate, EncounterResponse
    from app.services import encounter_service
    ```

2.  **Add Endpoint**:
    ```python
    @router.post("/{patient_id}/encounters", response_model=EncounterResponse, status_code=status.HTTP_201_CREATED)
    def create_patient_encounter(
        patient_id: UUID,
        data: EncounterCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(allow_nurse_admin),
    ):
        """
        Create a new medical encounter for a patient.
        
        **Required Role**: Nurse or Admin
        """
        logger.info(f"Creating encounter for patient: id={patient_id}, user={current_user.full_name}")
        
        # Verify patient exists
        patient = patient_service.get_patient_by_id(patient_id, db)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
            
        encounter = encounter_service.create_encounter(
            patient_id=patient_id,
            nurse_id=current_user.id,
            chief_complaint=data.chief_complaint,
            db=db
        )
        return encounter
    ```

---

## 3. `app/schemas/clinical.py`

**Purpose**: Adds the data model for the Dashboard Queue, including derived fields like `patient_name`.

**Changes required**:
1.  **Add Class**:
    ```python
    class EncounterQueueItem(EncounterResponse):
        """
        Encounter details + Patient demographics for the Dashboard Queue.
        """
        patient_name: str
        patient_age: int
        patient_gender: str = "Unknown" # Default since we don't store it yet

        class Config:
            from_attributes = True
    ```

---

## 4. `app/services/encounter_service.py`

**Purpose**: Business logic to query filtered encounters and create new ones.

**Changes required**:

1.  **Add Methods**:
    ```python
    def get_encounters_by_status(
        statuses: List[EncounterStatus],
        db: Session,
        limit: int = 50
    ) -> List[MedicalEncounter]:
        """
        Get encounters filtered by status list.
        Used for Active Queue (TRIAGE_IN_PROGRESS, AWAITING_REVIEW)
        and History (COMPLETED).
        """
        return db.query(MedicalEncounter).filter(
            MedicalEncounter.status.in_(statuses)
        ).order_by(MedicalEncounter.updated_at.desc()).limit(limit).all()
    ```

---

## 5. `app/services/triage_engine.py`

**Purpose**: Fixes a bug where the Chat History context duplicated the user's latest message.

**Changes required**:
1.  **Locate method**: `process_message`
2.  **Modify the `chat_history` construction line**:
    ```python
    # ORIGINAL Code:
    # chat_history = _build_chat_history(interactions)

    # REPLACEMENT Code:
    # Exclude the current patient interaction from history (passed separately to pipeline)
    # interactions[:-1] because the last one is the patient_interaction we just added
    chat_history = _build_chat_history(interactions[:-1])
    ```

---

## 6. `app/services/llm/parser.py`(Optional)

**Purpose**: 
1. Prevents "500 Internal Server Error" when the LLM returns structured data.[This may not be encountered when using powerfull models. So take this as optional]
2. Makes the interview completion check more robust against LLM output variations (e.g. "**Interview Complete**").

**Changes required**:

1.  **Locate method**: `parse_interview_response`
2.  **Update logic (Copy/Paste this code)**:
    ```python
    def parse_interview_response(self, raw_response: str) -> InterviewResponse:
        """
        Parse a triage interview response.
        Detects if the interview is complete or returns the next question.
        """
        cleaned = raw_response.strip()

        # Check for interview completion signal (robust check)
        # The model might output **Interview Complete:** or similar
        if INTERVIEW_COMPLETE_SIGNAL in cleaned or "Interview Complete" in cleaned:
            # Clean up artifacts if they are at the end
            message = cleaned.replace(INTERVIEW_COMPLETE_SIGNAL, "").replace("**Interview Complete:**", "").strip()
            # If the message is just the completion signal, return empty message
            if not message or len(message) < 5:
                 message = "The interview is now complete. Generating clinical summary..."
            
            return InterviewResponse(
                 message=message,
                 is_complete=True
            )

        return InterviewResponse(
            message=cleaned,
            is_complete=False
        )
    ```

3.  **Locate method**: `parse_soap_note`
4.  **Add helper function inside `parse_soap_note`**:
    ```python
        # ... inside parse_soap_note ...
        
        # Helper to sanitize fields that might be dicts/lists
        def sanitize_field(val):
            if isinstance(val, (dict, list)):
                try:
                    if isinstance(val, dict):
                        parts = []
                        for k, v in val.items():
                            formatted_k = k.replace("_", " ").title()
                            val_str = ", ".join(str(i) for i in v) if isinstance(v, list) else str(v)
                            parts.append(f"{formatted_k}: {val_str}")
                        return "\n".join(parts)
                    else:
                        return "\n".join(f"- {str(item)}" for item in val)
                except Exception as e:
                    logger.warning(f"Failed to format field: {e}")
                    return str(val)
            return str(val) if val is not None else ""

        # Usage: Use sanitize_field() when creating the SOAPNote object
        return SOAPNote(
            subjective=sanitize_field(data.get("subjective")),
            objective=sanitize_field(data.get("objective")),
            assessment=sanitize_field(data.get("assessment")),
            plan=sanitize_field(data.get("plan")),
            risk_score=risk
        )
    ```

---

## 7. `app/services/llm/scrubber.py`(Optional)

**Purpose**: Switches PII scrubbing to Regex-only mode to prevent the LLM from redacting medical terms (e.g., "[SYMPTOM_REDACTED]").[This may not be encountered when using powerfull models. So take this as optional]

**Changes required**:
1.  **Locate method**: `scrub`
2.  **Update implementation**:
    ```python
    async def scrub(self, text: str) -> str:
        """
        Remove PII from the given text.
        """
        # FORCE REGEX for now because phi3/local models are over-scrubbing medical terms
        # if self._ollama_available:
        #     return await self._scrub_with_llm(text)
        return self._scrub_with_regex(text)
    ```

---

## 8. `app/services/llm/prompts.py`(Optional)

**Purpose**: Updates system prompts for better SOAP generation and PII handling.[This is to be implemented - model instructions(depend on the model)]

**Changes required**:
1.  **Add/Update these constants at the top of the file**:
    ```python
    # =============================================================================
    # TRIAGE INTERVIEW PROMPT
    # =============================================================================
    # Used during the interview phase. The AI asks one question at a time
    # using the OLDCARTS methodology until sufficient history is gathered.

    TRIAGE_INTERVIEW_SYSTEM_PROMPT = """You are a professional triage nurse AI.
    Patient: {age} year old {gender}. Complaint: "{chief_complaint}".

    Your Job:
    - Ask ONE follow-up question at a time to understand the symptoms (OLDCARTS).
    - Be concise, empathetic, and professional.
    - If you see [NAME_REDACTED] or [NIC_REDACTED], ignore the tag and continue naturally. DO NOT mention privacy or redaction.
    - DO NOT diagnose.

    Output Rules:
    - Output ONLY your question.
    - DO NOT use headers (e.g., "Instruction:", "Question:").
    - When finished, say ONLY: [INTERVIEW_COMPLETE]
    """
    ```


