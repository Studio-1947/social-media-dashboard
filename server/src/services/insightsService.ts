import { Network } from '../metrics';
import { METRICOOL_DEFAULT_TIMEZONE } from '../config/metricool';
import { WEEKDAY_NAMES, partsInZone } from '../lib/time';
import { fetchCompetitorEngagements, fetchPosts, type Post } from './metricoolService';

/**
 * Post-performance insights: what's working, and what to publish next.
 *
 * This is deliberately NOT a machine-learning model, and it should not be sold as
 * one. At these volumes (one client here has 1,319 posts/year; another has 31 in
 * total) a trained model would overfit and would not beat the statistics below —
 * it would just launder them through something harder to audit.
 *
 * What it does instead:
 *   - MEDIAN engagement per bucket, not mean. A single viral post drags a mean
 *     far enough to invert the ranking; the median is what the typical post in
 *     that bucket actually did.
 *   - Every bucket carries its sample size `n`, and any bucket below MIN_SAMPLE
 *     is marked `enoughData: false` and is never used for a recommendation.
 *   - Ranges (p25–p75), not point predictions. "Expect 4–9%" is honest;
 *     "we predict 6.3%" is not, from this data.
 *   - When the client simply hasn't posted enough, it returns confidence
 *     'insufficient' and says so rather than inventing advice.
 */

/** Below this a bucket is greyed out and never drives advice. */
const MIN_SAMPLE = 5;

/**
 * Below this many tracked competitors, a median engagement figure is one or
 * two accounts' noise, not a benchmark. Deliberately lower than MIN_SAMPLE —
 * unlike posts (where more data just means posting more), the competitor
 * count is a fixed configuration choice made once inside Metricool, so 3 is
 * the floor rather than a temporary "not enough yet" state.
 */
const MIN_COMPETITORS = 3;

/**
 * A bucket must clear THIS to be *recommended* (as opposed to merely shown). The
 * gap between the two thresholds is deliberate: 5 posts is enough to plot a bar,
 * but recommending "post at 6am" off 5 posts is how a lucky fluke becomes advice.
 * With 7 hour-bands, a client needs real volume before any single band is
 * trustworthy — so an under-posted client correctly gets "not enough data" for
 * time-of-day rather than a confident wrong answer.
 */
const REC_MIN_SAMPLE = 12;

/** Buckets for time-of-day. Finer than this and even the big client goes sparse. */
const HOUR_BANDS: { key: string; label: string; from: number; to: number }[] = [
  { key: 'early', label: '12am–6am', from: 0, to: 5 },
  { key: 'morning', label: '6am–9am', from: 6, to: 8 },
  { key: 'midday', label: '9am–12pm', from: 9, to: 11 },
  { key: 'afternoon', label: '12pm–3pm', from: 12, to: 14 },
  { key: 'lateafternoon', label: '3pm–6pm', from: 15, to: 17 },
  { key: 'evening', label: '6pm–9pm', from: 18, to: 20 },
  { key: 'night', label: '9pm–12am', from: 21, to: 23 },
];

const CAPTION_BANDS: { key: string; label: string; max: number }[] = [
  { key: 'short', label: 'Short (<100 chars)', max: 100 },
  { key: 'medium', label: 'Medium (100–300)', max: 300 },
  { key: 'long', label: 'Long (300–800)', max: 800 },
  { key: 'verylong', label: 'Very long (800+)', max: Infinity },
];

export interface Bucket {
  key: string;
  label: string;
  /** Sample size. The single most important number here — never hide it. */
  n: number;
  medianEngagement: number;
  /** null when the platform reported no reach for the posts in this bucket. */
  medianReach: number | null;
  /** % difference from this client's overall median engagement. */
  liftPct: number;
  /**
   * Shrinkage-adjusted median used for RANKING only (not shown). A small bucket's
   * raw median is unreliable — 5 posts that happened to do well shouldn't outrank
   * 105 solid ones. This pulls each bucket toward the account baseline in
   * proportion to how thin it is, so a bucket has to be both good AND well-evidenced
   * to rise to the top. The displayed number stays the honest raw median.
   */
  score: number;
  /** n ≥ MIN_SAMPLE: solid enough to display without a caveat. */
  enoughData: boolean;
  /** n ≥ REC_MIN_SAMPLE: solid enough to base a recommendation on. */
  reliable: boolean;
}

