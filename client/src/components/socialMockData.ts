import type { SeriesPoint, DistributionRow } from '../lib/series';

/**
 * Hand-written sample data, used ONLY when Metricool returns an empty series for
 * a metric + date range.
 *
 * Two rules, both non-negotiable:
 *   1. Every render of this data is paired with a visible <SampleDataBadge />.
 *      Never substitute silently.
 *   2. The numbers are deliberately small and unremarkable. They exist so the UI
 *      doesn't look broken during a demo or a transient failure — not to flatter
 *      anyone. Nobody should ever mistake these for a real result.
 */

function ramp(days: number, start: number, drift: number, jitter: number): SeriesPoint[] {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (days - 1 - i));
        // Deterministic wobble — a fixed shape, not Math.random(), so the mock
        // doesn't flicker on every re-render.
        const wave = Math.sin(i * 0.7) * jitter;
        return {
            date: d.toISOString().slice(0, 10),
            value: Math.max(0, Math.round(start + drift * i + wave)),
        };
    });
}

const DAYS = 30;

export const mockTimelines: Record<string, SeriesPoint[]> = {
    followers: ramp(DAYS, 1240, 3, 4),
    newFollowers: ramp(DAYS, 8, 0, 3),
    lostFollowers: ramp(DAYS, 3, 0, 2),
    deltaFollowers: ramp(DAYS, 5, 0, 3),
    reach: ramp(DAYS, 820, 6, 140),
    impressions: ramp(DAYS, 1100, 8, 180),
    profileViews: ramp(DAYS, 46, 0, 12),
    clicks: ramp(DAYS, 22, 0, 8),
    reactions: ramp(DAYS, 34, 0, 11),
    interactions: ramp(DAYS, 58, 0, 16),
    accountsEngaged: ramp(DAYS, 41, 0, 12),
    postsCount: ramp(DAYS, 1, 0, 1),

    subscribers: ramp(DAYS, 3120, 5, 6),
    views: ramp(DAYS, 640, 4, 120),
    videos: ramp(DAYS, 1, 0, 1),
    subscribersGained: ramp(DAYS, 9, 0, 4),
    subscribersLost: ramp(DAYS, 2, 0, 2),
};

export const mockDistributions: Record<string, DistributionRow[]> = {
    gender: [
        { label: 'F', value: 58 },
        { label: 'M', value: 39 },
        { label: 'U', value: 3 },
    ],
    age: [
        { label: '13-17', value: 4 },
        { label: '18-24', value: 26 },
        { label: '25-34', value: 38 },
        { label: '35-44', value: 19 },
        { label: '45-54', value: 9 },
        { label: '55-64', value: 3 },
        { label: '65+', value: 1 },
    ],
    country: [
        { label: 'IN', value: 712 },
        { label: 'NP', value: 148 },
        { label: 'US', value: 96 },
        { label: 'AE', value: 41 },
        { label: 'GB', value: 28 },
    ],
    city: [
        { label: 'Delhi', value: 214 },
        { label: 'Mumbai', value: 168 },
        { label: 'Kathmandu', value: 121 },
        { label: 'Bengaluru', value: 94 },
        { label: 'Kolkata', value: 77 },
    ],
    postsTypes: [
        { label: 'IMAGE', value: 18 },
        { label: 'REEL', value: 11 },
        { label: 'CAROUSEL', value: 7 },
        { label: 'VIDEO', value: 3 },
    ],
};

export const mockPosts = [
    {
        postId: 'sample-1',
        content: 'Sample post — Metricool returned no posts for this range.',
        type: 'IMAGE',
        publishedAt: { dateTime: new Date(Date.now() - 2 * 864e5).toISOString() },
        views: 1420,
        reach: 1180,
        likes: 96,
        comments: 7,
        saved: 12,
        shares: 4,
        engagement: 8.1,
        interactions: 119,
        imageUrl: '',
        url: '',
    },
    {
        postId: 'sample-2',
        content: 'Sample post — figures below are illustrative, not real.',
        type: 'REEL',
        publishedAt: { dateTime: new Date(Date.now() - 6 * 864e5).toISOString() },
        views: 3260,
        reach: 2740,
        likes: 184,
        comments: 21,
        saved: 33,
        shares: 15,
        engagement: 9.6,
        interactions: 253,
        imageUrl: '',
        url: '',
    },
    {
        postId: 'sample-3',
        content: 'Sample post — connect this client in Metricool to see real posts.',
        type: 'CAROUSEL',
        publishedAt: { dateTime: new Date(Date.now() - 11 * 864e5).toISOString() },
        views: 980,
        reach: 810,
        likes: 63,
        comments: 4,
        saved: 9,
        shares: 2,
        engagement: 7.4,
        interactions: 78,
        imageUrl: '',
        url: '',
    },
];
