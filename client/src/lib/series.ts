/**
 * Normalizers for Metricool's time-series payloads.
 *
 * Metricool is inconsistent about whether a series arrives as a bare array or
 * wrapped in `{ values: [...] }`. NEVER write `candidate?.values ?? candidate`
 * to paper over that: when `candidate` is a plain array, `.values` resolves to
 * `Array.prototype.values` — the built-in iterator method, always truthy — so
 * the `??` fallback never fires and every downstream `Array.isArray` check
 * fails. That exact bug pinned Instagram's growth chart to fabricated sample
 * data indefinitely, silently, with no error anywhere.
 *
 * Go through asSeriesArray() instead.
 */

export interface SeriesPoint {
    date: string;
    value: number;
}

/** `{ metric: "followers", values: [...] }` — Metricool's per-metric wrapper. */
function isMetricWrapper(x: unknown): x is { values: unknown[] } {
    return Boolean(x) && typeof x === 'object' && Array.isArray((x as any).values);
}

/**
 * The only safe way to get an array of points out of a Metricool container.
 *
 * Verified against the live API, the timelines shape is a THREE-level nest:
 *
 *     { data: [ { metric: "followers", values: [ {dateTime, value}, … ] } ] }
 *
 * The trap: `.data` is an array, so a naive "if data is an array, that's the
 * points" check returns the one-element array of *wrappers* instead of the
 * points inside them. Every point then parses as undefined, the series looks
 * empty, and the UI falls back to sample data while real data is right there.
 * That is the same silent-empty failure the reference doc warns about, one level
 * deeper — so unwrap explicitly and let the shapes be self-describing.
 *
 * Distribution is only two levels (`{ data: [ {key, value}, … ] }`) and has no
 * wrapper, which is why the same code path must handle both.
 */
export function asSeriesArray(candidate: unknown, depth = 0): unknown[] {
    if (depth > 4) return []; // paranoia against a self-referential payload

    if (Array.isArray(candidate)) {
        // An array of per-metric wrappers → flatten to the points they hold.
        // Never read `.values` off the array itself: on a plain array that
        // resolves to Array.prototype.values, the iterator function.
        const wrappers = candidate.filter(isMetricWrapper);
        if (wrappers.length > 0) return wrappers.flatMap((w) => w.values);

        // Otherwise it already is the points (or the distribution rows).
        return candidate;
    }

    if (candidate && typeof candidate === 'object') {
        const obj = candidate as Record<string, unknown>;

        // Deliberately Array.isArray, not truthiness — see the module comment.
        if (Array.isArray(obj.values)) return obj.values;
        if ('data' in obj) return asSeriesArray(obj.data, depth + 1);
    }

    return [];
}

/** True when a container holds no usable points — the cue to show sample data. */
export function isEmptySeries(candidate: unknown): boolean {
    return asSeriesArray(candidate).length === 0;
}

function pointDate(raw: Record<string, unknown>): string {
    const dt = raw.dateTime ?? raw.date ?? raw.day;

    if (typeof dt === 'string') return dt;
    // Metricool sometimes nests the timestamp one level deeper.
    if (dt && typeof dt === 'object') {
        const nested = (dt as Record<string, unknown>).dateTime;
        if (typeof nested === 'string') return nested;
    }
    return '';
}

function pointValue(raw: Record<string, unknown>): number {
    const v = raw.value ?? raw.count ?? raw.total;
    const n = typeof v === 'string' ? Number(v) : v;
    return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

/**
 * Flattens any Metricool series container into `{ date, value }[]`, sorted oldest
 * → newest.
 *
 * The sort is load-bearing, not cosmetic. Metricool's ordering is inconsistent
 * per network on the same account: Instagram came back strictly DESCENDING,
 * Facebook ascending, and YouTube in no order at all. Without sorting,
 * latestValue() would report the oldest follower count as the current one, and
 * charts would plot their x-axis out of order.
 */
export function toSeries(candidate: unknown): SeriesPoint[] {
    return asSeriesArray(candidate)
        .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object')
        .map((p) => ({ date: pointDate(p), value: pointValue(p) }))
        .filter((p) => p.date !== '')
        .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

/** Period total. Use for flow metrics (reach, clicks, new followers). */
export function sumSeries(candidate: unknown): number {
    return toSeries(candidate).reduce((total, p) => total + p.value, 0);
}

/**
 * Last non-zero-dated point. Use for stock metrics (followers, subscribers) —
 * summing a running total across a period is meaningless.
 */
export function latestValue(candidate: unknown): number {
    const series = toSeries(candidate);
    return series.length ? series[series.length - 1].value : 0;
}

/** Distribution rows: `{ label, value }` from Metricool's breakdown payloads. */
export interface DistributionRow {
    label: string;
    value: number;
}

export function toDistribution(candidate: unknown): DistributionRow[] {
    return asSeriesArray(candidate)
        .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
        .map((r) => {
            const label = r.key ?? r.label ?? r.name ?? r.type ?? r.dimension;
            return {
                label: typeof label === 'string' ? label : String(label ?? ''),
                value: pointValue(r),
            };
        })
        .filter((r) => r.label !== '' && r.label !== 'undefined');
}

/**
 * % change from `previous` to `current`, for period-over-period trend pills.
 * `null` when either side is unknown, or previous is 0 — a 0 baseline makes
 * "% change" undefined (or misleadingly infinite), not a real comparison.
 */
export function percentDelta(current: number | null, previous: number | null): number | null {
    if (current === null || previous === null || previous === 0) return null;
    return ((current - previous) / previous) * 100;
}

/** Chart-friendly short date, e.g. "Nov 17". */
export function formatChartDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
