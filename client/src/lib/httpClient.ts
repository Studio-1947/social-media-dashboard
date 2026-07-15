import axios, { type AxiosInstance } from 'axios';
import { getToken, notifyUnauthorized } from './session';

/**
 * Derives the API's root origin from the existing VITE_API_BASE_URL, which is
 * already scoped to `/api/metricool` (see services/metricoolApi.ts). Rather
 * than add a second env var for the new /api/auth and /api/admin namespaces,
 * strip that known suffix:
 *
 *   dev:  http://localhost:5000/api/metricool  ->  http://localhost:5000
 *   prod: /api/metricool (relative, nginx-proxied)  ->  '' (still relative)
 *
 * Both cases keep working with zero new Docker/compose plumbing.
 */
const METRICOOL_BASE =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/metricool';
export const API_ROOT = METRICOOL_BASE.replace(/\/api\/metricool\/?$/, '');

/** Every axios instance that talks to this backend goes through here, so the
 * bearer token and 401 handling can't be forgotten on a new one. */
export function createApiClient(baseURL: string): AxiosInstance {
    const instance = axios.create({ baseURL, timeout: 30_000 });

    instance.interceptors.request.use((config) => {
        const token = getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    instance.interceptors.response.use(
        (res) => res,
        (error) => {
            // A 401 here means the token is gone from the SERVER's point of view —
            // expired, or the account was just revoked/deleted by an admin. Either
            // way, the client's cached "logged in" state is now a lie; drop it.
            if (error?.response?.status === 401) notifyUnauthorized();
            return Promise.reject(error);
        }
    );

    return instance;
}
