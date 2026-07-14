import { useCallback, useEffect, useState } from 'react';
import {
    fetchCompetitors,
    fetchDistribution,
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
import { mockDistributions, mockPosts, mockTimelines } from '../components/socialMockData';

/**
 * Data hooks for the network views.
 *
 * The rule they all encode: an empty-but-successful response falls back to
 * sample data and reports `isSample`, so the caller can badge it. A *failed*
 * request does not — it surfaces as `error`, because pretending a broken
 * credential is "no data this month" is the exact failure that hid a stale token
 * for two weeks.
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
    /** Metric key → points. Falls back to sample data when Metricool returned nothing. */
    series: Record<string, SeriesPoint[]>;
    /** Metric key → true when the series above is sample data, not real. */
    isSample: Record<string, boolean>;
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
        isSample: {},
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
                const isSample: Record<string, boolean> = {};

                for (const key of keysKey.split(',')) {
                    const points = toSeries(res.results?.[key]);

                    if (points.length > 0) {
                        series[key] = points;
                        isSample[key] = false;
                    } else {
                        // Empty (or per-metric failed) — badge it, never pass it off as real.
                        series[key] = mockTimelines[key] ?? [];
                        isSample[key] = true;
                    }
                }

                setState({ series, isSample, loading: false, error: null });
            })
            .catch((err) => {
                if (cancelled) return;
                setState({ series: {}, isSample: {}, loading: false, error: errorMessage(err) });
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
    isSample: Record<string, boolean>;
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
        isSample: {},
        loading: true,
        error: null,
    });

    const keysKey = metricKeys.join(',');

    useEffect(() => {
        if (blogId == null || keysKey === '') {
            setState({ rows: {}, isSample: {}, loading: false, error: null });
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
            const isSample: Record<string, boolean> = {};

            settled.forEach((outcome, i) => {
                const key = keys[i];
                const parsed =
                    outcome.status === 'fulfilled' ? toDistribution(outcome.value.data) : [];

                if (parsed.length > 0) {
                    rows[key] = parsed;
                    isSample[key] = false;
                } else {
                    rows[key] = mockDistributions[key] ?? [];
                    isSample[key] = true;
                }
            });

            setState({ rows, isSample, loading: false, error: null });
        });

        return () => {
            cancelled = true;
        };
    }, [network, keysKey, range.from, range.to, blogId]);

    return state;
}

export interface PostsState {
    posts: any[];
    isSample: boolean;
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
        isSample: false,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (blogId == null || !enabled) {
            setState({ posts: [], isSample: false, loading: false, error: null });
            return;
        }

        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: null }));

        fetchPosts(network, range, blogId)
            .then((res) => {
                if (cancelled) return;
                const list = asSeriesArray(res.data);

                setState({
                    posts: list.length ? list : mockPosts,
                    isSample: list.length === 0,
                    loading: false,
                    error: null,
                });
            })
            .catch((err) => {
                if (cancelled) return;
                setState({ posts: [], isSample: false, loading: false, error: errorMessage(err) });
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
 * Competitors are opt-in per brand and cannot be enabled through the API, so
 * most clients will have none. `null` means "still checking": render nothing
 * until it resolves rather than flashing a tab that then disappears.
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
