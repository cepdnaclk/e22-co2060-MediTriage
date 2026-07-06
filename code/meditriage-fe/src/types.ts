/* ── Enums ─────────────────────────────────────────── */

export enum UserRole {
    NURSE = 'NURSE',
    DOCTOR = 'DOCTOR',
}

export enum CareSetting {
    OPD = 'OPD',
    WARD = 'WARD',
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

export type MDTRoomStatus = 'OPEN' | 'CLOSED';
export type MDTMessageType = 'TEXT' | 'SYSTEM' | 'ATTACHMENT';

export interface MDTMember {
    doctor_id: string;
    full_name: string;
    license_number: string | null;
    joined_at: string;
    is_active: boolean;
}

export interface MDTAttachmentMeta {
    id: string;
    original_filename: string;
    mime_type: string;
    file_size_bytes: number;
}

export interface MDTMessage {
    id: string;
    room_id: string;
    sender_id: string | null;
    sender_name: string | null;
    content: string;
    message_type: MDTMessageType;
    created_at: string;
    attachment?: MDTAttachmentMeta | null;
}

export interface MDTRoom {
    id: string;
    title: string;
    status: MDTRoomStatus;
    encounter_id: string;
    created_at: string;
    member_count: number;
    created_by?: MDTMember;
    members?: MDTMember[];
}
