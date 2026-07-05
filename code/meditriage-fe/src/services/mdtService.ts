import { api, getToken } from './api';
import { MDTRoom, MDTMessage } from '../types';

export const createRoom = async (encounterId: string, title: string, doctorIds: string[]): Promise<MDTRoom> => {
    return api.post<MDTRoom>('/consultations/rooms', {
        encounter_id: encounterId,
        title,
        doctor_ids: doctorIds
    });
};

export const getMyRooms = async (): Promise<MDTRoom[]> => {
    return api.get<MDTRoom[]>('/consultations/rooms');
};

export const getRoomDetails = async (roomId: string): Promise<MDTRoom> => {
    return api.get<MDTRoom>(`/consultations/rooms/${roomId}`);
};

export const addMember = async (roomId: string, doctorId: string): Promise<void> => {
    return api.post<void>(`/consultations/rooms/${roomId}/members`, { doctor_id: doctorId });
};

export const removeMember = async (roomId: string, doctorId: string): Promise<void> => {
    return api.delete<void>(`/consultations/rooms/${roomId}/members/${doctorId}`);
};

export const getMessages = async (roomId: string, limit: number = 50, beforeId?: string): Promise<MDTMessage[]> => {
    let url = `/consultations/rooms/${roomId}/messages?limit=${limit}`;
    if (beforeId) {
        url += `&before_id=${beforeId}`;
    }
    return api.get<MDTMessage[]>(url);
};

export const closeRoom = async (roomId: string): Promise<void> => {
    return api.patch<void>(`/consultations/rooms/${roomId}/close`);
};

export const uploadAttachment = async (roomId: string, file: File): Promise<MDTMessage> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const token = getToken();
    
    const response = await fetch(`${BASE_URL}/consultations/rooms/${roomId}/attachments`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || 'Failed to upload attachment');
    }
    
    return response.json();
};

export const downloadAttachmentBlob = async (roomId: string, attachmentId: string): Promise<Blob> => {
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const token = getToken();
    
    const response = await fetch(`${BASE_URL}/consultations/rooms/${roomId}/attachments/${attachmentId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to download attachment');
    }
    
    return response.blob();
};

export const createMDTRoomWebSocket = (roomId: string, token: string): WebSocket => {
    const wsBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1')
        .replace('http://', 'ws://').replace('https://', 'wss://');
    return new WebSocket(`${wsBase}/consultations/rooms/${roomId}/ws?token=${token}`);
};
