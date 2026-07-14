import {
  metricoolGet,
  METRICOOL_DEFAULT_BLOG_ID,
  METRICOOL_DEFAULT_TIMEZONE,
  MetricoolError,
} from '../config/metricool';
import {
  DISTRIBUTION_METRICS,
  NETWORK_CAPABILITIES,
  Network,
  Subject,
  TIMELINE_METRICS,
  getDistributionSpec,
  getTimelineSpec,
} from '../metrics';

/* ------------------------------------------------------------------ */
/* Brands (= clients)                                                  */
/* ------------------------------------------------------------------ */

/**
 * Metricool's PublicBlog. A network is "connected" iff its field is non-null —
 * there is no separate boolean flag. This one endpoint is the entire basis for
 * the per-client tab system.
 */
export interface PublicBlog {
  id: number;
  label: string | null;
  picture: string | null;
  facebook: string | null;
  facebookPageId: string | null;
  instagram: string | null;
  youtube: string | null;
  linkedinCompany: string | null;
  tiktok: string | null;
  twitter: string | null;
  threads: string | null;
  pinterest: string | null;
  gmb: string | null;
  bluesky: string | null;
  facebookAds: string | null;
  [key: string]: unknown;
}

/** What Social Flow's frontend actually consumes for a client. */
export interface Brand {
  blogId: number;
  name: string;
  picture: string | null;
  /** Networks connected in Metricool for this client. */
  connectedNetworks: string[];
}

const ALL_NETWORK_FIELDS = [
  'facebook',
  'instagram',
  'youtube',
  'linkedinCompany',
  'tiktok',
  'twitter',
  'threads',
  'pinterest',
  'gmb',
  'bluesky',
] as const;

function toBrand(blog: PublicBlog): Brand {
  const connectedNetworks = ALL_NETWORK_FIELDS.filter((field) =>
    Boolean(blog[field])
  );

  return {
    blogId: blog.id,
    name: blog.label?.trim() || `Brand ${blog.id}`,
    picture: blog.picture ?? null,
    connectedNetworks,
  };
}

/**
 * Uses /api/admin/simpleProfiles — NOT /api/admin/profile, which Metricool's
 * own OpenAPI spec marks deprecated.
 */
export async function fetchBrands(): Promise<Brand[]> {
  const data = await metricoolGet<PublicBlog[]>({
    path: '/api/admin/simpleProfiles',
  });

  if (!Array.isArray(data)) return [];
  return data.map(toBrand);
}

