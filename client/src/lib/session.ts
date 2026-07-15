/**
 * Owns the session token in localStorage, and the one hook that lets an axios
 * interceptor (which can't call React state setters directly) tell AuthContext
 * "this token just got rejected, log the user out."
 */

const TOKEN_KEY = 'socialflow.token';

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

type Listener = () => void;
let onUnauthorized: Listener | null = null;

/** AuthContext calls this once on mount to learn about server-side 401s. */
export function registerUnauthorizedHandler(fn: Listener): void {
    onUnauthorized = fn;
}

/** Called by the shared http client whenever any request comes back 401 —
 * the token is stale (expired, or the account was just revoked/deleted). */
export function notifyUnauthorized(): void {
    clearToken();
    onUnauthorized?.();
}
