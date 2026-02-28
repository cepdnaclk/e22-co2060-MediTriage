/* ── Enums ─────────────────────────────────────────── */

export enum UserRole {
    NURSE = 'NURSE',
    DOCTOR = 'DOCTOR',
}

export enum CareSetting {
    OPD = 'OPD',
    WARD_A = 'WARD_A',
    WARD_B = 'WARD_B',
}

export enum UrgencyLevel {
    ROUTINE = 'GREEN',
    URGENT = 'YELLOW',
    IMMEDIATE = 'RED',
}

export enum TriageStatus {
    IN_PROGRESS = 'TRIAGE_IN_PROGRESS',
    AWAITING_REVIEW = 'AWAITING_REVIEW',
    COMPLETED = 'COMPLETED',
}

/* ── Interfaces ───────────────────────────────────── */

export interface User {
    id: string;
    username: string;
    role: UserRole;
    name: string;
    avatar?: string;
}

export interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export interface SoapNote {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    urgency: UrgencyLevel;
}

export interface PatientCase {
    id: string;
    patientId?: string;
    patientName: string;
    age: string;
    gender: string;
    chiefComplaint: string;
    nurseId: string;
    doctorId?: string;
    doctorName?: string;
    startTime: number;
    status: TriageStatus;
    messages: Message[];
    soapNote?: SoapNote;
    encounterId?: string;
}

/** Backend patient record (matches PatientResponse schema) */
export interface PatientRecord {
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

/** Backend encounter summary (matches EncounterSummary schema) */
export interface EncounterSummary {
    id: string;
    encounter_timestamp: string;
    chief_complaint: string | null;
    status: string;
    is_urgent: boolean;
    nurse_name: string;
    doctor_name: string | null;
}
