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
import { wallTimeToUtc } from '../lib/time';

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

/**
 * One canonical post shape for the UI.
 *
 * Facebook and Instagram share almost NO field names for the same concepts —
 * verified live:
 *
 *   concept      instagram          facebook
 *   image        imageUrl           picture
 *   caption      content            text
 *   published    publishedAt.dateTime   created.dateTime
 *   permalink    url                link
 *   likes        likes              like        (singular!)
 *   reach        reach              impressionsUnique
 *   views        views/impressionsTotal  impressions
 *
 * Reconciling that in the component is how you end up with a table of zeros,
 * "Invalid Date" and missing thumbnails for one network. Normalize here, once.
 */
export interface Post {
  postId: string;
  network: Network;
  url: string | null;
  imageUrl: string | null;
  text: string;
  /** ISO-ish datetime string, or null when the payload had none. */
  publishedAt: string | null;
  type: string;

  impressions: number;
  /**
   * null when the platform didn't report it. Meta withholds unique impressions
   * for ~85% of Facebook posts — those arrive as 0 alongside thousands of
   * impressions, which is "unknown", not "nobody saw it". Rendering that 0 as a
   * real number is a lie about the post's performance.
   */
  reach: number | null;
  likes: number;
  comments: number;
  shares: number;
  /** likes + comments + shares (+ saves on Instagram). */
  interactions: number;

  /**
   * OUR engagement rate: interactions ÷ impressions, as a percentage.
   *
   * We compute this rather than use Metricool's `engagement` because Metricool
   * divides by REACH — and with reach missing on 85% of Facebook posts, its
   * engagement is 0 for 85% of them. A median over that is 0%, which made every
   * Facebook insight meaningless. Impressions are reported for every post, so
   * this is the only denominator that yields a comparable number across a whole
   * account. It is consistently lower than Metricool's reach-based figure — the
   * UI must say which one it's showing.
   */
  engagementRate: number;
  /** Metricool's own reach-based figure. Kept for parity/debugging; 0 when reach is missing. */
  metricoolEngagement: number;

  /** Instagram only — Facebook doesn't report saves. */
  saved: number | null;
  /** Facebook only — Instagram doesn't report post clicks. */
  clicks: number | null;
  /** Facebook only: the reaction mix behind the total. */
  reactions: Record<string, number> | null;
  videoViews: number | null;
}

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};

/**
 * Resolve a post's true publication instant, as a UTC ISO string.
 *
 * Metricool stamps posts in ITS OWN server timezone (Europe/Madrid) and labels
 * them as such, regardless of the `timezone` we ask for. The naive string is
 * therefore 3.5h off for an IST audience. Prefer the epoch `timestamp` when
 * present (Facebook has it, unambiguous); otherwise convert the wall-clock string
 * from its declared zone. See lib/time.ts.
 */
const publishedInstant = (raw: Record<string, any>): string | null => {
  if (typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp)) {
    return new Date(raw.timestamp).toISOString();
  }

  const stamp = raw.publishedAt ?? raw.created;
  if (!stamp) return null;

  if (typeof stamp === 'string') return stamp;

  const { dateTime, timezone } = stamp as { dateTime?: string; timezone?: string };
  if (typeof dateTime !== 'string') return null;

  const utc = wallTimeToUtc(dateTime, timezone || 'UTC');
  return utc ? utc.toISOString() : null;
};

function normalizePost(raw: Record<string, any>, network: Network): Post {
  const isFacebook = network === 'facebook';

  const impressions = num(raw.impressionsTotal ?? raw.views ?? raw.impressions);

  // 0 reach against non-zero impressions means "not reported", not "zero people".
  const rawReach = num(raw.reach ?? raw.impressionsUnique);
  const reach = rawReach > 0 ? rawReach : null;

  // Facebook's total reaction count is the meaningful "likes" analogue; `like`
  // alone is just one reaction type.
  const likes = isFacebook ? num(raw.reactions ?? raw.like) : num(raw.likes);
  const comments = num(raw.comments);
  const shares = num(raw.shares);
  const saved = isFacebook ? null : num(raw.saved);

  const interactions = likes + comments + shares + (saved ?? 0);

  return {
    postId: String(raw.postId ?? raw.internalSearchId ?? ''),
    network,
    url: raw.url ?? raw.link ?? null,
    imageUrl: raw.imageUrl ?? raw.picture ?? null,
    text: String(raw.content ?? raw.text ?? raw.caption ?? ''),
    publishedAt: publishedInstant(raw),
    type: String(raw.type ?? 'POST'),

    impressions,
    reach,
    likes,
    comments,
    shares,
    interactions,

    engagementRate: impressions > 0 ? (interactions / impressions) * 100 : 0,
    metricoolEngagement: num(raw.engagement),

    saved,
    clicks: isFacebook ? num(raw.clicks) : null,
    reactions: isFacebook
      ? {
          like: num(raw.like),
          love: num(raw.love),
          haha: num(raw.haha),
          wow: num(raw.wow),
          sorry: num(raw.sorry),
          anger: num(raw.anger),
        }
      : null,
    videoViews: isFacebook ? num(raw.videoViews) : null,
  };
}

export async function fetchPosts({ network, from, to, blogId, timezone }: PostsRequest) {
  // YouTube always returns {"data":[]} here regardless of range — don't bother
  // Metricool with the call, and let the UI hide the section.
  if (!NETWORK_CAPABILITIES[network].posts) {
    return { data: [], supported: false };
  }

  const raw = await metricoolGet<unknown>({
    path: `/api/v2/analytics/posts/${network}`,
    params: {
      from,
      to,
      timezone: timezone || METRICOOL_DEFAULT_TIMEZONE,
      blogId: resolveBlogId(blogId),
    },
  });

  // Wrapped as { data: [...] }, same as the analytics endpoints.
  const items: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as any)?.data)
      ? (raw as any).data
      : [];

  const posts = items
    .filter((p): p is Record<string, any> => Boolean(p) && typeof p === 'object')
    .map((p) => normalizePost(p, network))
    // Newest first — Metricool's ordering here is not guaranteed either.
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));

  return { data: posts, supported: true };
}

/**
 * `limit` is REQUIRED here, which no documentation mentions. Omitting it does not
 * return an empty list — it returns
 *   400 ValidationError {"limit":"must not be blank; Invalid value 'null'."}
 * on every brand and every network. Because the HTTP client records each failure
 * into the health tracker, those 400s dragged /health to "failing" and made it
 * serve 503 — i.e. a perfectly healthy integration would have paged on-call,
 * purely because of a missing query param on an optional feature.
 *
 * With `limit` supplied it behaves exactly as documented: 200 with an empty list
 * until competitor profiles are added for the brand inside Metricool's own UI.
 * That is not a plan restriction and not an API-controllable toggle, so the UI
 * treats an empty list as "hide the tab", never as an error.
 */
const COMPETITORS_LIMIT = 50;

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
      limit: COMPETITORS_LIMIT,
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
