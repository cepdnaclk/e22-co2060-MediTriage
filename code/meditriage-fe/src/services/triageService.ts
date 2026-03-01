import { api } from './api';

// Doctor option for dropdowns
export interface DoctorOption {
    id: string;
    full_name: string;
    license_number: string | null;
}

export const getDoctors = async (): Promise<DoctorOption[]> => {
    return api.get<DoctorOption[]>('/users/doctors');
};

// Backend response types (matching FastAPI schemas)
interface StartInterviewResponse {
    encounter_id: string;
    ai_message: string;
    status: string;
}

interface SOAPNoteSchema {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}

interface ChatMessageResponse {
    ai_message: string;
    is_interview_complete: boolean;
    soap_note: SOAPNoteSchema | null;
}

interface MessageResponse {
    id: string;
    encounter_id: string;
    sender_type: string;
    message_content: string;
    timestamp: string;
}

interface ClinicalNoteResponse {
    id: string;
    encounter_id: string;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
    is_finalized: boolean;
    version: number;
    created_at: string;
    updated_at: string;
}

// Start a triage interview for a patient
export const startInterview = async (patientId: string, chiefComplaint?: string): Promise<StartInterviewResponse> => {
    return api.post<StartInterviewResponse>('/triage/start', {
        patient_id: patientId,
        chief_complaint: chiefComplaint,
    });
};

// Send a chat message during triage interview
export const sendMessage = async (encounterId: string, message: string): Promise<ChatMessageResponse> => {
    return api.post<ChatMessageResponse>('/triage/chat', { encounter_id: encounterId, message });
};

// Get full chat history for an encounter
export const getMessages = async (encounterId: string): Promise<MessageResponse[]> => {
    return api.get<MessageResponse[]>(`/triage/${encounterId}/messages`);
};

// Get clinical note (SOAP) for an encounter
export const getClinicalNote = async (encounterId: string): Promise<ClinicalNoteResponse> => {
    return api.get<ClinicalNoteResponse>(`/triage/${encounterId}/note`);
};

// Update/finalize clinical note (Doctor only)
export const updateClinicalNote = async (
    encounterId: string,
    data: {
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
        is_finalized?: boolean;
    }
): Promise<ClinicalNoteResponse> => {
    return api.put<ClinicalNoteResponse>(`/triage/${encounterId}/note`, data);
};

// Update encounter urgency (Nurse)
export const updateEncounterUrgency = async (encounterId: string, isUrgent: boolean) => {
    return api.patch(`/triage/${encounterId}`, { is_urgent: isUrgent });
};

// Update encounter (doctor id/name, status, urgency, notes)
export const updateEncounter = async (encounterId: string, data: {
    doctor_id?: string;
    doctor_name?: string;
    status?: string;
    is_urgent?: boolean;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
}) => {
    return api.patch(`/triage/${encounterId}`, data);
};

// Encounter list item from dashboard endpoint
export interface EncounterListItem {
    id: string;
    patient_id: string;
    patient_name: string;
    patient_gender: string | null;
    patient_age: string | null;
    chief_complaint: string | null;
    status: string;
    doctor_id: string | null;
    doctor_name: string | null;
    encounter_timestamp: string;
}

// List all encounters with patient info (for dashboard)
export const listEncounters = async (): Promise<EncounterListItem[]> => {
    return api.get<EncounterListItem[]>('/triage/encounters');
};
