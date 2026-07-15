import { useState } from 'react';
import {
    Lightbulb,
    TrendingUp,
    Clock,
    CalendarDays,
    Type,
    Hash,
    AlertTriangle,
    ChevronDown,
} from 'lucide-react';
import { ErrorPanel, LoadingPanel, Panel } from './AnalyticsPanels';
import { useInsights } from '../hooks/useMetricool';
import { cn } from '../lib/utils';
import type { DateRange, Network } from '../services/metricoolApi';
import type { Bucket, Confidence, Insights } from '../types/insights';

/**
 * "What's working / what to post next" — written for the client, not an analyst.
 *
 * The stats underneath are median-per-bucket with sample sizes (see the server),
 * but NONE of that vocabulary reaches the screen: no "median", no "n=", no
 * "baseline". The reader gets one plain sentence of advice, a few supporting
 * cards, and — only if they want it — a "how we worked this out" drawer.
 *
 * Two honesty rules the copy must never break:
 *   1. A group is only called a "winner" if it's genuinely ABOVE this account's
 *      average (MEANINGFUL_LIFT). The old version recommended the best available
 *      day even when that day was −2% — presenting the least-bad option as good.
 *   2. Sample size is always reachable, just phrased as "based on N posts" rather
 *      than "n=N".
 */

/** Below this much lift, a group isn't meaningfully better — don't call it a win. */
const MEANINGFUL_LIFT = 3;

const isWinner = (b: Bucket | null): b is Bucket => !!b && b.liftPct >= MEANINGFUL_LIFT;

/** Friendly phrase for each time-of-day band (keyed by the server's bucket key). */
const HOUR_PHRASE: Record<string, string> = {
    early: 'overnight',
    morning: 'the early morning',
    midday: 'the late morning',
    afternoon: 'the early afternoon',
    lateafternoon: 'the late afternoon',
    evening: 'the evening',
    night: 'the late evening',
};

const CAPTION_PHRASE: Record<string, string> = {
    short: 'a short',
    medium: 'a medium-length',
    long: 'a long',
    verylong: 'a very long',
};

const CONFIDENCE: Record<Confidence, { label: string; help: string; cls: string }> = {
    high: {
        label: 'Strong pattern',
        help: 'Plenty of past posts back this up.',
        cls: 'bg-accent-green/15 text-accent-green border-accent-green/30',
    },
    medium: {
        label: 'Fairly clear',
        help: 'A reasonable number of posts back this up.',
        cls: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
    },
    low: {
        label: 'Early hint',
        help: 'Not many posts yet — treat this as a gentle nudge, not a rule.',
        cls: 'bg-accent-orange/15 text-accent-orange border-accent-orange/30',
    },
    insufficient: {
        label: 'Not enough posts yet',
        help: 'This client needs to publish more before patterns are trustworthy.',
        cls: 'bg-primary-100 text-primary-500 border-primary-200',
    },
};

/** Engagement as a friendly 1-decimal %. */
const eng = (n: number) => `${n.toFixed(1)}%`;
/** "18% more" / "5% less" / "about the same". */
function compareToAverage(liftPct: number): { text: string; tone: 'up' | 'down' | 'flat' } {
    if (liftPct >= MEANINGFUL_LIFT) return { text: `${Math.round(liftPct)}% more than usual`, tone: 'up' };
    if (liftPct <= -MEANINGFUL_LIFT) return { text: `${Math.round(-liftPct)}% less than usual`, tone: 'down' };
    return { text: 'about the same as usual', tone: 'flat' };
}

/* ------------------------------------------------------------------ */

/** Builds the single plain-English recommendation sentence. */
function buildAdvice(insights: Insights): string {
    const r = insights.recommendation;
    const network = insights.network === 'facebook' ? 'Facebook' : 'Instagram';

    const lead = isWinner(r.format) ? `a ${r.format.label.toLowerCase()}` : 'your next post';

    let sentence = `Post ${lead}`;
    if (isWinner(r.weekday)) sentence += ` on a ${r.weekday.label}`;
    if (isWinner(r.hourBand)) sentence += ` in ${HOUR_PHRASE[r.hourBand.key] ?? r.hourBand.label}`;
    if (isWinner(r.captionLength)) {
        sentence += `, with ${CAPTION_PHRASE[r.captionLength.key] ?? 'a'} caption`;
    }
    sentence += '.';

    const nothingStands =
        !isWinner(r.format) &&
        !isWinner(r.weekday) &&
        !isWinner(r.hourBand) &&
        !isWinner(r.captionLength);

    if (nothingStands) {
        return `Nothing clearly out-performs the rest yet on ${network} — keep posting consistently and this advice will sharpen as more posts come in.`;
    }
    return sentence;
}

