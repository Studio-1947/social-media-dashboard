import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, signToken } from '../lib/auth';
import { asyncRoute } from '../lib/expressHelpers';
import { verifyLogin } from '../services/userService';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  asyncRoute(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await verifyLogin(email, password);

    if (!result.ok) {
      if (result.reason === 'revoked') {
        return res.status(403).json({ error: 'Your access has been revoked. Contact an admin.' });
      }
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({ token: signToken(result.user.id), user: result.user });
  })
);

/** Restores a session on page load — the client trusts this over anything it
 * had cached in localStorage, since role/status may have changed server-side. */
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
