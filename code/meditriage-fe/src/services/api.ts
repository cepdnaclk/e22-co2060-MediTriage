// Base API client for communicating with the FastAPI backend.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Token management
let accessToken: string | null = localStorage.getItem('meditriage_token');

export const setToken = (token: string | null) => {
    accessToken = token;
    if (token) {
        localStorage.setItem('meditriage_token', token);
    } else {
        localStorage.removeItem('meditriage_token');
    }
};

export const getToken = (): string | null => accessToken;

// Generic fetch wrapper with JWT injection
async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody.detail || `API Error: ${response.status}`;
        throw new Error(message);
    }

    return response.json();
}

// HTTP method helpers
export const api = {
    get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

    post: <T>(endpoint: string, body?: unknown) =>
        request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        }),

    put: <T>(endpoint: string, body?: unknown) =>
        request<T>(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        }),

    patch: <T>(endpoint: string, body?: unknown) =>
        request<T>(endpoint, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        }),

    delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
