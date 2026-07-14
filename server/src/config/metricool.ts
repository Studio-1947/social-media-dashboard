import axios, { AxiosError, AxiosRequestConfig } from 'axios';

/**
 * Low-level Metricool HTTP client.
 *
 * Responsibilities, in order of importance:
 *   1. Attach the three credentials Metricool wants (userToken/userId/blogId as
 *      query params AND the token again as the X-Mc-Auth header).
 *   2. Throttle outbound requests so N client dashboards polling at once don't
 *      trip Metricool's aggressive 429s.
 *   3. Cache successful GETs briefly.
 *   4. Record the health of every real call so a stale token surfaces loudly
 *      instead of silently degrading to sample data.
 */

export const METRICOOL_BASE_URL =
  process.env.METRICOOL_BASE_URL || 'https://app.metricool.com';

export const METRICOOL_API_TOKEN = process.env.METRICOOL_API_TOKEN || '';
export const METRICOOL_USER_ID = process.env.METRICOOL_USER_ID || '';
export const METRICOOL_DEFAULT_BLOG_ID = process.env.METRICOOL_BLOG_ID || '';
export const METRICOOL_DEFAULT_TIMEZONE =
  process.env.METRICOOL_DEFAULT_TIMEZONE || 'Asia/Kolkata';

export function isMetricoolConfigured(): boolean {
  return Boolean(METRICOOL_API_TOKEN && METRICOOL_USER_ID);
}

/* ------------------------------------------------------------------ */
/* Health tracking                                                     */
/* ------------------------------------------------------------------ */

export type MetricoolHealthStatus = 'unconfigured' | 'unknown' | 'ok' | 'failing';

interface MetricoolHealth {
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureStatus: number | null;
  lastFailureMessage: string | null;
  successCount: number;
  failureCount: number;
}

const health: MetricoolHealth = {
  lastSuccessAt: null,
  lastFailureAt: null,
  lastFailureStatus: null,
  lastFailureMessage: null,
  successCount: 0,
  failureCount: 0,
};

function recordSuccess() {
  health.lastSuccessAt = new Date().toISOString();
  health.successCount += 1;
}

function recordFailure(status: number | null, message: string) {
  health.lastFailureAt = new Date().toISOString();
  health.lastFailureStatus = status;
  health.lastFailureMessage = message;
  health.failureCount += 1;
}

export function getMetricoolHealth() {
  let status: MetricoolHealthStatus;

  if (!isMetricoolConfigured()) {
    status = 'unconfigured';
  } else if (!health.lastSuccessAt && !health.lastFailureAt) {
    status = 'unknown';
  } else if (!health.lastSuccessAt) {
    status = 'failing';
  } else if (
    health.lastFailureAt &&
    Date.parse(health.lastFailureAt) > Date.parse(health.lastSuccessAt)
  ) {
    status = 'failing';
  } else {
    status = 'ok';
  }

  return {
    configured: isMetricoolConfigured(),
    status,
    userId: METRICOOL_USER_ID || null,
    defaultBlogId: METRICOOL_DEFAULT_BLOG_ID || null,
    ...health,
  };
}

/* ------------------------------------------------------------------ */
/* TTL cache                                                           */
/* ------------------------------------------------------------------ */

/**
 * Process-local, in-memory. On serverless this resets on every cold start —
 * that is fine for correctness. If this ever runs multi-instance or the client
 * count grows past a handful, swap this for Redis.
 */
class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear() {
    this.store.clear();
  }
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new TtlCache<unknown>(CACHE_TTL_MS);

/* ------------------------------------------------------------------ */
/* Request queue                                                       */
/* ------------------------------------------------------------------ */

const MAX_PARALLEL_REQUESTS = 5;
const REQUEST_INTERVAL_MS = 300;
const MAX_RETRIES = 3;

type QueuedTask<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

const queue: QueuedTask<any>[] = [];
let drainTimer: NodeJS.Timeout | null = null;

function drain() {
  const batch = queue.splice(0, MAX_PARALLEL_REQUESTS);

  for (const task of batch) {
    task.run().then(task.resolve, task.reject);
  }

  if (queue.length === 0) {
    if (drainTimer) clearInterval(drainTimer);
    drainTimer = null;
  }
}

function enqueue<T>(run: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ run, resolve, reject });

    if (!drainTimer) {
      // Fire the first batch immediately, then every REQUEST_INTERVAL_MS.
      drain();
      if (queue.length > 0) {
        drainTimer = setInterval(drain, REQUEST_INTERVAL_MS);
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* The request itself                                                  */
/* ------------------------------------------------------------------ */

const http = axios.create({
  baseURL: METRICOOL_BASE_URL,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
    'User-Agent': 'SocialFlow/1.0',
  },
});

export class MetricoolError extends Error {
  constructor(
    message: string,
    public status: number,
    public upstreamBody?: unknown
  ) {
    super(message);
    this.name = 'MetricoolError';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface MetricoolGetOptions {
  /** Path under the base URL, e.g. `/api/v2/analytics/timelines`. */
  path: string;
  /** Query params. `userId` and `userToken` are injected automatically. */
  params?: Record<string, string | number | undefined>;
  /** Skip the response cache for this call. */
  noCache?: boolean;
}

/**
 * The single entry point for every Metricool call. Everything —
 * credentials, queueing, retry, caching, health — happens here so no caller
 * can accidentally bypass it.
 */
export async function metricoolGet<T = unknown>({
  path,
  params = {},
  noCache = false,
}: MetricoolGetOptions): Promise<T> {
  if (!isMetricoolConfigured()) {
    throw new MetricoolError(
      'Metricool is not configured. Set METRICOOL_API_TOKEN and METRICOOL_USER_ID.',
      503
    );
  }

  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query[key] = String(value);
    }
  }

  // Metricool wants the credentials as query params *and* the token as a header.
  query.userId = METRICOOL_USER_ID;
  query.userToken = METRICOOL_API_TOKEN;

  const cacheKey = `${path}?${new URLSearchParams(query).toString()}`;

  if (!noCache) {
    const cached = responseCache.get(cacheKey);
    if (cached !== undefined) return cached as T;
  }

  const config: AxiosRequestConfig = {
    url: path,
    method: 'GET',
    params: query,
    headers: { 'X-Mc-Auth': METRICOOL_API_TOKEN },
  };

  const execute = async (): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await http.request<T>(config);
        recordSuccess();
        if (!noCache) responseCache.set(cacheKey, response.data);
        return response.data;
      } catch (error) {
        lastError = error;
        const err = error as AxiosError;
        const status = err.response?.status ?? null;

        if (status === 429 && attempt < MAX_RETRIES) {
          const retryAfter = Number(err.response?.headers?.['retry-after']);
          const backoffMs = Number.isFinite(retryAfter)
            ? retryAfter * 1000
            : 2 ** attempt * 1000;
          await sleep(backoffMs);
          continue;
        }

        const message =
          (err.response?.data as any)?.message ||
          (err.response?.data as any)?.error ||
          err.message;

        recordFailure(status, String(message));

        throw new MetricoolError(
          String(message),
          status ?? 502,
          err.response?.data
        );
      }
    }

    throw lastError;
  };

  return enqueue(execute);
}

export function clearMetricoolCache() {
  responseCache.clear();
}
