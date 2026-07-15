import { query } from '../config/db';
import { hashPassword, verifyPassword } from '../lib/auth';
import { HttpError } from '../lib/httpError';

/**
 * Whitelisting, as actually implemented: an admin creates an account (email +
 * an initial password they set and share out of band — there's no SMTP
 * configured in this project, so an email-invite-link flow isn't built; adding
 * one later is a reasonable next step if the team grows past "share a password
 * over Slack"). Only accounts that exist AND are `status = 'active'` can log
 * in. Revoking access is instant and doesn't require deleting the account.
 */

export type Role = 'admin' | 'member';
export type Status = 'active' | 'revoked';

export interface User {
  id: number;
  email: string;
  role: Role;
  status: Status;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  role: Role;
  status: Status;
  created_at: string;
  last_login_at: string | null;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/* ------------------------------------------------------------------ */
/* Last-admin guard                                                    */
/* ------------------------------------------------------------------ */

/**
 * The one rule that must never be violated by an API call: there must always
 * be at least one admin who can still log in, or nobody can ever whitelist
 * anyone again. Every mutation that could remove an admin's active-admin
 * status checks this FIRST, server-side — this is the actual security
 * boundary; the UI disabling a button is just a courtesy.
 */
async function countActiveAdmins(excludingId?: number): Promise<number> {
  const { rows } = await query<{ count: string }>(
    excludingId
      ? `SELECT count(*)::text AS count FROM users WHERE role = 'admin' AND status = 'active' AND id != $1`
      : `SELECT count(*)::text AS count FROM users WHERE role = 'admin' AND status = 'active'`,
    excludingId ? [excludingId] : []
  );
  return Number(rows[0]?.count ?? 0);
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function listUsers(): Promise<User[]> {
  const { rows } = await query<UserRow>(`SELECT * FROM users ORDER BY created_at ASC`);
  return rows.map(toUser);
}

export async function getUserById(id: number): Promise<User | null> {
  const { rows } = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] ? toUser(rows[0]) : null;
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; reason: 'invalid' | 'revoked' };

export async function verifyLogin(email: string, password: string): Promise<LoginResult> {
  const { rows } = await query<UserRow>(`SELECT * FROM users WHERE lower(email) = $1`, [
    normalizeEmail(email),
  ]);
  const row = rows[0];

  // Same generic failure for "no such account" as for "wrong password" — no
  // reason to help an attacker distinguish the two. A revoked account gets its
  // own message: this is a small closed team, not a public signup surface, so
  // telling a legitimate ex-user "access was revoked, ask an admin" is kinder
  // than leaving them guessing at their own password.
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return { ok: false, reason: 'invalid' };
  }
  if (row.status !== 'active') {
    return { ok: false, reason: 'revoked' };
  }

  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [row.id]);
  return { ok: true, user: toUser({ ...row, last_login_at: new Date().toISOString() }) };
}

/* ------------------------------------------------------------------ */
/* Writes (admin-only — callers are already gated by requireAdmin)     */
/* ------------------------------------------------------------------ */

export async function createUser(input: {
  email: string;
  password: string;
  role: Role;
}): Promise<User> {
  const email = normalizeEmail(input.email);
  if (!email.includes('@')) throw new HttpError(400, 'Not a valid email address.');
  if (input.password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.');
  }

  const hash = await hashPassword(input.password);

  try {
    const { rows } = await query<UserRow>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING *`,
      [email, hash, input.role]
    );
    return toUser(rows[0]);
  } catch (err: any) {
    if (err?.code === '23505') {
      // Unique violation — either the raw column constraint or the
      // case-insensitive index caught a duplicate.
      throw new HttpError(409, `${email} already has an account.`);
    }
    throw err;
  }
}

export async function updateUserAccess(
  id: number,
  changes: { role?: Role; status?: Status }
): Promise<User> {
  const current = await getUserById(id);
  if (!current) throw new HttpError(404, 'User not found.');

  const nextRole = changes.role ?? current.role;
  const nextStatus = changes.status ?? current.status;

  const wasActiveAdmin = current.role === 'admin' && current.status === 'active';
  const staysActiveAdmin = nextRole === 'admin' && nextStatus === 'active';

  if (wasActiveAdmin && !staysActiveAdmin && (await countActiveAdmins(id)) === 0) {
    throw new HttpError(
      400,
      'This is the last active admin — promote someone else before changing this account.'
    );
  }

  const { rows } = await query<UserRow>(
    `UPDATE users SET role = $2, status = $3 WHERE id = $1 RETURNING *`,
    [id, nextRole, nextStatus]
  );
  return toUser(rows[0]);
}

export async function resetUserPassword(id: number, newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.');
  }
  const hash = await hashPassword(newPassword);
  const { rows } = await query(`UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING id`, [
    id,
    hash,
  ]);
  if (rows.length === 0) throw new HttpError(404, 'User not found.');
}

export async function deleteUser(id: number): Promise<void> {
  const current = await getUserById(id);
  if (!current) throw new HttpError(404, 'User not found.');

  if (
    current.role === 'admin' &&
    current.status === 'active' &&
    (await countActiveAdmins(id)) === 0
  ) {
    throw new HttpError(
      400,
      'This is the last active admin — promote someone else before deleting this account.'
    );
  }

  await query(`DELETE FROM users WHERE id = $1`, [id]);
}

/* ------------------------------------------------------------------ */
/* Bootstrap                                                           */
/* ------------------------------------------------------------------ */

/**
 * Fires once at boot, same spirit as runMetricoolStartupCheck: without an
 * admin, the whitelist has nobody able to whitelist anyone, ever. If the users
 * table already has an admin, this does nothing — it never overwrites an
 * existing admin's password on every restart. If it doesn't, it creates (or
 * reactivates) the ADMIN_EMAIL/ADMIN_PASSWORD account as admin, which doubles
 * as a recovery path: get locked out, set the env vars, restart, you have an
 * admin again.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      '[Auth] ADMIN_EMAIL / ADMIN_PASSWORD not set — no admin will be bootstrapped. ' +
        'If the users table has no admin, nobody will ever be able to log in or ' +
        'whitelist anyone.'
    );
    return;
  }

  if ((await countActiveAdmins()) > 0) return;

  const hash = await hashPassword(password);
  await query(
    `INSERT INTO users (email, password_hash, role, status)
     VALUES ($1, $2, 'admin', 'active')
     ON CONFLICT (email) DO UPDATE
       SET role = 'admin', status = 'active', password_hash = EXCLUDED.password_hash`,
    [email, hash]
  );

  console.log(`[Auth] Bootstrapped admin account: ${email}`);
}