/* ------------------------------------------------------------------ */

const ConfidenceBadge = ({ confidence }: { confidence: Confidence }) => {
    const c = CONFIDENCE[confidence];
    return (
        <span
            className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border', c.cls)}
            title={c.help}
        >
            {c.label}
        </span>
    );
};

/** One supporting fact card: Format / Day / Time / Caption. */
const PickCard = ({
    icon,
    label,
    bucket,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    bucket: Bucket | null;
    accent: string;
}) => {
    const win = isWinner(bucket);
    return (
        <div
            className={cn(
                'rounded-xl border p-4',
                win ? 'border-primary-100 bg-white' : 'border-dashed border-primary-200 bg-primary-50/40'
            )}
        >
            <div className="flex items-center gap-1.5 text-primary-400 mb-2">
                {icon}
                <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            {win ? (
                <>
                    <div className="text-base font-bold text-primary-900 leading-tight">{bucket.label}</div>
                    <div className="text-xs mt-1 font-semibold" style={{ color: accent }}>
                        {Math.round(bucket.liftPct)}% more engagement
                    </div>
                    <div className="text-xs text-primary-400 mt-0.5">based on {bucket.n} posts</div>
                </>
            ) : (
                <>
                    <div className="text-base font-semibold text-primary-400 leading-tight">No clear favourite</div>
                    <div className="text-xs text-primary-400 mt-1">timing doesn't move the needle here</div>
                </>
            )}
        </div>
    );
};

