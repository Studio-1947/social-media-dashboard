import {
    ErrorPanel,
    LoadingPanel,
    MultiLineChart,
    Panel,
    StatCard,
    TimelineChart,
} from './AnalyticsPanels';
import { useTimelines } from '../hooks/useMetricool';
import { latestValue, sumSeries } from '../lib/series';
import { socialFlowBrand } from '../config/brand';
import type { DateRange } from '../services/metricoolApi';

const ACCENT = socialFlowBrand.networks.youtube.color;

/**
 * This is the ENTIRE valid metric enum for YouTube timelines — verified
 * exhaustively against the live API. There are no others.
 */
const TIMELINE_KEYS = ['subscribers', 'views', 'videos', 'subscribersGained', 'subscribersLost'];

/**
 * YouTube is one section by design, and that is not an oversight:
 *
 *  - Demographics: Metricool's distribution endpoint 500s for every YouTube
 *    metric value ("Not implemented metric ... at YouTubeAnalyticsExtractor").
 *    There is no audience data to show, so there is no Audience tab.
 *  - Per-video list: /posts/youtube always returns an empty list regardless of
 *    date range. There is no video table to build.
 *
 * Rather than ship empty tabs or "Coming Soon" placeholders, this view shows
 * only Channel Overview — everything Metricool actually has.
 */
export const YouTubeView = ({ range, blogId }: { range: DateRange; blogId: number }) => {
    const timelines = useTimelines('youtube', TIMELINE_KEYS, range, blogId);

    if (timelines.loading) return <LoadingPanel label="Loading YouTube analytics…" />;
    if (timelines.error) {
        return <ErrorPanel message={timelines.error} onRetry={timelines.reload} />;
    }

    const { series, isSample } = timelines;

    const subscribers = latestValue(series.subscribers);
    const gained = sumSeries(series.subscribersGained);
    const lost = sumSeries(series.subscribersLost);

    return (
        <div className="space-y-6 animate-fade-in">
            <Panel
                title="Channel Overview"
                isSample={isSample.subscribers}
                subtitle="Everything Metricool exposes for YouTube"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard label="Subscribers" value={subscribers} emphasis />
                    <StatCard label="Views" value={sumSeries(series.views)} hint="This period" />
                    <StatCard
                        label="Videos published"
                        value={sumSeries(series.videos)}
                        hint="This period"
                    />
                    <StatCard label="Net subscribers" value={gained - lost} />
                </div>
                <TimelineChart series={series.subscribers ?? []} color={ACCENT} name="Subscribers" />
            </Panel>

            <Panel title="Subscribers Gained vs Lost" isSample={isSample.subscribersGained}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <StatCard label="Gained" value={gained} />
                    <StatCard label="Lost" value={lost} />
                </div>
                <MultiLineChart
                    series={[
                        { name: 'Gained', series: series.subscribersGained ?? [], color: '#10b981' },
                        { name: 'Lost', series: series.subscribersLost ?? [], color: '#ef4444' },
                    ]}
                />
            </Panel>

            <Panel title="Views" isSample={isSample.views}>
                <TimelineChart series={series.views ?? []} color="#8b5cf6" name="Views" />
            </Panel>

            <p className="text-xs text-primary-500 px-2">
                Metricool does not expose audience demographics or a per-video breakdown for
                YouTube, so those sections don't exist here.
            </p>
        </div>
    );
};
