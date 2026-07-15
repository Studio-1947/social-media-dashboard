import { Lightbulb, TrendingUp, Clock, CalendarDays, Type, Hash, AlertTriangle } from 'lucide-react';
import { ErrorPanel, LoadingPanel, Panel } from './AnalyticsPanels';
import { useInsights } from '../hooks/useMetricool';
import { cn } from '../lib/utils';
import type { DateRange, Network } from '../services/metricoolApi';
import type { Bucket, Confidence, Insights } from '../types/insights';

/**
 * "What's working / what to post next" — the Insights sub-tab.
 *
 * Everything here is median-based statistics with sample sizes on display, NOT a
 * prediction model, and the copy says so. The cardinal rule: never state a
 * recommendation more confidently than the sample size supports. Thin buckets are
 * shown greyed, an under-posted client gets an honest "not enough data yet", and
 * every headline number carries the `n` it came from.
 */

const CONFIDENCE_STYLE: Record<Confidence, { label: string; cls: string }> = {
    high: { label: 'High confidence', cls: 'bg-accent-green/15 text-accent-green border-accent-green/30' },
    medium: { label: 'Medium confidence', cls: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30' },
    low: { label: 'Low confidence', cls: 'bg-accent-orange/15 text-accent-orange border-accent-orange/30' },
    insufficient: { label: 'Not enough data', cls: 'bg-primary-100 text-primary-500 border-primary-200' },
};

const pct = (n: number) => `${n >= 0 ? '' : ''}${n.toFixed(2)}%`;
const lift = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(0)}%`;

const ConfidenceBadge = ({ confidence }: { confidence: Confidence }) => {
    const s = CONFIDENCE_STYLE[confidence];
    return (
        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border', s.cls)}>
            {s.label}
        </span>
    );
};

/** A ranked list of buckets with sample sizes and lift bars. */
const BucketList = ({
    title,
    icon,
    buckets,
    accent,
}: {
    title: string;
    icon: React.ReactNode;
    buckets: Bucket[];
    accent: string;
}) => {
    const usable = buckets.filter((b) => b.enoughData);
    const maxAbsLift = Math.max(1, ...usable.map((b) => Math.abs(b.liftPct)));

    return (
        <Panel title={title}>
            <div className="flex items-center gap-2 -mt-4 mb-4 text-primary-400">{icon}</div>
            <div className="space-y-2.5">
                {buckets.map((b) => (
                    <div
                        key={b.key}
                        className={cn(
                            'flex items-center gap-3 rounded-xl px-4 py-3 border',
                            b.enoughData ? 'bg-primary-50/50 border-primary-100' : 'bg-primary-50/20 border-dashed border-primary-200 opacity-60'
                        )}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-primary-900 truncate">{b.label}</span>
                                <span
                                    className="text-xs text-primary-400 whitespace-nowrap"
                                    title="Number of posts this is based on"
                                >
                                    n={b.n}
                                </span>
                                {!b.enoughData && (
                                    <span className="text-xs text-primary-400 italic">too few to rely on</span>
                                )}
                            </div>
                            {/* lift bar, centred on 0 */}
                            <div className="mt-1.5 h-1.5 bg-primary-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${(Math.abs(b.liftPct) / maxAbsLift) * 100}%`,
                                        backgroundColor: b.liftPct >= 0 ? accent : '#ef4444',
                                    }}
                                />
                            </div>
                        </div>
                        <div className="text-right whitespace-nowrap">
                            <div className="text-sm font-bold text-primary-900">{pct(b.medianEngagement)}</div>
                            <div
                                className={cn(
                                    'text-xs font-semibold',
                                    b.liftPct >= 0 ? 'text-accent-green' : 'text-accent-red'
                                )}
                            >
                                {lift(b.liftPct)}
                            </div>
                        </div>
                    </div>
                ))}
                {buckets.length === 0 && (
                    <div className="text-sm text-primary-400 py-4 text-center">No posts to break down here.</div>
                )}
            </div>
        </Panel>
    );
};

