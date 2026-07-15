import { useMemo, useState } from 'react';
import {
    DistributionChart,
    DistributionTrendNote,
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
import { TopPostsSpotlight, UnderperformingPostsSpotlight } from './TopPostsSpotlight';
import { ReportExportButton } from './ReportExportButton';
import { useDistributions, useHasCompetitors, usePosts, useTimelines } from '../hooks/useMetricool';
import { latestValue, percentDelta, sumSeries, topCategoryShift } from '../lib/series';
import { toReportStat, type ReportStat } from '../lib/report';
import { getPreviousPeriod } from '../lib/dateRange';
import { countryName } from '../lib/countryNames';
import { socialFlowBrand } from '../config/brand';
import type { DateRange } from '../services/metricoolApi';

const ACCENT = socialFlowBrand.networks.instagram.color;

const TIMELINE_KEYS = [
    'followers',
    'deltaFollowers',
    'reach',
    'impressions',
    'profileViews',
    'clicks',
    'interactions',
    'accountsEngaged',
    'postsCount',
];

/** Instagram, unlike Facebook, still reports age and gender. */
const DISTRIBUTION_KEYS = ['gender', 'age', 'country', 'city', 'postsTypes'];

const genderLabel = (l: string) => ({ F: 'Female', M: 'Male', U: 'Unknown' })[l] ?? l;

export const InstagramView = ({ range, blogId }: { range: DateRange; blogId: number }) => {
    const [tab, setTab] = useState('overview');

    const timelines = useTimelines('instagram', TIMELINE_KEYS, range, blogId);
    const distributions = useDistributions('instagram', DISTRIBUTION_KEYS, range, blogId);
    // Fetched eagerly (not gated on the Posts tab) so the Overview spotlight below
    // has data on first load — the client cache means switching to the Posts tab
    // afterward is then an instant hit, not a second fetch.
    const posts = usePosts('instagram', range, blogId, true);
    const hasCompetitors = useHasCompetitors('instagram', range, blogId);

    // Previous period, shared by every "vs last period" comparison below — the
    // timelines trend pills AND the Audience tab's distribution shift note.
    const previousRange = useMemo(() => getPreviousPeriod(range), [range]);
    const prevTimelines = useTimelines('instagram', TIMELINE_KEYS, previousRange, blogId);
    const prevDistributions = useDistributions('instagram', DISTRIBUTION_KEYS, previousRange, blogId);

    if (timelines.loading) return <LoadingPanel label="Loading Instagram analytics…" />;
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

    // Same "not ready yet" guard as prevTimelines, applied to the Audience tab's
    // distribution comparison instead of the Overview stat cards.
    const prevDistReady = !prevDistributions.loading && !prevDistributions.error;
    const shiftOf = (key: string) =>
        prevDistReady
            ? topCategoryShift(distributions.rows[key] ?? [], prevDistributions.rows[key] ?? [])
            : null;

    // delta_followers is one signed series covering both directions — Metricool
    // has no separate gained/lost metric for Instagram. Empty on smaller accounts.
    const delta = total('deltaFollowers');
    const netChangeDisplay = delta === null ? null : delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString();

    const reach = total('reach');
    const postsPublished = total('postsCount');
    const interactions = total('interactions');
    const perPost =
        interactions !== null && postsPublished !== null && postsPublished > 0
            ? Math.round(interactions / postsPublished)
            : null;

    // Account-level engagement rate: interactions as a share of reach for the
    // whole period. Distinct from the per-post engagementRate shown in the Posts
    // tab (which divides by impressions).
    const engagementRateNum =
        interactions !== null && reach !== null && reach > 0 ? (interactions / reach) * 100 : null;
    const engagementRate = engagementRateNum !== null ? `${engagementRateNum.toFixed(1)}%` : null;

    // Same ratio computed over the previous period, purely for the trend pill.
    const prevReachVal = prevTotal('reach');
    const prevInteractionsVal = prevTotal('interactions');
    const prevEngagementRateNum =
        prevInteractionsVal !== null && prevReachVal !== null && prevReachVal > 0
            ? (prevInteractionsVal / prevReachVal) * 100
            : null;

    const tabs: SubTab[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'audience', label: 'Audience' },
        { key: 'posts', label: 'Posts' },
        { key: 'insights', label: 'Insights' },
        ...(hasCompetitors ? [{ key: 'competitors', label: 'Competitors' }] : []),
    ];

    // Same numbers already on the Overview stat cards below — the report is a
    // download of what's on screen, not a separate data pull.
    const reportStats: ReportStat[] = [
        toReportStat('Followers', latest('followers'), trendOf(latest('followers'), prevLatest('followers'))),
        toReportStat('Net change', netChangeDisplay),
        toReportStat('Profile views', total('profileViews')),
        toReportStat('Reach', reach, trendOf(reach, prevTotal('reach'))),
        toReportStat('Engagement rate', engagementRate, trendOf(engagementRateNum, prevEngagementRateNum)),
        toReportStat('Impressions', total('impressions')),
        toReportStat('Accounts engaged', total('accountsEngaged')),
        toReportStat('Website clicks', total('clicks')),
        toReportStat('Interactions', interactions, trendOf(interactions, prevTotal('interactions'))),
        toReportStat('Posts published', postsPublished),
        toReportStat('Interactions per post', perPost),
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <SubTabs tabs={tabs} active={tab} onChange={setTab} accent={ACCENT} />

            {tab === 'overview' && (
                <>
                    <div className="flex justify-end -mb-2">
                        <ReportExportButton
                            network="instagram"
                            range={range}
                            blogId={blogId}
                            stats={reportStats}
                            supportsInsights
                        />
                    </div>

                    <Panel title="Community Growth" subtitle="Followers over the selected period">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <StatCard
                                label="Followers"
                                value={latest('followers')}
                                emphasis
                                trend={trendOf(latest('followers'), prevLatest('followers'))}
                            />
                            <StatCard label="Net change" value={netChangeDisplay} />
                            {/* profile_views is empty across every client on this account. */}
                            <StatCard label="Profile views" value={total('profileViews')} />
                        </div>
                        <TimelineChart series={series.followers ?? []} color={ACCENT} name="Followers" />
                    </Panel>

                    <Panel title="Reach & Impressions">
                        {/* Headline pair first, then the supporting counts — the two
                            numbers that answer "is this working" get emphasis. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <StatCard
                                label="Reach"
                                value={total('reach')}
                                emphasis
                                trend={trendOf(reach, prevTotal('reach'))}
                            />
                            <StatCard
                                label="Engagement rate"
                                value={engagementRate}
                                emphasis
                                hint="Interactions as a share of reach for this period"
                                trend={trendOf(engagementRateNum, prevEngagementRateNum)}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <StatCard label="Impressions" value={total('impressions')} />
                            <StatCard
                                label="Accounts engaged"
                                value={total('accountsEngaged')}
                                hint="Distinct accounts, not impressions"
                            />
                            {/* website_clicks is likewise empty on this account. */}
                            <StatCard label="Website clicks" value={total('clicks')} />
                        </div>
                        <MultiLineChart
                            series={[
                                { name: 'Reach', series: series.reach ?? [], color: ACCENT },
                                { name: 'Impressions', series: series.impressions ?? [], color: '#8b5cf6' },
                                {
                                    name: 'Accounts engaged',
                                    series: series.accountsEngaged ?? [],
                                    color: '#10b981',
                                },
                            ]}
                        />
                    </Panel>

                    <Panel title="Engagement">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <StatCard
                                label="Interactions"
                                value={interactions}
                                emphasis
                                trend={trendOf(interactions, prevTotal('interactions'))}
                            />
                            {/* True period total from postsCount — never posts.length. */}
                            <StatCard label="Posts published" value={postsPublished} />
                            <StatCard label="Interactions per post" value={perPost} />
                        </div>
                        <TimelineChart
                            series={series.interactions ?? []}
                            color="#10b981"
                            name="Interactions"
                        />
                    </Panel>

                    {!posts.loading && !posts.error && (
                        <>
                            <TopPostsSpotlight posts={posts.posts} network="instagram" />
                            <UnderperformingPostsSpotlight posts={posts.posts} network="instagram" />
                        </>
                    )}
                </>
            )}

            {tab === 'audience' && (
                <>
                    {distributions.loading ? (
                        <LoadingPanel label="Loading audience breakdown…" />
                    ) : (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Panel title="Gender">
                                    <DistributionChart
                                        rows={distributions.rows.gender ?? []}
                                        asPercentage
                                        formatLabel={genderLabel}
                                    />
                                    <DistributionTrendNote shift={shiftOf('gender')} formatLabel={genderLabel} />
                                </Panel>

                                <Panel title="Age">
                                    <DistributionChart rows={distributions.rows.age ?? []} asPercentage />
                                    <DistributionTrendNote shift={shiftOf('age')} />
                                </Panel>
                            </div>

                            <Panel title="Followers by country">
                                <DistributionChart
                                    rows={distributions.rows.country ?? []}
                                    formatLabel={countryName}
                                />
                                <DistributionTrendNote shift={shiftOf('country')} formatLabel={countryName} />
                            </Panel>

                            <Panel title="Followers by city">
                                <DistributionChart rows={distributions.rows.city ?? []} />
                                <DistributionTrendNote shift={shiftOf('city')} />
                            </Panel>

                            <Panel title="Content types">
                                <DistributionChart rows={distributions.rows.postsTypes ?? []} />
                                <DistributionTrendNote shift={shiftOf('postsTypes')} />
                            </Panel>
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
                        <PostsTable posts={posts.posts} network="instagram" />
                    )}
                </>
            )}

            {tab === 'insights' && (
                <InsightsView network="instagram" range={range} blogId={blogId} enabled={tab === 'insights'} />
            )}

            {tab === 'competitors' && (
                <CompetitorsPanel network="instagram" range={range} blogId={blogId} />
            )}
        </div>
    );
};
