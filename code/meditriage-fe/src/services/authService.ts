// Authentication service — calls FastAPI /auth endpoints.

import { api, setToken } from './api';
import { UserRole } from '../types';

// Backend response types (matching FastAPI schemas)
interface TokenResponse {
    access_token: string;
    token_type: string;
}

interface BackendUserResponse {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: string;
    license_number: string | null;
    is_active: boolean;
    created_at: string;
}

// Maps backend user response to our frontend User type
function mapUser(raw: BackendUserResponse) {
    return {
        id: raw.id,
        username: raw.username,
        role: raw.role === 'DOCTOR' ? UserRole.DOCTOR : UserRole.NURSE,
        name: raw.full_name,
        avatar: raw.role === 'DOCTOR' ? '/assets/images/Doctor.jpg' : '/assets/images/Nurse.jpg',
    };
}

// Login and store JWT
export const login = async (username: string, password: string) => {
    const tokenData = await api.post<TokenResponse>('/auth/login', { username, password });
    setToken(tokenData.access_token);

    // Fetch full user profile
    const userRaw = await api.get<BackendUserResponse>('/auth/me');
    return mapUser(userRaw);
};

// Get current authenticated user
export const getCurrentUser = async () => {
    const userRaw = await api.get<BackendUserResponse>('/auth/me');
    return mapUser(userRaw);
};

// Logout — clear token
export const logout = () => {
    setToken(null);
};
