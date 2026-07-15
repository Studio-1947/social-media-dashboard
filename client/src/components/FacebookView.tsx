import { useMemo, useState } from 'react';
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
import { InsightsView } from './InsightsView';
import { TopPostsSpotlight } from './TopPostsSpotlight';
import { useDistributions, useHasCompetitors, usePosts, useTimelines } from '../hooks/useMetricool';
import { latestValue, percentDelta, sumSeries } from '../lib/series';
import { getPreviousPeriod } from '../lib/dateRange';
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
    // Fetched eagerly (not gated on the Posts tab) so the Overview spotlight below
    // has data on first load — the client cache means switching to the Posts tab
    // afterward is then an instant hit, not a second fetch.
    const posts = usePosts('facebook', range, blogId, true);
    const hasCompetitors = useHasCompetitors('facebook', range, blogId);

    // Previous-period timelines, for the "vs last period" trend pills. A second,
    // independent request — same keys, shifted window — not a new endpoint.
    const previousRange = useMemo(() => getPreviousPeriod(range), [range]);
    const prevTimelines = useTimelines('facebook', TIMELINE_KEYS, previousRange, blogId);

    if (timelines.loading) return <LoadingPanel label="Loading Facebook analytics…" />;
    if (timelines.error) {
        return <ErrorPanel message={timelines.error} onRetry={timelines.reload} />;
    }

    const { series, isEmpty } = timelines;

    // null (not 0) when Metricool reported nothing — 0 is a real result and must
    // not be confused with an absent one.
    const total = (key: string) => (isEmpty[key] ? null : sumSeries(series[key]));
    // Followers is a stock metric: take the latest point. Summing a running total
    // across a period is meaningless.
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

    const gained = total('newFollowers');
    const lost = total('lostFollowers');
    const netChange = gained !== null && lost !== null ? gained - lost : null;

    const reach = total('reach');
    const interactions = total('interactions');
    const postsPublished = total('postsCount');
    const perPost =
        interactions !== null && postsPublished !== null && postsPublished > 0
            ? Math.round(interactions / postsPublished)
            : null;

    // Account-level engagement rate: interactions as a share of reach for the
    // whole period. Distinct from the per-post engagementRate shown in the Posts
    // tab (which divides by impressions) — see the hint text below.
    const engagementRate =
        interactions !== null && reach !== null && reach > 0
            ? `${((interactions / reach) * 100).toFixed(1)}%`
            : null;

    const tabs: SubTab[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'audience', label: 'Audience' },
        { key: 'posts', label: 'Posts' },
        { key: 'insights', label: 'Insights' },
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
                        subtitle="Page followers over the selected period"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatCard
                                label="Followers"
                                value={latest('followers')}
                                emphasis
                                trend={trendOf(latest('followers'), prevLatest('followers'))}
                            />
                            <StatCard label="New followers" value={gained} />
                            <StatCard label="Lost followers" value={lost} />
                            <StatCard label="Net change" value={netChange} />
                        </div>
                        <TimelineChart series={series.followers ?? []} color={ACCENT} name="Followers" />
                    </Panel>

                    <Panel title="Reach & Engagement">
                        {/* Headline pair first, then the supporting counts — the two
                            numbers that answer "is this working" get emphasis. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            {/* Reach is genuinely empty on smaller pages — it will read
                                "—" rather than invent a number. */}
                            <StatCard
                                label="Reach"
                                value={reach}
                                emphasis
                                trend={trendOf(reach, prevTotal('reach'))}
                            />
                            <StatCard
                                label="Engagement rate"
                                value={engagementRate}
                                emphasis
                                hint="Interactions as a share of reach for this period"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <StatCard label="Reactions" value={total('reactions')} />
                            <StatCard
                                label="Interactions"
                                value={interactions}
                                trend={trendOf(interactions, prevTotal('interactions'))}
                            />
                            <StatCard
                                label="Page views"
                                value={total('clicks')}
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

                    <Panel title="Publishing">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* The true period total from Metricool's postsCount metric —
                                NOT the length of the fetched posts list, which is just a
                                page size. */}
                            <StatCard
                                label="Posts published"
                                value={postsPublished}
                                emphasis
                                trend={trendOf(postsPublished, prevTotal('postsCount'))}
                            />
                            <StatCard label="Interactions per post" value={perPost} />
                        </div>
                    </Panel>

                    {!posts.loading && !posts.error && (
                        <TopPostsSpotlight posts={posts.posts} network="facebook" />
                    )}
                </>
            )}

            {tab === 'audience' && (
                <>
                    {distributions.loading ? (
                        <LoadingPanel label="Loading audience breakdown…" />
                    ) : (
                        <>
                            <Panel title="Followers by country">
                                <DistributionChart
                                    rows={distributions.rows.country ?? []}
                                    formatLabel={countryName}
                                />
                            </Panel>

                            <Panel title="Followers by city">
                                <DistributionChart rows={distributions.rows.city ?? []} />
                            </Panel>

                            <Panel title="Content types">
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
                        <PostsTable posts={posts.posts} network="facebook" />
                    )}
                </>
            )}

            {tab === 'insights' && (
                <InsightsView network="facebook" range={range} blogId={blogId} enabled={tab === 'insights'} />
            )}

            {tab === 'competitors' && <CompetitorsPanel network="facebook" range={range} blogId={blogId} />}
        </div>
    );
};
