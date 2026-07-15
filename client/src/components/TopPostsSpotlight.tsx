import { Image as ImageIcon, Trophy } from 'lucide-react';
import { Panel } from './AnalyticsPanels';
import type { Post } from '../types/post';

const NETWORK_LABEL: Record<'facebook' | 'instagram', string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
};

function formatDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Top 3 posts this period, ranked by the same `engagementRate` (interactions
 * ÷ impressions) shown in the Posts tab — same ranking, just surfaced without
 * having to leave Overview.
 */
export const TopPostsSpotlight = ({
    posts,
    network,
}: {
    posts: Post[];
    network: 'facebook' | 'instagram';
}) => {
    const top = [...posts].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 3);

    if (top.length === 0) return null;

    return (
        <Panel title="Top performing posts" subtitle="Ranked by engagement rate this period">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {top.map((post, i) => {
                    const firstLine = post.text.split('\n')[0];
                    const date = formatDate(post.publishedAt);

                    return (
                        <a
                            key={post.postId || i}
                            href={post.url ?? undefined}
                            target={post.url ? '_blank' : undefined}
                            rel={post.url ? 'noopener noreferrer' : undefined}
                            className="rounded-xl border border-primary-100 bg-primary-50/40 p-4 hover:shadow-modern-lg hover:border-primary-200 transition-all block"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Trophy size={14} className="text-accent-orange flex-shrink-0" />
                                <span className="text-xs font-semibold text-primary-500">#{i + 1}</span>
                                {date && <span className="text-xs text-primary-400 ml-auto">{date}</span>}
                            </div>

                            <div className="flex items-start gap-3 mb-3">
                                {post.imageUrl ? (
                                    <img
                                        src={post.imageUrl}
                                        alt=""
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        className="w-12 h-12 rounded-lg object-cover bg-primary-100 flex-shrink-0"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                                        }}
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center text-primary-400 flex-shrink-0">
                                        <ImageIcon size={16} />
                                    </div>
                                )}
                                <div className="text-sm text-primary-900 font-medium line-clamp-2 min-w-0">
                                    {firstLine || <span className="text-primary-400">No caption</span>}
                                </div>
                            </div>

                            <div className="flex items-baseline justify-between">
                                <span className="text-lg font-bold text-primary-900">
                                    {post.engagementRate.toFixed(1)}%
                                </span>
                                <span className="text-xs text-primary-500">on {NETWORK_LABEL[network]}</span>
                            </div>
                        </a>
                    );
                })}
            </div>
        </Panel>
    );
};
