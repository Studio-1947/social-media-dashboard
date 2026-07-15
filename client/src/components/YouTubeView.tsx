import { useMemo, useState } from 'react';
import {
    ErrorPanel,
    LoadingPanel,
    MultiLineChart,
    Panel,
    StatCard,
    TimelineChart,
} from './AnalyticsPanels';
import { SubTabs, type SubTab } from './SubTabs';
import { ReportExportButton } from './ReportExportButton';
import { useTimelines } from '../hooks/useMetricool';
import { latestValue, percentDelta, sumSeries } from '../lib/series';
import { toReportStat, type ReportStat } from '../lib/report';
import { getPreviousPeriod } from '../lib/dateRange';
import { socialFlowBrand } from '../config/brand';
import type { DateRange } from '../services/metricoolApi';

const ACCENT = socialFlowBrand.networks.youtube.color;

/**
 * This is the ENTIRE valid metric enum for YouTube timelines — verified
 * exhaustively against the live API. There are no others.
 */
const TIMELINE_KEYS = ['subscribers', 'views', 'videos', 'subscribersGained', 'subscribersLost'];

/**
 * Only Overview and Growth exist here, and that is not an oversight:
 *
 *  - Demographics: Metricool's distribution endpoint 500s for every YouTube
 *    metric value ("Not implemented metric ... at YouTubeAnalyticsExtractor").
 *    There is no audience data to show, so there is no Audience tab.
 *  - Per-video list: /posts/youtube always returns an empty list regardless of
 *    date range. There is no video table, Insights tab, or Top Posts spotlight
 *    to build — none of those exist without per-post data.
 *
 * Rather than ship empty tabs or "Coming Soon" placeholders, this view splits
 * the 5 real metrics Metricool exposes into two tabs so YouTube reads with the
 * same visual weight as Facebook/Instagram, without inventing a section.
 */
export const YouTubeView = ({ range, blogId }: { range: DateRange; blogId: number }) => {
    const [tab, setTab] = useState('overview');
    const timelines = useTimelines('youtube', TIMELINE_KEYS, range, blogId);

    // Previous-period timelines, for the "vs last period" trend pills. A second,
    // independent request — same keys, shifted window — not a new endpoint.
    const previousRange = useMemo(() => getPreviousPeriod(range), [range]);
    const prevTimelines = useTimelines('youtube', TIMELINE_KEYS, previousRange, blogId);

    if (timelines.loading) return <LoadingPanel label="Loading YouTube analytics…" />;
    if (timelines.error) {
        return <ErrorPanel message={timelines.error} onRetry={timelines.reload} />;
    }

    const { series, isEmpty } = timelines;

    // null (not 0) when Metricool reported nothing — 0 is a real result.
    const total = (key: string) => (isEmpty[key] ? null : sumSeries(series[key]));
    const latest = (key: string) => (isEmpty[key] ? null : latestValue(series[key]));

    // Trend pills are omitted (not zeroed) while the previous period is still
    // loading or failed — "no comparison yet" is honest, a fake 0% isn't.
    const prevReady = !prevTimelines.loading && !prevTimelines.error;
    const prevTotal = (key: string) =>
        prevReady && !prevTimelines.isEmpty[key] ? sumSeries(prevTimelines.series[key]) : null;
    const prevLatest = (key: string) =>
        prevReady && !prevTimelines.isEmpty[key] ? latestValue(prevTimelines.series[key]) : null;
    const trendOf = (current: number | null, previous: number | null) => {
        const pct = percentDelta(current, previous);
        return pct === null ? null : { pct };
    };

    const gained = total('subscribersGained');
    const lost = total('subscribersLost');
    const netChange = gained !== null && lost !== null ? gained - lost : null;
    const prevGained = prevTotal('subscribersGained');
    const prevLost = prevTotal('subscribersLost');
    const prevNetChange = prevGained !== null && prevLost !== null ? prevGained - prevLost : null;

    const tabs: SubTab[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'growth', label: 'Growth' },
    ];

    // Same numbers already on the stat cards below — the report is a download
    // of what's on screen, not a separate data pull.
    const reportStats: ReportStat[] = [
        toReportStat('Subscribers', latest('subscribers'), trendOf(latest('subscribers'), prevLatest('subscribers'))),
        toReportStat('Views', total('views'), trendOf(total('views'), prevTotal('views'))),
        toReportStat('Videos published', total('videos'), trendOf(total('videos'), prevTotal('videos'))),
        toReportStat('Net subscribers', netChange, trendOf(netChange, prevNetChange)),
        toReportStat('Subscribers gained', gained, trendOf(gained, prevGained)),
        toReportStat('Subscribers lost', lost, trendOf(lost, prevLost)),
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <SubTabs tabs={tabs} active={tab} onChange={setTab} accent={ACCENT} />

            {tab === 'overview' && (
                <>
                    <div className="flex justify-end -mb-2">
                        {/* YouTube has no per-post data, so no Insights section exists to
                            include — supportsInsights=false, same reasoning as the missing
                            Insights tab. */}
                        <ReportExportButton
                            network="youtube"
                            range={range}
                            blogId={blogId}
                            stats={reportStats}
                            supportsInsights={false}
                        />
                    </div>

                    <Panel title="Channel Overview" subtitle="Everything Metricool exposes for YouTube">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatCard
                                label="Subscribers"
                                value={latest('subscribers')}
                                emphasis
                                trend={trendOf(latest('subscribers'), prevLatest('subscribers'))}
                            />
                            <StatCard
                                label="Views"
                                value={total('views')}
                                hint="This period"
                                trend={trendOf(total('views'), prevTotal('views'))}
                            />
                            <StatCard
                                label="Videos published"
                                value={total('videos')}
                                hint="This period"
                                trend={trendOf(total('videos'), prevTotal('videos'))}
                            />
                            <StatCard
                                label="Net subscribers"
                                value={netChange}
                                trend={trendOf(netChange, prevNetChange)}
                            />
                        </div>
                        <TimelineChart series={series.subscribers ?? []} color={ACCENT} name="Subscribers" />
                    </Panel>

                    <Panel title="Views">
                        <TimelineChart series={series.views ?? []} color="#8b5cf6" name="Views" />
                    </Panel>
                </>
            )}

            {tab === 'growth' && (
                <Panel title="Subscribers Gained vs Lost" subtitle="How the channel's audience is moving">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <StatCard
                            label="Gained"
                            value={gained}
                            trend={trendOf(gained, prevGained)}
                        />
                        <StatCard
                            label="Lost"
                            value={lost}
                            trend={trendOf(lost, prevLost)}
                        />
                    </div>
                    <MultiLineChart
                        series={[
                            { name: 'Gained', series: series.subscribersGained ?? [], color: '#10b981' },
                            { name: 'Lost', series: series.subscribersLost ?? [], color: '#ef4444' },
                        ]}
                    />
                </Panel>
            )}

            <p className="text-xs text-primary-500 px-2">
                Metricool does not expose audience demographics or a per-video breakdown for
                YouTube, so those sections don't exist here.
            </p>
        </div>
    );
};
