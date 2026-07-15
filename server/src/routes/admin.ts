import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '../lib/auth';
import { asyncRoute } from '../lib/expressHelpers';
import { HttpError } from '../lib/httpError';
import {
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  updateUserAccess,
} from '../services/userService';

export const adminRouter = Router();

// Every route below requires a logged-in admin. requireAuth re-checks the
// caller's CURRENT role from the database on every request (see lib/auth.ts) —
// a demoted admin loses access to this whole router on their very next request,
// not whenever their token happens to expire.
adminRouter.use(requireAuth, requireAdmin);

const idParam = z.object({ id: z.coerce.number().int().positive() });

/** Blocks an admin from revoking/demoting/deleting THEIR OWN account through
 * this panel — distinct from the last-admin guard in userService, which only
 * fires if doing so would leave zero admins. This fires regardless of how many
 * other admins exist: "act on your own account" via an admin panel is a classic
 * way to accidentally lock yourself out mid-session, so it's simply not a thing
 * this panel lets you do to yourself at all. Use a second admin account, or the
 * ADMIN_EMAIL/ADMIN_PASSWORD bootstrap as a last resort. */
function assertNotSelf(req: { user?: { id: number } }, targetId: number) {
  if (req.user?.id === targetId) {
    throw new HttpError(400, "You can't change or remove your own account from this panel.");
  }
}

adminRouter.get(
  '/users',
  asyncRoute(async (_req, res) => {
    res.json({ users: await listUsers() });
  })
);

const createUserSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['admin', 'member']).default('member'),
});

adminRouter.post(
  '/users',
  asyncRoute(async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const user = await createUser(input);
    res.status(201).json({ user });
  })
);

const updateAccessSchema = z.object({
  role: z.enum(['admin', 'member']).optional(),
  status: z.enum(['active', 'revoked']).optional(),
});

adminRouter.patch(
  '/users/:id',
  asyncRoute(async (req, res) => {
    const { id } = idParam.parse(req.params);
    assertNotSelf(req, id);
    const changes = updateAccessSchema.parse(req.body);
    const user = await updateUserAccess(id, changes);
    res.json({ user });
  })
);

const resetPasswordSchema = z.object({ password: z.string().min(8) });

adminRouter.patch(
  '/users/:id/password',
  asyncRoute(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { password } = resetPasswordSchema.parse(req.body);
    await resetUserPassword(id, password);
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/users/:id',
  asyncRoute(async (req, res) => {
    const { id } = idParam.parse(req.params);
    assertNotSelf(req, id);
    await deleteUser(id);
    res.json({ ok: true });
  })
);
