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

/** The only safe way to get an array out of a Metricool series container. */
export function asSeriesArray(candidate: unknown): unknown[] {
    if (Array.isArray(candidate)) return candidate;

    if (candidate && typeof candidate === 'object') {
        const obj = candidate as Record<string, unknown>;

        // Deliberately Array.isArray, not truthiness — see the module comment.
        if (Array.isArray(obj.values)) return obj.values;
        if (Array.isArray(obj.data)) return obj.data;

        // `{ data: { values: [...] } }`
        if (obj.data && typeof obj.data === 'object') {
            const inner = (obj.data as Record<string, unknown>).values;
            if (Array.isArray(inner)) return inner;
        }
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

/** Flattens any Metricool series container into `{ date, value }[]`. */
export function toSeries(candidate: unknown): SeriesPoint[] {
    return asSeriesArray(candidate)
        .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object')
        .map((p) => ({ date: pointDate(p), value: pointValue(p) }))
        .filter((p) => p.date !== '');
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

/** Chart-friendly short date, e.g. "Nov 17". */
export function formatChartDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
