import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { MetricoolError } from '../config/metricool';
import { HttpError } from './httpError';

/** Wraps an async route handler so a rejected promise reaches Express's error
 * handling instead of crashing the process or hanging the request open. */
export function asyncRoute(handler: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

/**
 * Mounted ONCE in index.ts, after every router. Previously each router (just
 * metricool.ts) carried its own copy of this; now that auth/admin routes exist
 * too, one shared handler is less to keep in sync than three near-identical ones.
 */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Invalid request',
      details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  if (error instanceof MetricoolError) {
    // Deliberately NOT collapsed into an empty-data 200. A failing upstream
    // must stay visible — silently returning [] is what let a stale token go
    // unnoticed for two weeks.
    return res.status(error.status >= 400 && error.status < 600 ? error.status : 502).json({
      error: 'Metricool API error',
      message: error.message,
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error('[SocialFlow] Unhandled error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}
