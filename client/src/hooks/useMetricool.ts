import { useCallback, useEffect, useState } from 'react';
import {
    fetchCompetitors,
    fetchDistribution,
    fetchInsights,
    fetchPosts,
    fetchTimelines,
    type DateRange,
    type Network,
} from '../services/metricoolApi';
import {
    asSeriesArray,
    toDistribution,
    toSeries,
    type DistributionRow,
    type SeriesPoint,
} from '../lib/series';
import type { Insights } from '../types/insights';

/**
 * Data hooks for the network views.
 *
 * Three outcomes, kept strictly distinct — conflating them is what lets a broken
 * integration masquerade as a quiet month:
 *
 *   loading            → spinner
 *   error (request failed) → ErrorPanel. We know nothing; say so.
 *   empty (200, no points) → `isEmpty`, and the UI renders "No data".
 *
 * We do NOT substitute invented sample numbers for an empty metric. Several
 * metrics are genuinely empty on real accounts (Instagram profile views, website
 * clicks; Facebook reach on smaller pages), and a plausible-looking fake Reach
 * figure in front of a client is a liability no badge fully offsets.
 */

function errorMessage(err: unknown): string {
    const anyErr = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
    return (
        anyErr?.response?.data?.message ||
        anyErr?.response?.data?.error ||
        anyErr?.message ||
        'Unknown error'
    );
}

export interface TimelinesState {
    /** Metric key → points. Empty array when Metricool returned nothing. */
    series: Record<string, SeriesPoint[]>;
    /** Metric key → true when Metricool returned no points for this range. */
    isEmpty: Record<string, boolean>;
    loading: boolean;
    error: string | null;
    reload: () => void;
}

export function useTimelines(
    network: Network,
    metricKeys: string[],
    range: DateRange,
    blogId: number | null
): TimelinesState {
    const [state, setState] = useState<Omit<TimelinesState, 'reload'>>({
        series: {},
        isEmpty: {},
        loading: true,
        error: null,
    });
    const [nonce, setNonce] = useState(0);

    const keysKey = metricKeys.join(',');

    useEffect(() => {
        if (blogId == null) return;

        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: null }));

        fetchTimelines(network, keysKey.split(','), range, blogId)
            .then((res) => {
                if (cancelled) return;

                const series: Record<string, SeriesPoint[]> = {};
                const isEmpty: Record<string, boolean> = {};

                for (const key of keysKey.split(',')) {
                    // toSeries unwraps Metricool's {data:[{metric,values:[…]}]} nest
                    // and sorts oldest→newest (their ordering differs per network).
                    const points = toSeries(res.results?.[key]);
                    series[key] = points;
                    isEmpty[key] = points.length === 0;
                }

                setState({ series, isEmpty, loading: false, error: null });
            })
            .catch((err) => {
                if (cancelled) return;
                setState({ series: {}, isEmpty: {}, loading: false, error: errorMessage(err) });
            });

        return () => {
            cancelled = true;
        };
    }, [network, keysKey, range.from, range.to, blogId, nonce]);

    const reload = useCallback(() => setNonce((n) => n + 1), []);
    return { ...state, reload };
}

export interface DistributionState {
    rows: Record<string, DistributionRow[]>;
    isEmpty: Record<string, boolean>;
    loading: boolean;
    error: string | null;
}

export function useDistributions(
    network: Network,
    metricKeys: string[],
    range: DateRange,
    blogId: number | null
): DistributionState {
    const [state, setState] = useState<DistributionState>({
        rows: {},
        isEmpty: {},
        loading: true,
        error: null,
    });

    const keysKey = metricKeys.join(',');

    useEffect(() => {
        if (blogId == null || keysKey === '') {
            setState({ rows: {}, isEmpty: {}, loading: false, error: null });
            return;
        }

        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: null }));

        const keys = keysKey.split(',');

        Promise.allSettled(
            keys.map((key) => fetchDistribution(network, key, range, blogId))
        ).then((settled) => {
            if (cancelled) return;

            const rows: Record<string, DistributionRow[]> = {};
            const isEmpty: Record<string, boolean> = {};

            settled.forEach((outcome, i) => {
                const key = keys[i];
                const parsed =
                    outcome.status === 'fulfilled' ? toDistribution(outcome.value.data) : [];
                rows[key] = parsed;
                isEmpty[key] = parsed.length === 0;
            });

            setState({ rows, isEmpty, loading: false, error: null });
        });

        return () => {
            cancelled = true;
        };
    }, [network, keysKey, range.from, range.to, blogId]);

    return state;
}

export interface PostsState {
    posts: any[];
    isEmpty: boolean;
    loading: boolean;
    error: string | null;
}

export function usePosts(
    network: Network,
    range: DateRange,
    blogId: number | null,
    enabled = true
): PostsState {
    const [state, setState] = useState<PostsState>({
        posts: [],
        isEmpty: false,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (blogId == null || !enabled) {
            setState({ posts: [], isEmpty: false, loading: false, error: null });
            return;
        }

        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: null }));

        fetchPosts(network, range, blogId)
            .then((res) => {
                if (cancelled) return;
                const list = asSeriesArray(res.data) as any[];
                setState({ posts: list, isEmpty: list.length === 0, loading: false, error: null });
            })
            .catch((err) => {
                if (cancelled) return;
                setState({ posts: [], isEmpty: false, loading: false, error: errorMessage(err) });
            });

        return () => {
            cancelled = true;
        };
    }, [network, range.from, range.to, blogId, enabled]);

    return state;
}

/**
 * Live presence check for competitors — the tab appears only if this client
 * actually has competitor profiles configured in Metricool's own UI.
 *
 * Competitors are opt-in per brand and cannot be enabled through the API. On this
 * account none of the four clients have any, so the tab is hidden everywhere;
 * that is the expected state, not a bug. `null` means "still checking": render
 * nothing until it resolves rather than flashing a tab that then disappears.
 */
export function useHasCompetitors(
    network: Network,
    range: DateRange,
    blogId: number | null
): boolean | null {
    const [hasCompetitors, setHasCompetitors] = useState<boolean | null>(null);

    useEffect(() => {
        if (blogId == null) return;

        let cancelled = false;
        setHasCompetitors(null);

        fetchCompetitors(network, range, blogId)
            .then((res) => {
                if (!cancelled) setHasCompetitors(asSeriesArray(res.data).length > 0);
            })
            .catch(() => {
                // A failed check means "don't show the tab", not "show an error" —
                // competitors are optional and their absence is the normal case.
                if (!cancelled) setHasCompetitors(false);
            });

        return () => {
            cancelled = true;
        };
    }, [network, range.from, range.to, blogId]);

    return hasCompetitors;
}

export interface InsightsState {
    insights: Insights | null;
    loading: boolean;
    error: string | null;
    reload: () => void;
}

export function useInsights(
    network: Network,
    range: DateRange,
    blogId: number | null,
    enabled = true
): InsightsState {
    const [state, setState] = useState<Omit<InsightsState, 'reload'>>({
        insights: null,
        loading: true,
        error: null,
    });
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        if (blogId == null || !enabled) return;

        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: null }));

        fetchInsights(network, range, blogId)
            .then((insights) => {
                if (!cancelled) setState({ insights, loading: false, error: null });
            })
            .catch((err) => {
                if (!cancelled) setState({ insights: null, loading: false, error: errorMessage(err) });
            });

        return () => {
            cancelled = true;
        };
    }, [network, range.from, range.to, blogId, enabled, nonce]);

    const reload = useCallback(() => setNonce((n) => n + 1), []);
    return { ...state, reload };
}
