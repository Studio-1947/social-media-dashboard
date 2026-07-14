import type { ReactNode } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { SampleDataBadge } from './SampleDataBadge';
import { formatChartDate, type DistributionRow, type SeriesPoint } from '../lib/series';
import { cn } from '../lib/utils';

/**
 * Shared presentation pieces for the network views.
 *
 * Every one of these takes an explicit `isSample` flag rather than inferring
 * "looks empty, must be mock" internally — the caller is the only place that
 * knows whether it fell back, and the badge must track that decision exactly.
 */

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-primary-200 rounded-xl p-4 shadow-modern-lg">
            <p className="text-sm font-semibold text-primary-900 mb-2">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} className="text-xs" style={{ color: entry.color }}>
                    {entry.name}:{' '}
                    <span className="font-bold">{Number(entry.value).toLocaleString()}</span>
                </p>
            ))}
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

export interface StatCardProps {
    label: string;
    value: number | string;
    hint?: string;
    /** Renders dark/inverted. Use for the one headline number per group. */
    emphasis?: boolean;
}

export const StatCard = ({ label, value, hint, emphasis }: StatCardProps) => (
    <div
        className={cn(
            'rounded-2xl p-5 shadow-modern hover-lift border',
            emphasis
                ? 'bg-gradient-to-br from-primary-900 to-primary-800 text-white border-transparent'
                : 'bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200 text-primary-900'
        )}
    >
        <div className="text-sm font-medium opacity-70 uppercase tracking-wide mb-2">{label}</div>
        <div className="text-3xl font-bold tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {hint && <div className="text-xs opacity-60 mt-1.5">{hint}</div>}
    </div>
);

/* ------------------------------------------------------------------ */
/* Panel shell                                                         */
/* ------------------------------------------------------------------ */

export interface PanelProps {
    title: string;
    /** True when the contents are sample data. Drives the badge — never silent. */
    isSample?: boolean;
    subtitle?: string;
    children: ReactNode;
    className?: string;
}

export const Panel = ({ title, subtitle, isSample, children, className }: PanelProps) => (
    <div className={cn('modern-card p-6 lg:p-8 animate-slide-up', className)}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
                <h3 className="text-xl font-bold text-primary-900">{title}</h3>
                {subtitle && <p className="text-sm text-primary-600 mt-1">{subtitle}</p>}
            </div>
            {isSample && <SampleDataBadge />}
        </div>
        {children}
    </div>
);

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

export interface TimelineChartProps {
    series: SeriesPoint[];
    color: string;
    name: string;
}

export const TimelineChart = ({ series, color, name }: TimelineChartProps) => {
    const data = series.map((p) => ({ name: formatChartDate(p.date), [name]: p.value }));
    const gradientId = `grad-${name.replace(/\W/g, '')}`;

    return (
        <div className="h-72 bg-primary-50/30 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 12 }} tickLine={false} />
                    <YAxis stroke="#64748b" style={{ fontSize: 12 }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey={name}
                        stroke={color}
                        strokeWidth={3}
                        fill={`url(#${gradientId})`}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export interface MultiSeries {
    name: string;
    series: SeriesPoint[];
    color: string;
}

/** Overlays several metrics on one time axis, joined by date. */
export const MultiLineChart = ({ series }: { series: MultiSeries[] }) => {
    const byDate = new Map<string, Record<string, number | string>>();

    for (const s of series) {
        for (const point of s.series) {
            const label = formatChartDate(point.date);
            const row = byDate.get(label) ?? { name: label };
            row[s.name] = point.value;
            byDate.set(label, row);
        }
    }

    return (
        <div className="h-72 bg-primary-50/30 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...byDate.values()]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 12 }} tickLine={false} />
                    <YAxis stroke="#64748b" style={{ fontSize: 12 }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {series.map((s) => (
                        <Line
                            key={s.name}
                            type="monotone"
                            dataKey={s.name}
                            stroke={s.color}
                            strokeWidth={2.5}
                            dot={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

const DISTRIBUTION_COLORS = [
    '#3b82f6',
    '#8b5cf6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#06b6d4',
    '#ec4899',
];

export interface DistributionChartProps {
    rows: DistributionRow[];
    /** Maps a raw Metricool key to something a human reads (e.g. IN → India). */
    formatLabel?: (label: string) => string;
    /** Show values as a share of the total rather than absolute counts. */
    asPercentage?: boolean;
    limit?: number;
}

export const DistributionChart = ({
    rows,
    formatLabel = (l) => l,
    asPercentage = false,
    limit = 8,
}: DistributionChartProps) => {
    const top = [...rows].sort((a, b) => b.value - a.value).slice(0, limit);
    const total = rows.reduce((sum, r) => sum + r.value, 0) || 1;

    const data = top.map((r) => ({
        name: formatLabel(r.label),
        value: asPercentage ? Number(((r.value / total) * 100).toFixed(1)) : r.value,
    }));

    return (
        <div className="h-72 bg-primary-50/30 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} horizontal={false} />
                    <XAxis type="number" stroke="#64748b" style={{ fontSize: 12 }} tickLine={false} />
                    <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#64748b"
                        style={{ fontSize: 12 }}
                        tickLine={false}
                        width={110}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} name={asPercentage ? '%' : 'Total'}>
                        {data.map((_, i) => (
                            <Cell key={i} fill={DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export const LoadingPanel = ({ label = 'Loading analytics…' }: { label?: string }) => (
    <div className="modern-card p-16 text-center animate-scale-in">
        <div className="inline-block p-4 rounded-full bg-primary-100 mb-4">
            <svg
                className="animate-spin h-10 w-10 text-primary-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
            </svg>
        </div>
        <div className="text-primary-600 text-lg font-semibold">{label}</div>
    </div>
);

/**
 * A hard failure — the request itself failed, so we know nothing. Distinct from
 * an empty-but-successful response, which falls back to badged sample data.
 * Never dress this up as data.
 */
export const ErrorPanel = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div className="modern-card p-12 text-center animate-scale-in border border-accent-red/30">
        <div className="text-primary-900 text-lg font-semibold mb-2">Couldn't load analytics</div>
        <p className="text-sm text-primary-600 max-w-lg mx-auto mb-1">{message}</p>
        <p className="text-xs text-primary-500 max-w-lg mx-auto">
            If this persists, check the server's <code>/health</code> endpoint — the Metricool
            token, userId or blogId may be wrong or expired.
        </p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="mt-5 px-5 py-2 text-sm font-semibold rounded-xl bg-primary-900 text-white hover:shadow-modern-lg transition-all active:scale-95"
            >
                Retry
            </button>
        )}
    </div>
);