const Recommendation = ({ insights, accent }: { insights: Insights; accent: string }) => {
    const r = insights.recommendation;

    return (
        <div className="modern-card p-6 lg:p-8 animate-slide-up">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                        style={{ backgroundColor: accent }}
                    >
                        <Lightbulb size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-primary-900">What to post next</h3>
                        <p className="text-sm text-primary-600">
                            Based on {insights.totalPosts} past posts · times in {insights.timezone}
                        </p>
                    </div>
                </div>
                <ConfidenceBadge confidence={r.confidence} />
            </div>

            {r.confidence === 'insufficient' ? (
                <div className="flex items-start gap-3 bg-primary-50/60 border border-dashed border-primary-200 rounded-xl p-5">
                    <AlertTriangle size={18} className="text-primary-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-primary-600">{r.rationale[0]}</div>
                </div>
            ) : (
                <>
                    {/* The headline picks */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                        <Pick icon={<TrendingUp size={16} />} label="Format" bucket={r.format} accent={accent} />
                        <Pick icon={<CalendarDays size={16} />} label="Day" bucket={r.weekday} accent={accent} />
                        <Pick icon={<Clock size={16} />} label="Time" bucket={r.hourBand} accent={accent} />
                        <Pick icon={<Type size={16} />} label="Caption" bucket={r.captionLength} accent={accent} />
                    </div>

                    {r.expectedEngagement && (
                        <div className="bg-primary-50/50 rounded-xl p-4 mb-5 border border-primary-100">
                            <div className="text-xs text-primary-500 uppercase tracking-wide font-semibold mb-1">
                                Expected engagement for a {r.format?.label.toLowerCase()} post
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-primary-900">
                                    {pct(r.expectedEngagement.median)}
                                </span>
                                <span className="text-sm text-primary-500">
                                    typically {pct(r.expectedEngagement.p25)} – {pct(r.expectedEngagement.p75)}
                                </span>
                            </div>
                        </div>
                    )}

                    {r.hashtags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-5">
                            <Hash size={15} className="text-primary-400" />
                            {r.hashtags.map((tag) => (
                                <span
                                    key={tag}
                                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-100 text-primary-700"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Why — every claim tied to its sample size */}
                    <div>
                        <div className="text-xs text-primary-500 uppercase tracking-wide font-semibold mb-2">
                            Why
                        </div>
                        <ul className="space-y-1.5">
                            {r.rationale.map((line, i) => (
                                <li key={i} className="text-sm text-primary-700 flex gap-2">
                                    <span className="text-primary-300 mt-0.5">•</span>
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
};

const Pick = ({
    icon,
    label,
    bucket,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    bucket: Bucket | null;
    accent: string;
}) => (
    <div className="rounded-xl border border-primary-100 bg-white p-4">
        <div className="flex items-center gap-1.5 text-primary-400 mb-2">
            {icon}
            <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        </div>
        {bucket ? (
            <>
                <div className="text-sm font-bold text-primary-900 leading-tight">{bucket.label}</div>
                <div className="text-xs mt-1" style={{ color: accent }}>
                    {lift(bucket.liftPct)} · n={bucket.n}
                </div>
            </>
        ) : (
            <div className="text-sm text-primary-400">Not enough data</div>
        )}
    </div>
);

export const InsightsView = ({
    network,
    range,
    blogId,
    enabled,
}: {
    network: Network;
    range: DateRange;
    blogId: number;
    enabled: boolean;
}) => {
    const { insights, loading, error, reload } = useInsights(network, range, blogId, enabled);
    const accent = network === 'facebook' ? '#1877F2' : '#E1306C';

    if (loading) return <LoadingPanel label="Analysing post history…" />;
    if (error) return <ErrorPanel message={error} onRetry={reload} />;
    if (!insights) return null;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Honest framing up front — this is stats, not a crystal ball. */}
            <div className="flex items-start gap-3 bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-4">
                <Lightbulb size={18} className="text-accent-blue flex-shrink-0 mt-0.5" />
                <p className="text-xs text-primary-600 leading-relaxed">
                    These are patterns from this client's own posting history — median engagement
                    (interactions ÷ impressions) per group, with the number of posts behind each. It
                    describes what has worked, not a guaranteed forecast. Groups with too few posts are
                    greyed out and never drive a recommendation.
                </p>
            </div>

            <Recommendation insights={insights} accent={accent} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BucketList title="By format" icon={<TrendingUp size={15} />} buckets={insights.byType} accent={accent} />
                <BucketList title="By day of week" icon={<CalendarDays size={15} />} buckets={insights.byWeekday} accent={accent} />
                <BucketList title={`By time of day (${insights.timezone})`} icon={<Clock size={15} />} buckets={insights.byHourBand} accent={accent} />
                <BucketList title="By caption length" icon={<Type size={15} />} buckets={insights.byCaptionLength} accent={accent} />
            </div>

            {insights.topHashtags.length > 0 && (
                <Panel title="Hashtags that lift engagement" subtitle="Only hashtags used on enough posts to judge">
                    <div className="space-y-2">
                        {insights.topHashtags.map((h) => (
                            <div key={h.tag} className="flex items-center gap-3 py-2 border-b border-primary-50 last:border-0">
                                <span className="text-sm font-medium text-primary-900 flex-1 truncate">{h.tag}</span>
                                <span className="text-xs text-primary-400">n={h.n}</span>
                                <span className="text-sm font-bold text-primary-900 w-16 text-right">{pct(h.medianEngagement)}</span>
                                <span className={cn('text-xs font-semibold w-12 text-right', h.liftPct >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                                    {lift(h.liftPct)}
                                </span>
                            </div>
                        ))}
                    </div>
                </Panel>
            )}
        </div>
    );
};
