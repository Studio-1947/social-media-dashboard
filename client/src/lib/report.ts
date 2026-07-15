import type { DateRange, Network } from '../services/metricoolApi';

/** One line of the "stat cards" section — mirrors what's shown on the Overview tab. */
export interface ReportStat {
    label: string;
    /** Already display-formatted (e.g. "12,345" or "4.2%") — the report shows what the UI shows. */
    value: string;
    /** e.g. "+3.2% vs last period"; omitted when no comparison was available. */
    trend?: string;
}

export interface ReportInsights {
    confidence: string;
    advice: string;
}

function csvCell(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
}

function formatStatValue(value: number | string | null): string {
    if (value === null) return '—';
    return typeof value === 'number' ? value.toLocaleString() : value;
}

function formatTrendText(trend: { pct: number } | null | undefined): string | undefined {
    if (!trend) return undefined;
    const sign = trend.pct >= 0 ? '+' : '';
    return `${sign}${trend.pct.toFixed(1)}% vs last period`;
}

/** Turns a StatCard's own {value, trend} into the report row it already shows. */
export function toReportStat(
    label: string,
    value: number | string | null,
    trend?: { pct: number } | null
): ReportStat {
    return { label, value: formatStatValue(value), trend: formatTrendText(trend) };
}

/**
 * The CSV an agency actually hands a client — the numbers already on screen,
 * not a raw data dump. Same BOM trick as PostsTable's export, for the same
 * reason: Excel otherwise mis-renders non-Latin captions/names as mojibake.
 */
export function buildOverviewReportCSV({
    brandName,
    network,
    range,
    stats,
    insights,
}: {
    brandName: string;
    network: Network;
    range: DateRange;
    stats: ReportStat[];
    /** null when this network has no insights (YouTube) or the fetch failed — omitted, not faked. */
    insights: ReportInsights | null;
}): string {
    const networkLabel = network[0].toUpperCase() + network.slice(1);
    const lines: string[] = [];

    lines.push(csvCell('Social Flow report'));
    lines.push(`${csvCell('Client')},${csvCell(brandName)}`);
    lines.push(`${csvCell('Network')},${csvCell(networkLabel)}`);
    lines.push(`${csvCell('Period')},${csvCell(`${range.from} to ${range.to}`)}`);
    lines.push('');

    lines.push(`${csvCell('Metric')},${csvCell('Value')},${csvCell('vs last period')}`);
    for (const s of stats) {
        lines.push(`${csvCell(s.label)},${csvCell(s.value)},${csvCell(s.trend ?? '')}`);
    }

    if (insights) {
        lines.push('');
        lines.push(`${csvCell('What to post next')},${csvCell(insights.advice)}`);
        lines.push(`${csvCell('Confidence')},${csvCell(insights.confidence)}`);
    }

    return lines.join('\n');
}

/** Same blob/anchor download pattern as PostsTable's CSV export. */
export function downloadCSV(filename: string, csv: string): void {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
