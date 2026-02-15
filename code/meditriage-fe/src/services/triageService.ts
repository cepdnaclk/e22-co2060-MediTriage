// Triage service — calls FastAPI /triage endpoints.

import { api } from './api';

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
    risk_score: string;
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

export interface EncounterQueueItem {
    id: string;
    patient_id: string;
    nurse_id: string;
    doctor_id: string | null;
    status: string;
    risk_score: string | null;
    chief_complaint: string | null;
    encounter_timestamp: string;
    patient_name: string;
    patient_age: number;
    patient_gender: string;
    created_at: string;
}


// Start a triage interview for an encounter
export const startInterview = async (encounterId: string): Promise<StartInterviewResponse> => {
    return api.post<StartInterviewResponse>('/triage/start', { encounter_id: encounterId });
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
export const updateEncounterUrgency = async (
    encounterId: string,
    isUrgent: boolean
) => {
    return api.patch(`/triage/${encounterId}`, { is_urgent: isUrgent });
};


// Get active triage queue
export const getQueue = async (): Promise<EncounterQueueItem[]> => {
    return api.get<EncounterQueueItem[]>('/triage/queue');
};

// Get completed history
export const getHistory = async (): Promise<EncounterQueueItem[]> => {
    return api.get<EncounterQueueItem[]>('/triage/history');
};

