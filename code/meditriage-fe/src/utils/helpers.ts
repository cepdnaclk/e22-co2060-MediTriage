import { UrgencyLevel } from '../types';

// Status Dot Color (Nurse style)
export const getStatusColor = (urgency?: UrgencyLevel): string => {
    switch (urgency) {
        case UrgencyLevel.IMMEDIATE: return 'bg-red-500 shadow-red-500/50';
        case UrgencyLevel.URGENT: return 'bg-yellow-400 shadow-yellow-400/50';
        default: return 'bg-green-500 shadow-green-500/50';
    }
};

// Status Dot Color (Doctor style — with glow)
export const getDoctorStatusColor = (urgency?: UrgencyLevel): string => {
    switch (urgency) {
        case UrgencyLevel.IMMEDIATE: return 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]';
        case UrgencyLevel.URGENT: return 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]';
        default: return 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]';
    }
};

// Status Badge
export const getStatusBadge = (urgency?: UrgencyLevel) => {
    switch (urgency) {
        case UrgencyLevel.IMMEDIATE: return { label: 'Immediate', dotColor: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' };
        case UrgencyLevel.URGENT: return { label: 'Urgent', dotColor: 'bg-yellow-400', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' };
        default: return { label: 'Routine', dotColor: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' };
    }
};

// Wait Time (returns minutes elapsed)
export const getWaitTimeMinutes = (startTime: number): number => {
    return Math.floor((Date.now() - startTime) / 60000);
};

// Urgency Score for sorting
export const urgencyScore = (u?: UrgencyLevel): number => {
    if (u === UrgencyLevel.IMMEDIATE) return 3;
    if (u === UrgencyLevel.URGENT) return 2;
    return 1;
};