export async function fetchBrand(blogId: string | number): Promise<Brand | undefined> {
  const brands = await fetchBrands();
  return brands.find((b) => String(b.blogId) === String(blogId));
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

export interface AnalyticsRequest {
  network: Network;
  /** Frontend metric key (e.g. "followers"), resolved to Metricool's real name. */
  metric: string;
  from: string;
  to: string;
  blogId?: string;
  timezone?: string;
  /** Override the subject from the metric table. Rarely needed. */
  subject?: Subject;
}

function resolveBlogId(blogId?: string): string {
  const resolved = blogId || METRICOOL_DEFAULT_BLOG_ID;
  if (!resolved) {
    throw new MetricoolError(
      'No blogId supplied and METRICOOL_BLOG_ID is not set.',
      400
    );
  }
  return resolved;
}

export interface SeriesPoint {
  dateTime?: string;
  value?: number;
  [key: string]: unknown;
}

export async function fetchTimeline({
  network,
  metric,
  from,
  to,
  blogId,
  timezone,
  subject,
}: AnalyticsRequest) {
  const spec = getTimelineSpec(network, metric);
  if (!spec) {
    const valid = TIMELINE_METRICS[network].map((m) => m.key).join(', ');
    throw new MetricoolError(
      `Unknown timeline metric "${metric}" for ${network}. Valid keys: ${valid}`,
      400
    );
  }

  const data = await metricoolGet<unknown>({
    path: '/api/v2/analytics/timelines',
    params: {
      metric: spec.metric,
      network,
      // Always explicit. Inferring subject from the metric name is the single
      // biggest source of bugs against this API.
      subject: subject ?? spec.subject,
      from,
      to,
      timezone: timezone || METRICOOL_DEFAULT_TIMEZONE,
      blogId: resolveBlogId(blogId),
    },
  });

  return { key: spec.key, metric: spec.metric, label: spec.label, data };
}

export async function fetchDistribution({
  network,
  metric,
  from,
  to,
  blogId,
  timezone,
  subject,
}: AnalyticsRequest) {
  if (!NETWORK_CAPABILITIES[network].distribution) {
    throw new MetricoolError(
      `Metricool does not support distribution metrics for ${network}.`,
      400
    );
  }

  const spec = getDistributionSpec(network, metric);
  if (!spec) {
    const valid = DISTRIBUTION_METRICS[network].map((m) => m.key).join(', ');
    throw new MetricoolError(
      `Unknown distribution metric "${metric}" for ${network}. Valid keys: ${valid}`,
      400
    );
  }

  const data = await metricoolGet<unknown>({
    path: '/api/v2/analytics/distribution',
    params: {
      metric: spec.metric,
      network,
      subject: subject ?? spec.subject,
      from,
      to,
      timezone: timezone || METRICOOL_DEFAULT_TIMEZONE,
      blogId: resolveBlogId(blogId),
    },
  });

  return { key: spec.key, metric: spec.metric, label: spec.label, data };
}

export interface PostsRequest {
  network: Network;
  from: string;
  to: string;
  blogId?: string;
  timezone?: string;
}

export async function fetchPosts({ network, from, to, blogId, timezone }: PostsRequest) {
  // YouTube always returns {"data":[]} here regardless of range — don't bother
  // Metricool with the call, and let the UI hide the section.
  if (!NETWORK_CAPABILITIES[network].posts) {
    return { data: [], supported: false };
  }

  const data = await metricoolGet<unknown>({
    path: `/api/v2/analytics/posts/${network}`,
    params: {
      from,
      to,
      timezone: timezone || METRICOOL_DEFAULT_TIMEZONE,
      blogId: resolveBlogId(blogId),
    },
  });

  return { data, supported: true };
}

/**
 * Returns [] until competitor profiles are added for the brand inside
 * Metricool's own dashboard. It is not a plan restriction and not an
 * API-controllable toggle, so the UI must treat an empty list as
 * "hide the tab", not "error".
 */
export async function fetchCompetitors({ network, from, to, blogId, timezone }: PostsRequest) {
  if (!NETWORK_CAPABILITIES[network].competitors) {
    return { data: [], supported: false };
  }

  const data = await metricoolGet<unknown>({
    path: `/api/v2/analytics/competitors/${network}`,
    params: {
      from,
      to,
      timezone: timezone || METRICOOL_DEFAULT_TIMEZONE,
      blogId: resolveBlogId(blogId),
    },
  });

  return { data, supported: true };
}

/* ------------------------------------------------------------------ */
/* Startup self-check                                                  */
/* ------------------------------------------------------------------ */

/**
 * Fires one deliberate call at boot and logs loudly either way.
 *
 * This exists because a stale credential previously failed silently for ~2
 * weeks, with a small "Sample data" badge as the only symptom. For a
 * multi-client product this matters more, not less: a broken credential should
 * page you, not be discovered by a client noticing their follower count is
 * fiction.
 */
export async function runMetricoolStartupCheck(): Promise<void> {
  try {
    const brands = await fetchBrands();

    if (brands.length === 0) {
      console.warn(
        '[Metricool] STARTUP CHECK: authenticated, but the account has 0 brands. ' +
          'Social Flow will have no clients to show.'
      );
      return;
    }

    const defaultBlogId = METRICOOL_DEFAULT_BLOG_ID;
    const active =
      brands.find((b) => String(b.blogId) === String(defaultBlogId)) ?? brands[0];

    console.log(
      `[Metricool] OK — ${brands.length} client(s) available. ` +
        `Default: "${active.name}" (blogId ${active.blogId}). ` +
        `Networks: ${active.connectedNetworks.join(', ') || 'none'}`
    );

    if (defaultBlogId && !brands.some((b) => String(b.blogId) === String(defaultBlogId))) {
      console.warn(
        `[Metricool] WARNING — METRICOOL_BLOG_ID=${defaultBlogId} is not a brand on this ` +
          `account. Falling back to "${active.name}" (blogId ${active.blogId}).`
      );
    }
  } catch (error) {
    const err = error as MetricoolError;
    console.error(
      '[Metricool] STARTUP CHECK FAILED — token/userId/blogId may be wrong or expired. ' +
        `Status: ${err.status ?? 'n/a'}. Message: ${err.message}`
    );
  }
}
