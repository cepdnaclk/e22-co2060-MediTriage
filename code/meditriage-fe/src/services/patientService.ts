// Patient service — calls FastAPI /patients endpoints.

import { api } from './api';

// Backend response types (matching FastAPI schemas)
export interface PatientResponse {
    id: string;
    national_id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string | null;
    contact_number: string | null;
    created_at: string;
    updated_at: string;
}

export interface EncounterSummary {
    id: string;
    encounter_timestamp: string;
    chief_complaint: string | null;
    status: string;
    is_urgent: boolean;
    nurse_name: string;
    doctor_name: string | null;
}

// Create a new patient
export const createPatient = async (data: {
    national_id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender?: string;
    contact_number?: string;
}): Promise<PatientResponse> => {
    return api.post<PatientResponse>('/patients', data);
};

// Search patients by NIC or name
export const searchPatients = async (params: {
    nic?: string;
    name?: string;
}): Promise<PatientResponse[]> => {
    const queryParts: string[] = [];
    if (params.nic) queryParts.push(`nic=${encodeURIComponent(params.nic)}`);
    if (params.name) queryParts.push(`name=${encodeURIComponent(params.name)}`);
    const query = queryParts.length ? `?${queryParts.join('&')}` : '';
    return api.get<PatientResponse[]>(`/patients/search${query}`);
};

// Get patient by ID
export const getPatient = async (patientId: string): Promise<PatientResponse> => {
    return api.get<PatientResponse>(`/patients/${patientId}`);
};

// Update patient
export const updatePatient = async (patientId: string, data: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    gender?: string;
    contact_number?: string;
}): Promise<PatientResponse> => {
    return api.put<PatientResponse>(`/patients/${patientId}`, data);
};

// Delete patient
export const deletePatient = async (patientId: string): Promise<{ success: boolean; id: string }> => {
    return api.delete<{ success: boolean; id: string }>(`/patients/${patientId}`);
};

// Get patient encounter history
export const getPatientHistory = async (patientId: string): Promise<EncounterSummary[]> => {
    return api.get<EncounterSummary[]>(`/patients/${patientId}/history`);
};
