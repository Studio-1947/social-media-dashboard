import { Pool } from 'pg';

/**
 * Postgres connection + schema bootstrap for user accounts (auth/admin only —
 * Metricool data is never persisted here, it's fetched live on every request).
 *
 * Mirrors the health-tracking pattern already used for Metricool
 * (config/metricool.ts): every real query updates a small in-memory status, and
 * /health exposes it, so a dead database shows up as a loud, page-worthy signal
 * instead of every login silently 500ing with no explanation.
 */

const DATABASE_URL = process.env.DATABASE_URL || '';

export function isDbConfigured(): boolean {
  return Boolean(DATABASE_URL);
}

export const pool = new Pool({
  connectionString: DATABASE_URL || undefined,
  max: 10,
});

pool.on('error', (err) => {
  // Fired for errors on IDLE clients in the pool (e.g. the DB restarting) —
  // must be handled or an unhandled 'error' event crashes the whole process.
  console.error('[DB] Unexpected error on idle client:', err.message);
});

export type DbHealthStatus = 'unconfigured' | 'unknown' | 'ok' | 'failing';

interface DbHealth {
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureMessage: string | null;
}

const health: DbHealth = { lastSuccessAt: null, lastFailureAt: null, lastFailureMessage: null };

export function getDbHealth() {
  let status: DbHealthStatus;
  if (!isDbConfigured()) status = 'unconfigured';
  else if (!health.lastSuccessAt && !health.lastFailureAt) status = 'unknown';
  else if (!health.lastSuccessAt) status = 'failing';
  else if (health.lastFailureAt && Date.parse(health.lastFailureAt) > Date.parse(health.lastSuccessAt)) {
    status = 'failing';
  } else status = 'ok';

  return { configured: isDbConfigured(), status, ...health };
}

/** The single entry point for every query, so health tracking can't be bypassed. */
export async function query<T = any>(
  text: string,
  params: unknown[] = []
): Promise<{ rows: T[] }> {
  if (!isDbConfigured()) {
    throw new Error('DATABASE_URL is not set — cannot reach the database.');
  }

  try {
    const result = await pool.query(text, params);
    health.lastSuccessAt = new Date().toISOString();
    return { rows: result.rows };
  } catch (err) {
    health.lastFailureAt = new Date().toISOString();
    health.lastFailureMessage = err instanceof Error ? err.message : String(err);
    throw err;
  }
}

/**
 * Idempotent — safe to run on every boot. One table for now; if the schema
 * grows beyond this, move to a real migration tool rather than extending this
 * function indefinitely.
 */
export async function ensureSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
      status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_login_at TIMESTAMPTZ
    )
  `);

  // Case-insensitive email lookups without needing a citext extension.
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email))`);
}
