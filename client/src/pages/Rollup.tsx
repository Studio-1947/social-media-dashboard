import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Minus, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ErrorPanel, LoadingPanel, Panel } from '../components/AnalyticsPanels';
import { useSelection } from '../contexts/SelectionContext';
import { fetchInsights, type Network } from '../services/metricoolApi';
import { getPreviousPeriod } from '../lib/dateRange';
import { percentDelta } from '../lib/series';
import { cn } from '../lib/utils';

/**
 * "Which of my clients most needs attention this week" — a rollup across every
 * brand this account can see, instead of opening each client's Insights tab one
 * at a time. Reuses computeInsights() per (brand, network) exactly as the
 * per-client Insights tab does; this page's only job is running it N times and
 * sorting the results worst-first.
 *
 * Deliberately Facebook/Instagram only — YouTube has no per-post data, so
 * insightsService.ts can't produce a baseline for it (see YouTubeView.tsx).
 */
const INSIGHTS_NETWORKS: Network[] = ['facebook', 'instagram'];

/** Same reliability floor InsightsView's BaselineTrend uses — too few posts in
 *  the previous period and "vs last period" isn't a real comparison. */
const MIN_PREVIOUS_POSTS = 5;

/**
 * A drop this big is flagged as "needs attention" rather than left as just a
 * red trend pill — deliberately a much bigger bar than the ±3% MEANINGFUL_LIFT
 * threshold used everywhere else in Insights. That threshold marks "is this
 * different from noise"; this one marks "is this worth someone's attention
 * today," a different question with a much higher bar.
 */
const NEEDS_ATTENTION_THRESHOLD = -20;

function formatApiDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}

/** Last 30 days — same window Dashboard.tsx defaults to. */
function defaultRange() {
    const to = new Date();
    to.setHours(23, 59, 59, 0);
    const from = new Date();
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    return { from: formatApiDate(from), to: formatApiDate(to) };
}

interface RollupRow {
    blogId: number;
    brandName: string;
    brandPicture: string | null;
    network: Network;
    confidence: string;
    totalPosts: number;
    currentMedian: number;
    /** null when the previous period doesn't clear MIN_PREVIOUS_POSTS — no fake tie. */
    trendPct: number | null;
}

const NETWORK_LABEL: Record<Network, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    youtube: 'YouTube',
};

const CONFIDENCE_LABEL: Record<string, string> = {
    high: 'Strong pattern',
    medium: 'Fairly clear',
    low: 'Early hint',
    insufficient: 'Not enough posts',
};

const TrendCell = ({ pct }: { pct: number | null }) => {
    if (pct === null) {
        return <span className="text-xs text-primary-400 italic">no comparison yet</span>;
    }

    const tone: 'up' | 'down' | 'flat' = pct >= 3 ? 'up' : pct <= -3 ? 'down' : 'flat';
    const Icon = tone === 'up' ? ArrowUp : tone === 'down' ? ArrowDown : Minus;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 text-sm font-semibold',
                tone === 'up' && 'text-accent-green',
                tone === 'down' && 'text-accent-red',
                tone === 'flat' && 'text-primary-500'
            )}
        >
            <Icon size={13} />
            {Math.round(Math.abs(pct))}%
        </span>
    );
};

