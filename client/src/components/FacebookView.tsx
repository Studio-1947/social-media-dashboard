import { useState } from 'react';
import {
    DistributionChart,
    ErrorPanel,
    LoadingPanel,
    MultiLineChart,
    Panel,
    StatCard,
    TimelineChart,
} from './AnalyticsPanels';
import { SubTabs, type SubTab } from './SubTabs';
import { PostsTable } from './PostsTable';
import { CompetitorsPanel } from './CompetitorsPanel';
import { SampleDataBadge } from './SampleDataBadge';
import { useDistributions, useHasCompetitors, usePosts, useTimelines } from '../hooks/useMetricool';
import { latestValue, sumSeries } from '../lib/series';
import { countryName } from '../lib/countryNames';
import { socialFlowBrand } from '../config/brand';
import type { DateRange } from '../services/metricoolApi';

const ACCENT = socialFlowBrand.networks.facebook.color;

/**
 * Metric keys, not Metricool metric names — the server owns the mapping and the
 * `subject` that goes with each. Notably `clicks` resolves to `page_media_view`,
 * the only click-ish metric Meta still populates, and `postsCount` is an
 * account-subject metric despite the name.
 */
const TIMELINE_KEYS = [
    'followers',
    'newFollowers',
    'lostFollowers',
    'reach',
    'clicks',
    'reactions',
    'interactions',
    'postsCount',
];

/**
 * No age/gender here on purpose: Meta deprecated Facebook Page age/gender
 * demographics around Sept 2024 and every `pageImpressions.*` breakdown is
 * permanently empty. Country/city come from `page_follows_*`, not the
 * `followersBy*` names, which return [] forever.
 */
const DISTRIBUTION_KEYS = ['country', 'city', 'postsTypes'];

export const FacebookView = ({ range, blogId }: { range: DateRange; blogId: number }) => {
    const [tab, setTab] = useState('overview');

    const timelines = useTimelines('facebook', TIMELINE_KEYS, range, blogId);
    const distributions = useDistributions('facebook', DISTRIBUTION_KEYS, range, blogId);
    const posts = usePosts('facebook', range, blogId, tab === 'posts');
    const hasCompetitors = useHasCompetitors('facebook', range, blogId);

    if (timelines.loading) return <LoadingPanel label="Loading Facebook analytics…" />;
    if (timelines.error) {
        return <ErrorPanel message={timelines.error} onRetry={timelines.reload} />;
    }

    const { series, isSample } = timelines;

    // Followers is a stock metric — take the latest point. Everything else is a
    // flow metric, so it sums across the period.
    const followers = latestValue(series.followers);
    const gained = sumSeries(series.newFollowers);
    const lost = sumSeries(series.lostFollowers);

    const tabs: SubTab[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'audience', label: 'Audience' },
        { key: 'posts', label: 'Posts' },
        // Only when this client actually has competitors configured in Metricool.
        ...(hasCompetitors ? [{ key: 'competitors', label: 'Competitors' }] : []),
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <SubTabs tabs={tabs} active={tab} onChange={setTab} accent={ACCENT} />

            {tab === 'overview' && (
                <>
                    <Panel
                        title="Community Growth"
                        isSample={isSample.followers}
                        subtitle="Page followers over the selected period"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatCard label="Followers" value={followers} emphasis />
                            <StatCard label="New followers" value={gained} />
                            <StatCard label="Lost followers" value={lost} />
                            <StatCard label="Net change" value={gained - lost} />
                        </div>
                        <TimelineChart series={series.followers ?? []} color={ACCENT} name="Followers" />
                    </Panel>

                    <Panel title="Reach & Engagement" isSample={isSample.reach}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatCard label="Reach" value={sumSeries(series.reach)} emphasis />
                            <StatCard label="Reactions" value={sumSeries(series.reactions)} />
                            <StatCard label="Interactions" value={sumSeries(series.interactions)} />
                            <StatCard
                                label="Page views"
                                value={sumSeries(series.clicks)}
                                hint="Meta no longer reports link/CTA clicks"
                            />
                        </div>
                        <MultiLineChart
                            series={[
                                { name: 'Reach', series: series.reach ?? [], color: ACCENT },
                                { name: 'Interactions', series: series.interactions ?? [], color: '#10b981' },
                                { name: 'Reactions', series: series.reactions ?? [], color: '#8b5cf6' },
                            ]}
                        />
                    </Panel>

                    <Panel title="Publishing" isSample={isSample.postsCount}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* The true period total from Metricool's postsCount metric —
                                NOT the length of the fetched posts list, which is just a
                                page size. */}
                            <StatCard label="Posts published" value={sumSeries(series.postsCount)} emphasis />
                            <StatCard
                                label="Interactions per post"
                                value={
                                    sumSeries(series.postsCount) > 0
                                        ? Math.round(
                                              sumSeries(series.interactions) / sumSeries(series.postsCount)
                                          )
                                        : 0
                                }
                            />
                        </div>
                    </Panel>
                </>
            )}

            {tab === 'audience' && (
                <>
                    {distributions.loading ? (
                        <LoadingPanel label="Loading audience breakdown…" />
                    ) : (
                        <>
                            <Panel title="Followers by country" isSample={distributions.isSample.country}>
                                <DistributionChart
                                    rows={distributions.rows.country ?? []}
                                    formatLabel={countryName}
                                />
                            </Panel>

                            <Panel title="Followers by city" isSample={distributions.isSample.city}>
                                <DistributionChart rows={distributions.rows.city ?? []} />
                            </Panel>

                            <Panel title="Content types" isSample={distributions.isSample.postsTypes}>
                                <DistributionChart rows={distributions.rows.postsTypes ?? []} />
                            </Panel>

                            {/* Deliberately no age/gender section: Meta killed Facebook Page
                                age/gender demographics ~Sept 2024. An empty chart would be a
                                lie about the client's audience, so there is no chart. */}
                            <p className="text-xs text-primary-500 px-2">
                                Age and gender breakdowns are unavailable for Facebook Pages — Meta
                                discontinued them in 2024. Instagram still reports both.
                            </p>
                        </>
                    )}
                </>
            )}

            {tab === 'posts' && (
                <>
                    {posts.loading ? (
                        <LoadingPanel label="Loading posts…" />
                    ) : posts.error ? (
                        <ErrorPanel message={posts.error} />
                    ) : (
                        <div>
                            {posts.isSample && (
                                <div className="flex justify-end mb-3">
                                    <SampleDataBadge />
                                </div>
                            )}
                            <PostsTable posts={posts.posts} network="facebook" />
                        </div>
                    )}
                </>
            )}

            {tab === 'competitors' && <CompetitorsPanel network="facebook" range={range} blogId={blogId} />}
        </div>
    );
};
