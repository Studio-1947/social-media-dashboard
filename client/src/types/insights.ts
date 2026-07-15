import type { Post } from './post';

/** Mirrors the server's insightsService output. Statistical, not ML. */

export interface Bucket {
    key: string;
    label: string;
    /** Sample size — the number that decides whether to trust the rest of the row. */
    n: number;
    medianEngagement: number;
    medianReach: number | null;
    /** % difference from this account's overall median engagement. */
    liftPct: number;
    /** n ≥ display minimum: shown without a caveat. Below it, greyed out. */
    enoughData: boolean;
    /** n ≥ recommendation minimum: solid enough to base advice on. */
    reliable: boolean;
}

export type Confidence = 'high' | 'medium' | 'low' | 'insufficient';

export interface CompetitorBenchmark {
    medianEngagement: number;
    competitorCount: number;
    /** % difference between this account's baseline and the competitor median. */
    liftPct: number;
}

export interface HashtagStat {
    tag: string;
    n: number;
    medianEngagement: number;
    liftPct: number;
}

export interface Recommendation {
    confidence: Confidence;
    rationale: string[];
    format: Bucket | null;
    weekday: Bucket | null;
    hourBand: Bucket | null;
    captionLength: Bucket | null;
    hashtags: string[];
    expectedEngagement: { p25: number; median: number; p75: number } | null;
}

export interface Insights {
    network: 'facebook' | 'instagram';
    timezone: string;
    totalPosts: number;
    baseline: { medianEngagement: number; medianReach: number };
    /** null when fewer than 3 competitors are tracked for this brand. */
    competitorBenchmark: CompetitorBenchmark | null;
    byType: Bucket[];
    byWeekday: Bucket[];
    byHourBand: Bucket[];
    byCaptionLength: Bucket[];
    topHashtags: HashtagStat[];
    topPosts: Post[];
    recommendation: Recommendation;
}
