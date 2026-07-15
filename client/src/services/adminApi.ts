import { API_ROOT, createApiClient } from '../lib/httpClient';

export type Role = 'admin' | 'member';
export type Status = 'active' | 'revoked';

export interface AdminUser {
    id: number;
    email: string;
    role: Role;
    status: Status;
    createdAt: string;
    lastLoginAt: string | null;
}

const api = createApiClient(`${API_ROOT}/api/admin`);

/** Server has the last word on all of these — a rejected request throws with
 * the server's message (self-action blocked, last-admin guard, duplicate
 * email, etc.) in `err.response.data.error`. */

export async function listUsers(): Promise<AdminUser[]> {
    const { data } = await api.get('/users');
    return data.users;
}

export async function createUser(input: {
    email: string;
    password: string;
    role: Role;
}): Promise<AdminUser> {
    const { data } = await api.post('/users', input);
    return data.user;
}

export async function updateUserAccess(
    id: number,
    changes: { role?: Role; status?: Status }
): Promise<AdminUser> {
    const { data } = await api.patch(`/users/${id}`, changes);
    return data.user;
}

export async function resetUserPassword(id: number, password: string): Promise<void> {
    await api.patch(`/users/${id}/password`, { password });
}

export async function deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
}
