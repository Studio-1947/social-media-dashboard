import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { getMetricoolHealth, isMetricoolConfigured } from './config/metricool';
import { ensureSchema, getDbHealth, isDbConfigured } from './config/db';
import { isAuthConfigured, requireAuth } from './lib/auth';
import { errorHandler } from './lib/expressHelpers';
import { metricoolRouter } from './routes/metricool';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { runMetricoolStartupCheck } from './services/metricoolService';
import { ensureBootstrapAdmin } from './services/userService';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/non-browser callers (curl, health checks).
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// Every Metricool route now requires a signed-in, active user. Previously this
// router had NO server-side auth at all — the login screen was purely a client-
// side gate, and anyone who found the API's base URL could curl real client
// data directly. requireAuth is the actual boundary; the browser's login page
// was never enforcing anything on its own.
app.use('/api/metricool', requireAuth, metricoolRouter);

/**
 * Exposes accumulated Metricool + database health so uptime monitoring can
 * alert on a stale token or a dead database instead of every request just
 * silently failing with no visible cause. Returns 503 if either is failing.
 */
app.get('/health', (_req, res) => {
  const metricool = getMetricoolHealth();
  const db = getDbHealth();
  const metricoolOk = metricool.status === 'ok' || metricool.status === 'unknown';
  const dbOk = db.status === 'ok' || db.status === 'unknown';

  res.status(metricoolOk && dbOk ? 200 : 503).json({
    service: 'social-flow',
    uptimeSeconds: Math.round(process.uptime()),
    metricool,
    db,
  });
});

app.get('/', (_req, res) => {
  res.json({ service: 'Social Flow API', status: 'ready' });
});

// Mounted after every router — see lib/expressHelpers.ts.
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`\n  Social Flow API — http://localhost:${PORT}\n`);

  if (!isDbConfigured()) {
    console.error(
      '[Auth] NOT CONFIGURED — DATABASE_URL is not set. Nobody can log in and every ' +
        '/api/metricool request will fail, since those routes now require auth.'
    );
  } else if (!isAuthConfigured()) {
    console.error(
      '[Auth] NOT CONFIGURED — JWT_SECRET is not set. Logins will fail even though the ' +
        'database is reachable.'
    );
  } else {
    try {
      await ensureSchema();
      await ensureBootstrapAdmin();
    } catch (err) {
      console.error('[Auth] STARTUP FAILED — could not reach the database:', err);
    }
  }

  if (!isMetricoolConfigured()) {
    console.error(
      '[Metricool] NOT CONFIGURED — set METRICOOL_API_TOKEN and METRICOOL_USER_ID in .env. ' +
        'Every analytics request will fail with 503 until you do.'
    );
    return;
  }

  void runMetricoolStartupCheck();
});

export default app;
