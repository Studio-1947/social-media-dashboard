import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MetricoolError, metricoolGet } from '../config/metricool';
import {
  DISTRIBUTION_METRICS,
  NETWORKS,
  NETWORK_CAPABILITIES,
  SUBJECTS,
  TIMELINE_METRICS,
} from '../metrics';
import {
  fetchBrands,
  fetchCompetitors,
  fetchDistribution,
  fetchPosts,
  fetchTimeline,
} from '../services/metricoolService';

export const metricoolRouter = Router();

/** Metricool wants `2025-11-17T00:00:00`, not an ISO string with a Z suffix. */
const dateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/,
    'Expected YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss'
  );

const rangeSchema = z.object({
  from: dateTime,
  to: dateTime,
  blogId: z.string().regex(/^\d+$/).optional(),
  timezone: z.string().optional(),
});

const networkSchema = z.enum(NETWORKS);

const analyticsSchema = rangeSchema.extend({
  network: networkSchema,
  metric: z.string().min(1),
  // Explicit override only. The metric table already carries the correct
  // subject — never infer it from the metric name.
  subject: z.enum(SUBJECTS).optional(),
});

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

/** The client list. Drives the switcher AND per-client tab visibility. */
metricoolRouter.get(
  '/brands',
  asyncRoute(async (_req, res) => {
    const brands = await fetchBrands();
    res.json({ brands });
  })
);

/* ------------------------------------------------------------------ */
/* Capabilities                                                        */
/* ------------------------------------------------------------------ */

/** What Social Flow knows how to render — lets the frontend stay dumb. */
metricoolRouter.get('/capabilities', (_req, res) => {
  res.json({
    networks: NETWORKS,
    capabilities: NETWORK_CAPABILITIES,
    timelineMetrics: TIMELINE_METRICS,
    distributionMetrics: DISTRIBUTION_METRICS,
  });
});

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

metricoolRouter.get(
  '/timeline',
  asyncRoute(async (req, res) => {
    const params = analyticsSchema.parse(req.query);
    const result = await fetchTimeline(params);
    res.json(result);
  })
);

/** Batch several timeline metrics in one round trip — the queue handles pacing. */
metricoolRouter.get(
  '/timelines',
  asyncRoute(async (req, res) => {
    const params = rangeSchema
      .extend({
        network: networkSchema,
        metrics: z.string().min(1),
      })
      .parse(req.query);

    const keys = params.metrics.split(',').map((m) => m.trim()).filter(Boolean);

    const settled = await Promise.allSettled(
      keys.map((metric) => fetchTimeline({ ...params, metric }))
    );

    const results: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    settled.forEach((outcome, i) => {
      const key = keys[i];
      if (outcome.status === 'fulfilled') {
        results[key] = outcome.value.data;
      } else {
        errors[key] = (outcome.reason as Error).message;
      }
    });

    res.json({ results, errors: Object.keys(errors).length ? errors : undefined });
  })
);

metricoolRouter.get(
  '/distribution',
  asyncRoute(async (req, res) => {
    const params = analyticsSchema.parse(req.query);
    const result = await fetchDistribution(params);
    res.json(result);
  })
);

metricoolRouter.get(
  '/posts/:network',
  asyncRoute(async (req, res) => {
    const network = networkSchema.parse(req.params.network);
    const params = rangeSchema.parse(req.query);
    const result = await fetchPosts({ network, ...params });
    res.json(result);
  })
);

metricoolRouter.get(
  '/competitors/:network',
  asyncRoute(async (req, res) => {
    const network = networkSchema.parse(req.params.network);
    const params = rangeSchema.parse(req.query);
    const result = await fetchCompetitors({ network, ...params });
    res.json(result);
  })
);

/* ------------------------------------------------------------------ */
/* Metric discovery probe (§8)                                         */
/* ------------------------------------------------------------------ */

/**
 * Sends a deliberately invalid metric so Metricool's validation error lists
 * every valid enum value for that endpoint+network. This is the only reliable
 * way to enumerate metrics — run it before adding any new network, and confirm
 * each candidate returns non-empty data before wiring it into the UI.
 *
 * Dev-only: it exists to be run by a human, not by the app.
 */
if (process.env.NODE_ENV !== 'production') {
  metricoolRouter.get(
    '/_probe',
    asyncRoute(async (req, res) => {
      const params = z
        .object({
          network: networkSchema,
          endpoint: z.enum(['timelines', 'distribution']).default('timelines'),
          subject: z.enum(SUBJECTS).default('account'),
          blogId: z.string().regex(/^\d+$/).optional(),
        })
        .parse(req.query);

      try {
        await metricoolGet({
          path: `/api/v2/analytics/${params.endpoint}`,
          params: {
            metric: '__socialflow_invalid_probe__',
            network: params.network,
            subject: params.subject,
            from: '2025-01-01T00:00:00',
            to: '2025-01-02T00:00:00',
            blogId: params.blogId,
          },
          noCache: true,
        });
        res.json({
          note: 'Probe unexpectedly succeeded — Metricool did not reject the invalid metric.',
        });
      } catch (error) {
        const err = error as MetricoolError;
        // The 400 body is the payload we actually want: it enumerates the
        // valid metric names.
        res.json({
          status: err.status,
          validValuesMessage: err.message,
          upstream: err.upstreamBody,
        });
      }
    })
  );
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

metricoolRouter.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
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

    console.error('[SocialFlow] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
);
