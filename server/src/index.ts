import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { getMetricoolHealth, isMetricoolConfigured } from './config/metricool';
import { metricoolRouter } from './routes/metricool';
import { runMetricoolStartupCheck } from './services/metricoolService';

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

app.use('/api/metricool', metricoolRouter);

/**
 * Exposes accumulated Metricool health so uptime monitoring can alert on a
 * stale token instead of a client noticing their numbers are fake.
 * Returns 503 when failing, so a plain HTTP check is enough to page on.
 */
app.get('/health', (_req, res) => {
  const metricool = getMetricoolHealth();
  const httpStatus = metricool.status === 'ok' || metricool.status === 'unknown' ? 200 : 503;

  res.status(httpStatus).json({
    service: 'social-flow',
    uptimeSeconds: Math.round(process.uptime()),
    metricool,
  });
});

app.get('/', (_req, res) => {
  res.json({ service: 'Social Flow API', status: 'ready' });
});

app.listen(PORT, () => {
  console.log(`\n  Social Flow API — http://localhost:${PORT}\n`);

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
