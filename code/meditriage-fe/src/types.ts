export enum UserRole {
    NURSE = 'NURSE',
    DOCTOR = 'DOCTOR'
}

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

export enum UrgencyLevel {
    ROUTINE = 'GREEN',
    URGENT = 'YELLOW',
    IMMEDIATE = 'RED'
}

export interface SoapNote {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    urgency: UrgencyLevel;
}

export enum TriageStatus {
    WAITING = 'WAITING',
    TREATED = 'TREATED',
    URGENT = 'URGENT',
    REMOVED = 'REMOVED'
}

export interface PatientCase {
    id: string;
    patientName: string;
    age: string;
    gender: string;
    chiefComplaint: string;
    nurseId: string;
    startTime: number;
    status: TriageStatus;
    messages: Message[];
    soapNote?: SoapNote;
}