const RollupContent = () => {
    const {
        brands,
        loading: brandsLoading,
        error: brandsError,
        reload,
        selectBrand,
        selectNetwork,
    } = useSelection();
    const navigate = useNavigate();

    const [range] = useState(defaultRange);
    const previousRange = useMemo(() => getPreviousPeriod(range), [range]);

    const [rows, setRows] = useState<RollupRow[] | null>(null);
    const [rowsError, setRowsError] = useState<string | null>(null);

    useEffect(() => {
        if (!brands || brands.length === 0) return;
        let cancelled = false;
        setRows(null);
        setRowsError(null);

        const targets = brands.flatMap((brand) =>
            INSIGHTS_NETWORKS.filter((n) => brand.connectedNetworks.includes(n)).map((network) => ({
                brand,
                network,
            }))
        );

        if (targets.length === 0) {
            setRows([]);
            return;
        }

        Promise.allSettled(
            targets.map(({ brand, network }) =>
                Promise.all([
                    fetchInsights(network, range, brand.blogId),
                    fetchInsights(network, previousRange, brand.blogId),
                ]).then(([current, previous]) => ({ brand, network, current, previous }))
            )
        ).then((settled) => {
            if (cancelled) return;

            const built: RollupRow[] = [];
            for (const outcome of settled) {
                // A single client's failed fetch (bad credential, transient error) just
                // drops that row — same "quiet skip" the Competitors presence check uses,
                // rather than failing the whole rollup over one client.
                if (outcome.status !== 'fulfilled') continue;
                const { brand, network, current, previous } = outcome.value;
                if (current.totalPosts === 0) continue; // nothing to rank this client on

                const trendPct =
                    previous.totalPosts >= MIN_PREVIOUS_POSTS
                        ? percentDelta(current.baseline.medianEngagement, previous.baseline.medianEngagement)
                        : null;

                built.push({
                    blogId: brand.blogId,
                    brandName: brand.name,
                    brandPicture: brand.picture,
                    network,
                    confidence: current.recommendation.confidence,
                    totalPosts: current.totalPosts,
                    currentMedian: current.baseline.medianEngagement,
                    trendPct,
                });
            }

            // Worst-first: the client sliding the most leads the list. Rows with no
            // comparison (too few prior posts) sink to the bottom rather than being
            // sorted as "no change" — an absent comparison isn't a flat trend.
            built.sort((a, b) => {
                if (a.trendPct === null && b.trendPct === null) return 0;
                if (a.trendPct === null) return 1;
                if (b.trendPct === null) return -1;
                return a.trendPct - b.trendPct;
            });

            setRows(built);
        });

        return () => {
            cancelled = true;
        };
    }, [brands, range, previousRange]);

    const goToClient = (blogId: number, network: Network) => {
        selectBrand(blogId);
        selectNetwork(network);
        navigate('/dashboard');
    };

    if (brandsLoading) return <LoadingPanel label="Loading clients…" />;
    if (brandsError) return <ErrorPanel message={brandsError} onRetry={reload} />;
    if (!brands || brands.length === 0) {
        return (
            <Panel title="No clients yet">
                <p className="text-sm text-primary-500">No brands are configured on this Metricool account.</p>
            </Panel>
        );
    }

    const needsAttention = rows?.filter((r) => r.trendPct !== null && r.trendPct <= NEEDS_ATTENTION_THRESHOLD) ?? [];

    return (
        <>
            {needsAttention.length > 0 && (
                <div className="flex items-center gap-3 bg-accent-red/10 border border-accent-red/30 rounded-xl p-4 mb-6">
                    <AlertTriangle size={18} className="text-accent-red flex-shrink-0" />
                    <p className="text-sm text-primary-900">
                        <span className="font-semibold">
                            {needsAttention.length} client{needsAttention.length === 1 ? '' : 's'}
                        </span>{' '}
                        {needsAttention.length === 1 ? 'has' : 'have'} dropped {Math.abs(NEEDS_ATTENTION_THRESHOLD)}%
                        or more vs. the previous period — check the flagged rows below.
                    </p>
                </div>
            )}

            <Panel
                title="Engagement, last 30 days"
                subtitle="Sorted by the biggest drop vs. the previous 30 days — Facebook and Instagram only, since YouTube has no per-post data to analyse"
            >
                {rowsError && <ErrorPanel message={rowsError} />}

            {rows === null ? (
                <LoadingPanel label="Reading every client's recent posts…" />
            ) : rows.length === 0 ? (
                <div className="py-12 text-center text-sm text-primary-400">
                    No client has enough Facebook/Instagram posts in this window to rank yet.
                </div>
            ) : (
                <>
                    {/* Desktop table. Every header/cell carries its own horizontal padding —
                        relying on content width alone (as an auto-layout table does by
                        default) let narrow columns like "vs last period" and "Confidence"
                        render with zero gap between them. */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-primary-200">
                                <tr className="text-left text-xs text-primary-600 uppercase tracking-wide">
                                    <th className="pb-3 pr-4 font-semibold">Client</th>
                                    <th className="pb-3 px-4 font-semibold">Network</th>
                                    <th className="pb-3 px-4 font-semibold text-right">Typical engagement</th>
                                    <th className="pb-3 px-4 font-semibold text-right">vs last period</th>
                                    <th className="pb-3 px-4 font-semibold">Confidence</th>
                                    <th className="pb-3 pl-4 font-semibold text-right">Posts</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr
                                        key={`${row.blogId}-${row.network}`}
                                        onClick={() => goToClient(row.blogId, row.network)}
                                        className="border-b border-primary-100 hover:bg-primary-50/50 transition-colors cursor-pointer"
                                    >
                                        <td className="py-3.5 pr-4">
                                            <div className="flex items-center gap-3">
                                                {row.brandPicture ? (
                                                    <img
                                                        src={row.brandPicture}
                                                        alt=""
                                                        referrerPolicy="no-referrer"
                                                        className="w-8 h-8 rounded-full object-cover bg-primary-100 flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-500 flex-shrink-0">
                                                        {row.brandName.slice(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium text-primary-900 truncate">
                                                    {row.brandName}
                                                </span>
                                                {row.trendPct !== null && row.trendPct <= NEEDS_ATTENTION_THRESHOLD && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent-red/15 text-accent-red whitespace-nowrap">
                                                        Needs attention
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-sm text-primary-700 whitespace-nowrap">
                                            {NETWORK_LABEL[row.network]}
                                        </td>
                                        <td className="py-3.5 px-4 text-sm text-right font-semibold text-primary-900 whitespace-nowrap">
                                            {row.currentMedian.toFixed(1)}%
                                        </td>
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <TrendCell pct={row.trendPct} />
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <span className="text-xs font-medium text-primary-500">
                                                {CONFIDENCE_LABEL[row.confidence] ?? row.confidence}
                                            </span>
                                        </td>
                                        <td className="py-3.5 pl-4 text-sm text-right text-primary-700">
                                            {row.totalPosts}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards — same data as the table, stacked instead of columned. */}
                    <div className="lg:hidden space-y-3">
                        {rows.map((row) => (
                            <div
                                key={`${row.blogId}-${row.network}`}
                                onClick={() => goToClient(row.blogId, row.network)}
                                className="rounded-xl border border-primary-100 bg-primary-50/40 p-4 cursor-pointer hover:border-primary-200 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    {row.brandPicture ? (
                                        <img
                                            src={row.brandPicture}
                                            alt=""
                                            referrerPolicy="no-referrer"
                                            className="w-9 h-9 rounded-full object-cover bg-primary-100 flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-500 flex-shrink-0">
                                            {row.brandName.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-primary-900 truncate">
                                            {row.brandName}
                                        </div>
                                        <div className="text-xs text-primary-500">
                                            {NETWORK_LABEL[row.network]} · {CONFIDENCE_LABEL[row.confidence] ?? row.confidence}
                                        </div>
                                    </div>
                                    {row.trendPct !== null && row.trendPct <= NEEDS_ATTENTION_THRESHOLD && (
                                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent-red/15 text-accent-red whitespace-nowrap flex-shrink-0">
                                            Needs attention
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-primary-100">
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-primary-900">
                                            {row.currentMedian.toFixed(1)}%
                                        </div>
                                        <div className="text-xs text-primary-600">Engagement</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm font-bold">
                                            <TrendCell pct={row.trendPct} />
                                        </div>
                                        <div className="text-xs text-primary-600">vs last period</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-primary-900">{row.totalPosts}</div>
                                        <div className="text-xs text-primary-600">Posts</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

                <div className="flex items-start gap-2 mt-6 pt-4 border-t border-primary-100">
                    <AlertTriangle size={14} className="text-primary-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-primary-500">
                        Click any row to jump straight to that client's dashboard. "No comparison yet" means
                        the previous 30 days had too few posts to trust — not that engagement held steady.
                    </p>
                </div>
            </Panel>
        </>
    );
};

export const Rollup = () => (
    <DashboardLayout>
        <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 tracking-tight">
                    Client Rollup
                </h1>
                <p className="text-sm text-primary-600 mt-1">
                    Every client's engagement trend, in one place.
                </p>
            </div>
            <RollupContent />
        </div>
    </DashboardLayout>
);
