import { API_ROOT, createApiClient } from '../lib/httpClient';
import { clearToken, setToken } from '../lib/session';

export interface AuthUser {
    id: number;
    email: string;
    role: 'admin' | 'member';
}

const api = createApiClient(`${API_ROOT}/api/auth`);

export async function login(email: string, password: string): Promise<AuthUser> {
    const { data } = await api.post('/login', { email, password });
    setToken(data.token);
    return data.user;
}

/** Restores a session from a stored token — the source of truth for whether
 * it's still valid is the server, never the mere presence of a token. */
export async function fetchMe(): Promise<AuthUser> {
    const { data } = await api.get('/me');
    return data.user;
}

export function clearSession(): void {
    clearToken();
}