export type Confidence = 'high' | 'medium' | 'low' | 'insufficient';

export interface CompetitorBenchmark {
  medianEngagement: number;
  competitorCount: number;
  /** % difference between this account's baseline and the competitor median. */
  liftPct: number;
}

export interface Insights {
  network: Network;
  timezone: string;
  totalPosts: number;
  baseline: { medianEngagement: number; medianReach: number };
  /** null when fewer than MIN_COMPETITORS are tracked for this brand — not shown as a fake tie. */
  competitorBenchmark: CompetitorBenchmark | null;
  byType: Bucket[];
  byWeekday: Bucket[];
  byHourBand: Bucket[];
  byCaptionLength: Bucket[];
  topHashtags: { tag: string; n: number; medianEngagement: number; liftPct: number }[];
  topPosts: Post[];
  recommendation: {
    confidence: Confidence;
    /** Plain-language reasons, each tied to a sample size. */
    rationale: string[];
    format: Bucket | null;
    weekday: Bucket | null;
    hourBand: Bucket | null;
    captionLength: Bucket | null;
    hashtags: string[];
    /** p25–p75 of the matching historical posts, when there are enough of them. */
    expectedEngagement: { p25: number; median: number; p75: number } | null;
  };
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const median = (xs: number[]) => quantile([...xs].sort((a, b) => a - b), 0.5);

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Pseudo-count for shrinkage. Read it as "pretend every bucket also contains K
 * baseline-typical posts." A 5-post bucket is then ~2/3 baseline, 1/3 itself; a
 * 100-post bucket is almost entirely itself. K=8 is deliberately modest — enough
 * to defuse a lucky handful, not so much it flattens real differences.
 */
const SHRINK_K = 8;

function buildBucket(
  key: string,
  label: string,
  posts: Post[],
  baselineEngagement: number
): Bucket {
  const eng = posts.map((p) => p.engagementRate);
  // reach is null for posts Meta didn't report it on — median only the real ones.
  const reach = posts.map((p) => p.reach).filter((r): r is number => r != null);
  const med = median(eng);
  const n = posts.length;

  return {
    key,
    label,
    n,
    medianEngagement: round2(med),
    medianReach: reach.length ? Math.round(median(reach)) : null,
    liftPct: baselineEngagement > 0 ? round2((med / baselineEngagement - 1) * 100) : 0,
    score: (n * med + SHRINK_K * baselineEngagement) / (n + SHRINK_K),
    enoughData: n >= MIN_SAMPLE,
    reliable: n >= REC_MIN_SAMPLE,
  };
}

/** Groups posts, builds a bucket each, and sorts best-first among usable buckets. */
function bucketBy(
  posts: Post[],
  baseline: number,
  keyOf: (p: Post) => { key: string; label: string } | null
): Bucket[] {
  const groups = new Map<string, { label: string; posts: Post[] }>();

  for (const p of posts) {
    const k = keyOf(p);
    if (!k) continue;
    const g = groups.get(k.key) ?? { label: k.label, posts: [] };
    g.posts.push(p);
    groups.set(k.key, g);
  }

  return [...groups.entries()]
    .map(([key, g]) => buildBucket(key, g.label, g.posts, baseline))
    .sort((a, b) => {
      // Three tiers so the list and the recommendation always agree: reliable
      // buckets rank above merely-displayable ones, which rank above thin ones.
      // Within a tier, by shrinkage-adjusted score. This is why a 106-post band
      // sits above a 5-post band even when the small one's raw median is higher.
      if (a.reliable !== b.reliable) return a.reliable ? -1 : 1;
      if (a.enoughData !== b.enoughData) return a.enoughData ? -1 : 1;
      return b.score - a.score;
    });
}

/** "FEED_CAROUSEL_ALBUM" → "Carousel album"; "album" → "Album". */
function prettyType(type: string): string {
  const c = type.replace(/^FEED_/, '').replace(/_/g, ' ').toLowerCase();
  return c.charAt(0).toUpperCase() + c.slice(1) || 'Post';
}

/** \p{L} so Devanagari hashtags count — these captions are mostly Hindi. */
const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;

function hashtagsOf(post: Post): string[] {
  const found = post.text.match(HASHTAG_RE) ?? [];
  // De-dupe within a post so one caption spamming #x ten times counts once.
  return [...new Set(found.map((h) => h.toLowerCase()))];
}

/**
 * The bucket to recommend for a dimension: the highest-ranked one that clears the
 * reliability floor. Returns null when none do — which is the honest answer for a
 * dimension a low-volume client simply can't support (e.g. best hour from 34
 * posts), and the UI renders that as "Not enough data" rather than a guess.
 */
function bestReliable(buckets: Bucket[]): Bucket | null {
  return buckets.find((b) => b.reliable) ?? null;
}

/* ------------------------------------------------------------------ */

export interface InsightsRequest {
  network: Network;
  from: string;
  to: string;
  blogId?: string;
  timezone?: string;
}

export async function computeInsights({
  network,
  from,
  to,
  blogId,
  timezone,
}: InsightsRequest): Promise<Insights> {
  const tz = timezone || METRICOOL_DEFAULT_TIMEZONE;
  // Fetched together: competitors are an independent, optional lookup and must
  // never slow down or block the account's own post analysis (which is why
  // fetchCompetitorEngagements swallows its own errors and returns []).
  const [{ data }, competitorEngagements] = await Promise.all([
    fetchPosts({ network, from, to, blogId, timezone: tz }),
    fetchCompetitorEngagements({ network, from, to, blogId, timezone: tz }),
  ]);
  const all = data as Post[];

  // A post with no impressions never had a chance to engage anyone; including it
  // drags every median toward zero and is not informative about content quality.
  const posts = all.filter((p) => p.impressions > 0 && p.publishedAt);

  const engagements = posts.map((p) => p.engagementRate);
  const baselineEngagement = median(engagements);
  const reachValues = posts.map((p) => p.reach).filter((r): r is number => r != null);
  const baselineReach = reachValues.length ? median(reachValues) : 0;

  const byType = bucketBy(posts, baselineEngagement, (p) => ({
    key: p.type,
    label: prettyType(p.type),
  }));

  const byWeekday = bucketBy(posts, baselineEngagement, (p) => {
    const { weekday } = partsInZone(new Date(p.publishedAt!), tz);
    return { key: String(weekday), label: WEEKDAY_NAMES[weekday] };
  });

  const byHourBand = bucketBy(posts, baselineEngagement, (p) => {
    const { hour } = partsInZone(new Date(p.publishedAt!), tz);
    const band = HOUR_BANDS.find((b) => hour >= b.from && hour <= b.to);
    return band ? { key: band.key, label: band.label } : null;
  });

  const byCaptionLength = bucketBy(posts, baselineEngagement, (p) => {
    const len = p.text.length;
    const band = CAPTION_BANDS.find((b) => len < b.max)!;
    return { key: band.key, label: band.label };
  });

  // Hashtags: only those used often enough to say anything about.
  const tagGroups = new Map<string, Post[]>();
  for (const p of posts) {
    for (const tag of hashtagsOf(p)) {
      tagGroups.set(tag, [...(tagGroups.get(tag) ?? []), p]);
    }
  }

  const topHashtags = [...tagGroups.entries()]
    .filter(([, ps]) => ps.length >= MIN_SAMPLE)
    .map(([tag, ps]) => {
      const med = median(ps.map((p) => p.engagementRate));
      return {
        tag,
        n: ps.length,
        medianEngagement: round2(med),
        liftPct: baselineEngagement > 0 ? round2((med / baselineEngagement - 1) * 100) : 0,
      };
    })
    .sort((a, b) => b.medianEngagement - a.medianEngagement)
    .slice(0, 10);

  const topPosts = [...posts]
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, 5);

