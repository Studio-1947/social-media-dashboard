import axios from 'axios';

/**
 * Typed fetchers for Social Flow's own API (which fronts Metricool).
 *
 * Metric *keys* here (`followers`, `reach`, …) are Social Flow's stable names.
 * The server maps them to Metricool's real, verified metric strings and attaches
 * the correct `subject` — the frontend never sends a raw Metricool metric name
 * and never guesses a subject.
 */

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/metricool';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 30_000 });

export type Network = 'facebook' | 'instagram' | 'youtube';

export interface Brand {
    blogId: number;
    name: string;
    picture: string | null;
    /** Networks connected in Metricool for this client. Non-null field = connected. */
    connectedNetworks: string[];
}

export interface DateRange {
    from: string;
    to: string;
}

export interface TimelinesResponse {
    /** Keyed by the metric key requested. */
    results: Record<string, unknown>;
    /** Present only when at least one metric failed; the rest still resolved. */
    errors?: Record<string, string>;
}

export interface DistributionResponse {
    key: string;
    metric: string;
    label: string;
    data: unknown;
}

export interface ListResponse {
    data: unknown;
    supported: boolean;
}

/* ------------------------------------------------------------------ */
/* Cache + in-flight de-duplication                                    */
/* ------------------------------------------------------------------ */

/**
 * Two dashboards' worth of panels mount at once and would otherwise fire the
 * same request several times over. De-dup collapses concurrent identical calls;
 * the TTL cache absorbs remounts and tab flips. The server has its own 5-minute
 * cache behind this — this one just keeps the browser from being the noisy one.
 */
const CACHE_TTL_MS = 15 * 60 * 1000;

const cache = new Map<string, { value: unknown; expiresAt: number }>();
const inFlight = new Map<string, Promise<unknown>>();

async function get<T>(url: string): Promise<T> {
    const hit = cache.get(url);
    if (hit && Date.now() < hit.expiresAt) return hit.value as T;
    if (hit) cache.delete(url);

    const pending = inFlight.get(url);
    if (pending) return pending as Promise<T>;

    const request = api
        .get<T>(url)
        .then((res) => {
            cache.set(url, { value: res.data, expiresAt: Date.now() + CACHE_TTL_MS });
            return res.data;
        })
        .finally(() => {
            inFlight.delete(url);
        });

    inFlight.set(url, request);
    return request;
}

/** Call after anything that invalidates cached analytics (e.g. a manual refresh). */
export function clearMetricoolCache() {
    cache.clear();
}

function rangeParams({ from, to }: DateRange, blogId: number): URLSearchParams {
    return new URLSearchParams({ from, to, blogId: String(blogId) });
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

/**
 * The client list. This single call drives BOTH the client switcher and
 * per-client tab visibility — see the note in SocialDashboard about why tab
 * visibility must be derived from this array synchronously rather than fetched
 * per switch.
 */
export async function fetchBrands(): Promise<Brand[]> {
    const res = await get<{ brands: Brand[] }>('/brands');
    return res.brands ?? [];
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

/**
 * Batch several timeline metrics in one round trip. Partial failure is normal
 * and non-fatal: `results` carries whatever resolved, `errors` names what didn't.
 */
export async function fetchTimelines(
    network: Network,
    metricKeys: string[],
    range: DateRange,
    blogId: number
): Promise<TimelinesResponse> {
    const params = rangeParams(range, blogId);
    params.set('network', network);
    params.set('metrics', metricKeys.join(','));
    return get<TimelinesResponse>(`/timelines?${params}`);
}

export async function fetchDistribution(
    network: Network,
    metricKey: string,
    range: DateRange,
    blogId: number
): Promise<DistributionResponse> {
    const params = rangeParams(range, blogId);
    params.set('network', network);
    params.set('metric', metricKey);
    return get<DistributionResponse>(`/distribution?${params}`);
}

export async function fetchPosts(
    network: Network,
    range: DateRange,
    blogId: number
): Promise<ListResponse> {
    return get<ListResponse>(`/posts/${network}?${rangeParams(range, blogId)}`);
}

/**
 * Returns an empty list until competitors are added for this brand inside
 * Metricool's own UI — it is not an API-controllable toggle. An empty list means
 * "hide the tab for this client", never "error".
 */
export async function fetchCompetitors(
    network: Network,
    range: DateRange,
    blogId: number
): Promise<ListResponse> {
    return get<ListResponse>(`/competitors/${network}?${rangeParams(range, blogId)}`);
}

export default api;
