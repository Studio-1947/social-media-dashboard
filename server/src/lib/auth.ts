import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { query } from '../config/db';

/**
 * Password hashing + session tokens + the middleware that actually enforces
 * them on routes.
 *
 * Bearer-token-in-localStorage, not an httpOnly cookie: this is an internal
 * agency tool with no third-party scripts and no user-generated content
 * rendered as HTML, so the usual XSS-cookie-theft argument for httpOnly cookies
 * carries less weight here, and a bearer token sidesteps cross-origin cookie
 * configuration entirely — which matters because dev runs client:5173 against
 * server:5000 (different origins) while prod runs same-origin behind nginx.
 * One mechanism, both environments, no SameSite/secure-cookie juggling.
 *
 * The JWT carries ONLY the user id — nothing else in it is trusted. Role and
 * active/revoked status are re-read from the database on every request (see
 * requireAuth). The whole point of this feature is "an admin can revoke
 * someone's access" — if role/status were trusted from the token payload, a
 * revoked user or a just-demoted admin would stay fully authorized for up to
 * TOKEN_TTL (7 days) until their token happened to expire. One extra indexed
 * lookup per request is a trivial cost for making revocation actually mean
 * "revoked," not "revoked in about a week."
 */

const JWT_SECRET = process.env.JWT_SECRET || '';
const TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 12;

export function isAuthConfigured(): boolean {
  return Boolean(JWT_SECRET);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface SessionUser {
  id: number;
  email: string;
  role: 'admin' | 'member';
}

export function signToken(userId: number): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set — cannot issue a session token.');
  }
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

/** Returns the claimed user id if the token's signature and expiry check out.
 * That's ALL a JWT proves — who they claim to be, not what they're currently
 * allowed to do. See the module comment. */
function verifiedUserId(token: string): number | null {
  if (!JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const sub = payload.sub;
    if (typeof sub !== 'string' && typeof sub !== 'number') return null;
    const id = Number(sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    // Expired, malformed, wrong secret — all the same to the caller: not authed.
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/**
 * Every protected route needs this. Verifies the token, then re-reads the
 * user's CURRENT role/status from the database — see the module comment for
 * why that DB round trip is the whole point, not an afterthought.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);
  const userId = token ? verifiedUserId(token) : null;

  if (userId === null) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { rows } = await query<{ id: number; email: string; role: 'admin' | 'member'; status: string }>(
      `SELECT id, email, role, status FROM users WHERE id = $1`,
      [userId]
    );
    const row = rows[0];

    if (!row || row.status !== 'active') {
      return res.status(401).json({ error: 'Session no longer valid — please sign in again.' });
    }

    req.user = { id: row.id, email: row.email, role: row.role };
    next();
  } catch (err) {
    console.error('[Auth] Failed to verify session:', err);
    res.status(503).json({ error: 'Could not verify session — the database may be unavailable.' });
  }
}

/** Stack after requireAuth. 403s a logged-in non-admin, not 401 — they ARE authed. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
