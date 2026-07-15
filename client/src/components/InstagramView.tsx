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
import { InsightsView } from './InsightsView';
import { useDistributions, useHasCompetitors, usePosts, useTimelines } from '../hooks/useMetricool';
import { latestValue, sumSeries } from '../lib/series';
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

export const InstagramView = ({ range, blogId }: { range: DateRange; blogId: number }) => {
    const [tab, setTab] = useState('overview');

    const timelines = useTimelines('instagram', TIMELINE_KEYS, range, blogId);
    const distributions = useDistributions('instagram', DISTRIBUTION_KEYS, range, blogId);
    const posts = usePosts('instagram', range, blogId, tab === 'posts');
    const hasCompetitors = useHasCompetitors('instagram', range, blogId);

    if (timelines.loading) return <LoadingPanel label="Loading Instagram analytics…" />;
    if (timelines.error) {
        return <ErrorPanel message={timelines.error} onRetry={timelines.reload} />;
    }

    const { series, isEmpty } = timelines;

    // null (not 0) when Metricool reported nothing — 0 is a real result.
    const total = (key: string) => (isEmpty[key] ? null : sumSeries(series[key]));
    const latest = (key: string) => (isEmpty[key] ? null : latestValue(series[key]));

    // delta_followers is one signed series covering both directions — Metricool
    // has no separate gained/lost metric for Instagram. Empty on smaller accounts.
    const delta = total('deltaFollowers');

    const postsPublished = total('postsCount');
    const interactions = total('interactions');
    const perPost =
        interactions !== null && postsPublished !== null && postsPublished > 0
            ? Math.round(interactions / postsPublished)
            : null;

    const tabs: SubTab[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'audience', label: 'Audience' },
        { key: 'posts', label: 'Posts' },
        { key: 'insights', label: 'Insights' },
        ...(hasCompetitors ? [{ key: 'competitors', label: 'Competitors' }] : []),
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <SubTabs tabs={tabs} active={tab} onChange={setTab} accent={ACCENT} />

            {tab === 'overview' && (
                <>
                    <Panel title="Community Growth" subtitle="Followers over the selected period">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <StatCard label="Followers" value={latest('followers')} emphasis />
                            <StatCard
                                label="Net change"
                                value={
                                    delta === null
                                        ? null
                                        : delta > 0
                                          ? `+${delta.toLocaleString()}`
                                          : delta.toLocaleString()
                                }
                            />
                            {/* profile_views is empty across every client on this account. */}
                            <StatCard label="Profile views" value={total('profileViews')} />
                        </div>
                        <TimelineChart series={series.followers ?? []} color={ACCENT} name="Followers" />
                    </Panel>

                    <Panel title="Reach & Impressions">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatCard label="Reach" value={total('reach')} emphasis />
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
                            <StatCard label="Interactions" value={interactions} emphasis />
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
                                        formatLabel={(l) =>
                                            ({ F: 'Female', M: 'Male', U: 'Unknown' })[l] ?? l
                                        }
                                    />
                                </Panel>

                                <Panel title="Age">
                                    <DistributionChart rows={distributions.rows.age ?? []} asPercentage />
                                </Panel>
                            </div>

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
