/**
 * Canonical post shape, normalized server-side (see normalizePost() on the
 * server). Facebook and Instagram share almost no raw field names for the same
 * concepts, so every component consumes THIS instead of a network's raw payload.
 */
export interface Post {
    postId: string;
    network: 'facebook' | 'instagram';
    url: string | null;
    imageUrl: string | null;
    text: string;
    publishedAt: string | null;
    type: string;

    impressions: number;
    /** null when the platform didn't report reach — Meta withholds it on ~85% of FB posts. */
    reach: number | null;
    likes: number;
    comments: number;
    shares: number;
    interactions: number;

    /** OUR rate: interactions ÷ impressions, %. Comparable across every post. */
    engagementRate: number;
    /** Metricool's own reach-based figure; 0 when reach is missing. */
    metricoolEngagement: number;

    saved: number | null;
    clicks: number | null;
    reactions: Record<string, number> | null;
    videoViews: number | null;
}