  /* ---------------- recommendation ---------------- */

  const format = bestReliable(byType);
  const weekday = bestReliable(byWeekday);
  const hourBand = bestReliable(byHourBand);
  const captionLength = bestReliable(byCaptionLength);

  let confidence: Confidence;
  if (posts.length >= 100 && (format?.n ?? 0) >= 20) confidence = 'high';
  else if (posts.length >= 40 && (format?.n ?? 0) >= 10) confidence = 'medium';
  else if (posts.length >= 15 && format) confidence = 'low';
  else confidence = 'insufficient';

  const rationale: string[] = [];

  // Only a group that is genuinely above the account average earns a mention, so
  // the "how we worked this out" text can never contradict the UI, which hides
  // sub-average picks. (Matches MEANINGFUL_LIFT in the frontend.)
  const isWin = (b: Bucket | null): b is Bucket => !!b && b.liftPct >= 3;

  if (confidence === 'insufficient') {
    rationale.push(
      `Only ${posts.length} post${posts.length === 1 ? '' : 's'} with data in this window — ` +
        `too few to recommend anything without guessing. Widen the date range, or wait until ` +
        `this client has published more.`
    );
  } else {
    // Every claim is tied to its post count, so the reader can judge it.
    if (isWin(format)) {
      rationale.push(
        `${format.label} posts typically get ${format.medianEngagement}% engagement — ` +
          `${format.liftPct}% more than this account's usual post — across ${format.n} posts.`
      );
    }
    if (isWin(weekday)) {
      rationale.push(
        `Posts on a ${weekday.label} did best: ${weekday.medianEngagement}% typically ` +
          `(${weekday.liftPct}% above usual), across ${weekday.n} posts.`
      );
    }
    if (isWin(hourBand)) {
      rationale.push(
        `Posting in the ${hourBand.label} window did best: ${hourBand.medianEngagement}% typically ` +
          `(${hourBand.liftPct}% above usual), across ${hourBand.n} posts. Times are ${tz}.`
      );
    }
    if (isWin(captionLength)) {
      rationale.push(
        `${captionLength.label} captions did best: ${captionLength.medianEngagement}% typically, across ${captionLength.n} posts.`
      );
    }
    if (!isWin(format) && !isWin(weekday) && !isWin(hourBand) && !isWin(captionLength)) {
      rationale.push(
        `No format, day or time clearly stood out above this account's average in this window — ` +
          `the differences are within normal noise.`
      );
    }
    if (confidence === 'low') {
      rationale.push(
        `Treat this as a weak signal — ${posts.length} posts is a thin base, and the ranking ` +
          `could change with a handful more.`
      );
    }
  }