const Recommendation = ({ insights, accent }: { insights: Insights; accent: string }) => {
    const r = insights.recommendation;
    const [showWhy, setShowWhy] = useState(false);
    const advice = buildAdvice(insights);

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
                            From this account's last {insights.totalPosts} posts
                        </p>
                    </div>
                </div>
                <ConfidenceBadge confidence={r.confidence} />
            </div>

            {r.confidence === 'insufficient' ? (
                <div className="flex items-start gap-3 bg-primary-50/60 border border-dashed border-primary-200 rounded-xl p-5">
                    <AlertTriangle size={18} className="text-primary-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-primary-600">
                        There aren't enough posts in this date range to spot a reliable pattern yet.
                        Try a longer date range at the top of the page, or check back once this client
                        has published more.
                    </div>
                </div>
            ) : (
                <>
                    {/* The one-sentence answer, front and centre. */}
                    <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: `${accent}0d` }}>
                        <p className="text-lg sm:text-xl font-semibold text-primary-900 leading-snug">
                            {advice}
                        </p>
                        {r.expectedEngagement && isWinner(r.format) && (
                            <p className="text-sm text-primary-600 mt-2">
                                A {r.format!.label.toLowerCase()} post usually gets around{' '}
                                <span className="font-bold text-primary-900">
                                    {eng(r.expectedEngagement.median)}
                                </span>{' '}
                                engagement — most land between {eng(r.expectedEngagement.p25)} and{' '}
                                {eng(r.expectedEngagement.p75)}.
                            </p>
                        )}
                    </div>

                    {/* Supporting cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                        <PickCard icon={<TrendingUp size={16} />} label="Format" bucket={r.format} accent={accent} />
                        <PickCard icon={<CalendarDays size={16} />} label="Day" bucket={r.weekday} accent={accent} />
                        <PickCard icon={<Clock size={16} />} label="Time" bucket={r.hourBand} accent={accent} />
                        <PickCard icon={<Type size={16} />} label="Caption" bucket={r.captionLength} accent={accent} />
                    </div>

                    {r.hashtags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Hash size={15} className="text-primary-400" />
                            <span className="text-sm text-primary-600 mr-1">Hashtags that tend to help:</span>
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

                    {/* Details, only if asked for. */}
                    {r.rationale.length > 0 && (
                        <div className="mt-4 border-t border-primary-100 pt-3">
                            <button
                                onClick={() => setShowWhy((v) => !v)}
                                className="flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-800 transition-colors"
                            >
                                <ChevronDown
                                    size={16}
                                    className={cn('transition-transform', showWhy && 'rotate-180')}
                                />
                                How we worked this out
                            </button>
                            {showWhy && (
                                <ul className="space-y-1.5 mt-3">
                                    {r.rationale.map((line, i) => (
                                        <li key={i} className="text-sm text-primary-600 flex gap-2">
                                            <span className="text-primary-300 mt-0.5">•</span>
                                            <span>{line}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

/** A ranked breakdown — bars are relative to this account's own average. */
const BreakdownPanel = ({
    title,
    subtitle,
    buckets,
    accent,
}: {
    title: string;
    subtitle: string;
    buckets: Bucket[];
    accent: string;
}) => {
    const usable = buckets.filter((b) => b.enoughData);
    const maxAbsLift = Math.max(1, ...usable.map((b) => Math.abs(b.liftPct)));

    return (
        <Panel title={title} subtitle={subtitle}>
            <div className="space-y-2.5">
                {buckets.map((b) => {
                    const cmp = compareToAverage(b.liftPct);
                    return (
                        <div
                            key={b.key}
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-4 py-3 border',
                                b.enoughData
                                    ? 'bg-primary-50/50 border-primary-100'
                                    : 'bg-primary-50/20 border-dashed border-primary-200 opacity-60'
                            )}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-primary-900 truncate">{b.label}</span>
                                    <span className="text-xs text-primary-400 whitespace-nowrap">
                                        {b.n} post{b.n === 1 ? '' : 's'}
                                    </span>
                                    {!b.enoughData && (
                                        <span className="text-xs text-primary-400 italic">too few to rely on</span>
                                    )}
                                </div>
                                {b.enoughData && (
                                    <div className="mt-1.5 h-1.5 bg-primary-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${(Math.abs(b.liftPct) / maxAbsLift) * 100}%`,
                                                backgroundColor: b.liftPct >= 0 ? accent : '#ef4444',
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                            {b.enoughData && (
                                <div className="text-right whitespace-nowrap">
                                    <div className="text-sm font-bold text-primary-900">{eng(b.medianEngagement)}</div>
                                    <div
                                        className={cn(
                                            'text-xs font-semibold',
                                            cmp.tone === 'up' && 'text-accent-green',
                                            cmp.tone === 'down' && 'text-accent-red',
                                            cmp.tone === 'flat' && 'text-primary-400'
                                        )}
                                    >
                                        {cmp.text}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {buckets.length === 0 && (
                    <div className="text-sm text-primary-400 py-4 text-center">No posts to break down here.</div>
                )}
            </div>
        </Panel>
    );
};

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

    if (loading) return <LoadingPanel label="Reading this account's past posts…" />;
    if (error) return <ErrorPanel message={error} onRetry={reload} />;
    if (!insights) return null;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Plain-language framing. Teaches "engagement" once, up front. */}
            <div className="flex items-start gap-3 bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-4">
                <Lightbulb size={18} className="text-accent-blue flex-shrink-0 mt-0.5" />
                <p className="text-sm text-primary-600 leading-relaxed">
                    This looks at what this account has already posted and finds what tends to get the
                    best response. <span className="font-semibold text-primary-700">Engagement</span> means
                    the share of people who saw a post and then liked, commented, saved or shared it. It's a
                    guide based on real history — not a guarantee — and any group with too few posts to be
                    sure is left out.
                </p>
            </div>

            <Recommendation insights={insights} accent={accent} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BreakdownPanel
                    title="Which formats work best"
                    subtitle="Longer bar = more engagement than this account's average"
                    buckets={insights.byType}
                    accent={accent}
                />
                <BreakdownPanel
                    title="Best days to post"
                    subtitle="Based on when past posts went out"
                    buckets={insights.byWeekday}
                    accent={accent}
                />
                <BreakdownPanel
                    title={`Best times to post (${insights.timezone})`}
                    subtitle="Times shown in this client's timezone"
                    buckets={insights.byHourBand}
                    accent={accent}
                />
                <BreakdownPanel
                    title="Caption length"
                    subtitle="How much text tends to land best"
                    buckets={insights.byCaptionLength}
                    accent={accent}
                />
            </div>

            {insights.topHashtags.length > 0 && (
                <Panel
                    title="Hashtags that tend to help"
                    subtitle="Only hashtags used on enough posts to judge fairly"
                >
                    <div className="space-y-2">
                        {insights.topHashtags.map((h) => {
                            const cmp = compareToAverage(h.liftPct);
                            return (
                                <div
                                    key={h.tag}
                                    className="flex items-center gap-3 py-2 border-b border-primary-50 last:border-0"
                                >
                                    <span className="text-sm font-medium text-primary-900 flex-1 truncate">
                                        {h.tag}
                                    </span>
                                    <span className="text-xs text-primary-400">{h.n} posts</span>
                                    <span
                                        className={cn(
                                            'text-xs font-semibold w-40 text-right',
                                            cmp.tone === 'up' && 'text-accent-green',
                                            cmp.tone === 'down' && 'text-accent-red',
                                            cmp.tone === 'flat' && 'text-primary-400'
                                        )}
                                    >
                                        {cmp.text}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </Panel>
            )}
        </div>
    );
};