  // Expected range = the posts that actually match the recommended format. We do
  // NOT intersect format+day+hour: that subset is usually tiny, and a range built
  // from 2 posts is worse than no range at all.
  let expectedEngagement: Insights['recommendation']['expectedEngagement'] = null;
  if (format) {
    const matching = posts
      .filter((p) => p.type === format.key)
      .map((p) => p.engagementRate)
      .sort((a, b) => a - b);

    if (matching.length >= MIN_SAMPLE) {
      expectedEngagement = {
        p25: round2(quantile(matching, 0.25)),
        median: round2(quantile(matching, 0.5)),
        p75: round2(quantile(matching, 0.75)),
      };
    }
  }

  let competitorBenchmark: CompetitorBenchmark | null = null;
  if (competitorEngagements.length >= MIN_COMPETITORS) {
    const competitorMedian = median(competitorEngagements);
    competitorBenchmark = {
      medianEngagement: round2(competitorMedian),
      competitorCount: competitorEngagements.length,
      liftPct:
        competitorMedian > 0 ? round2((baselineEngagement / competitorMedian - 1) * 100) : 0,
    };
  }

  return {
    network,
    timezone: tz,
    totalPosts: posts.length,
    baseline: {
      medianEngagement: round2(baselineEngagement),
      medianReach: Math.round(baselineReach),
    },
    competitorBenchmark,
    byType,
    byWeekday,
    byHourBand,
    byCaptionLength,
    topHashtags,
    topPosts,
    recommendation: {
      confidence,
      rationale,
      format,
      weekday,
      hourBand,
      captionLength,
      hashtags: topHashtags.filter((h) => h.liftPct > 0).slice(0, 5).map((h) => h.tag),
      expectedEngagement,
    },
  };
}
