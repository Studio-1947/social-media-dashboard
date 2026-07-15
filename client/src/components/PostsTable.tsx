import { useState } from 'react';
import { Download, Search, Image as ImageIcon } from 'lucide-react';
import type { Post } from '../types/post';

interface PostsTableProps {
    posts: Post[];
    network: 'facebook' | 'instagram';
}

const NETWORK_LABEL: Record<PostsTableProps['network'], string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
};

const REACTION_EMOJI: Record<string, string> = {
    like: '👍',
    love: '❤️',
    haha: '😄',
    wow: '😮',
    sorry: '😢',
    anger: '😠',
};

const fmt = (n: number) => n.toLocaleString();
/** Reach is null when the platform didn't report it — show a dash, not a fake 0. */
const fmtN = (n: number | null) => (n == null ? '—' : n.toLocaleString());

/** "FEED_CAROUSEL_ALBUM" → "Carousel album"; "album" → "Album". */
function prettyType(type: string): string {
    const cleaned = type.replace(/^FEED_/, '').replace(/_/g, ' ').toLowerCase();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1) || 'Post';
}

function formatDate(iso: string | null) {
    if (!iso) return { date: '—', time: '' };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: '—', time: '' };
    return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
}

const Thumb = ({ post, size }: { post: Post; size: 'sm' | 'lg' }) => {
    const box = size === 'sm' ? 'w-12 h-12' : 'w-16 h-16';

    if (!post.imageUrl) {
        return (
            <div
                className={`${box} rounded-lg bg-primary-100 flex items-center justify-center text-primary-400 flex-shrink-0`}
            >
                <ImageIcon size={size === 'sm' ? 18 : 20} />
            </div>
        );
    }

    return (
        <img
            src={post.imageUrl}
            alt=""
            loading="lazy"
            // Meta's CDNs (cdninstagram / fbcdn) can reject hot-linked requests that
            // carry a referrer. Sending none is the difference between a thumbnail
            // and a broken image.
            referrerPolicy="no-referrer"
            className={`${box} rounded-lg object-cover bg-primary-100 ring-2 ring-primary-100 flex-shrink-0`}
            onError={(e) => {
                // Hide rather than show a broken-image glyph; the alt box below is
                // not worth a second render pass.
                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
        />
    );
};

export const PostsTable = ({ posts, network }: PostsTableProps) => {
    const [searchTerm, setSearchTerm] = useState('');

    const isFacebook = network === 'facebook';
    const q = searchTerm.toLowerCase();

    const filteredPosts = posts.filter(
        (p) => p.text.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
    );

    const downloadCSV = () => {
        if (posts.length === 0) return;

        const headers = [
            'Post', 'Type', 'Date', 'Impressions', 'Reach',
            isFacebook ? 'Reactions' : 'Likes',
            'Comments', 'Shares',
            isFacebook ? 'Clicks' : 'Saved',
            'Engagement % (of impressions)', 'URL',
        ];

        const rows = filteredPosts.map((p) => [
            `"${p.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
            prettyType(p.type),
            p.publishedAt ?? '',
            p.impressions, p.reach ?? '', p.likes, p.comments, p.shares,
            isFacebook ? (p.clicks ?? 0) : (p.saved ?? 0),
            p.engagementRate.toFixed(2),
            p.url ?? '',
        ]);

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        // BOM so Excel reads the Devanagari captions as UTF-8 instead of mojibake.
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${network}_posts_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className="modern-card p-6 lg:p-8 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-primary-900">List of Posts</h3>
                    <p className="text-sm text-primary-600 mt-1">
                        {posts.length} post{posts.length === 1 ? '' : 's'} in this period
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                        <input
                            type="text"
                            placeholder="Search posts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 text-sm border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-200 bg-white placeholder:text-primary-400 w-[200px] sm:w-[250px]"
                        />
                    </div>
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-primary-700 hover:text-primary-900 hover:bg-primary-50 rounded-xl border border-primary-200 transition-all duration-200 font-medium active:scale-95"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Download CSV</span>
                    </button>
                </div>
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-primary-200">
                        <tr className="text-left text-xs text-primary-600 uppercase tracking-wide">
                            <th className="pb-4 font-semibold">Post</th>
                            <th className="pb-4 font-semibold">Type</th>
                            <th className="pb-4 font-semibold">Date</th>
                            <th className="pb-4 font-semibold text-right">Impressions</th>
                            <th
                                className="pb-4 font-semibold text-right"
                                title={isFacebook ? 'Meta withholds reach on many Facebook posts; “—” means not reported.' : undefined}
                            >
                                Reach
                            </th>
                            <th className="pb-4 font-semibold text-right">
                                {isFacebook ? 'Reactions' : 'Likes'}
                            </th>
                            <th className="pb-4 font-semibold text-right">Comments</th>
                            <th className="pb-4 font-semibold text-right">Shares</th>
                            <th className="pb-4 font-semibold text-right">
                                {isFacebook ? 'Clicks' : 'Saved'}
                            </th>
                            <th className="pb-4 font-semibold text-right" title="Interactions as a % of impressions">
                                Eng.
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPosts.map((post, i) => {
                            const { date, time } = formatDate(post.publishedAt);
                            const firstLine = post.text.split('\n')[0];

                            return (
                                <tr
                                    key={post.postId || i}
                                    className="border-b border-primary-100 hover:bg-primary-50/50 transition-colors duration-200"
                                >
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <Thumb post={post} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-primary-900 truncate max-w-[260px] font-medium">
                                                    {firstLine || <span className="text-primary-400">No caption</span>}
                                                </div>
                                                {post.url && (
                                                    <a
                                                        href={post.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-primary-500 hover:text-accent-blue transition-colors"
                                                    >
                                                        View on {NETWORK_LABEL[network]} →
                                                    </a>
                                                )}
                                                {/* Facebook reports the reaction mix, not just a total. */}
                                                {post.reactions && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {Object.entries(post.reactions)
                                                            .filter(([, v]) => v > 0)
                                                            .map(([k, v]) => (
                                                                <span key={k} className="text-xs text-primary-600" title={k}>
                                                                    {REACTION_EMOJI[k] ?? k} {fmt(v)}
                                                                </span>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <span className="text-xs px-2.5 py-1 bg-primary-100 rounded-full text-primary-700 font-medium whitespace-nowrap">
                                            {prettyType(post.type)}
                                        </span>
                                    </td>
                                    <td className="py-4 text-sm text-primary-700 whitespace-nowrap">
                                        {date}
                                        {time && <div className="text-xs text-primary-400 mt-0.5">{time}</div>}
                                    </td>
                                    <td className="py-4 text-sm text-primary-900 text-right font-semibold">{fmt(post.impressions)}</td>
                                    <td className="py-4 text-sm text-primary-900 text-right font-semibold">{fmtN(post.reach)}</td>
                                    <td className="py-4 text-sm text-primary-900 text-right font-semibold">{fmt(post.likes)}</td>
                                    <td className="py-4 text-sm text-primary-900 text-right font-semibold">{fmt(post.comments)}</td>
                                    <td className="py-4 text-sm text-primary-900 text-right font-semibold">{fmt(post.shares)}</td>
                                    <td className="py-4 text-sm text-primary-900 text-right font-semibold">
                                        {fmt(isFacebook ? (post.clicks ?? 0) : (post.saved ?? 0))}
                                    </td>
                                    <td className="py-4 text-sm text-primary-900 text-right font-semibold">
                                        {post.engagementRate.toFixed(2)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-4">
                {filteredPosts.map((post, i) => {
                    const { date } = formatDate(post.publishedAt);
                    return (
                        <div
                            key={post.postId || i}
                            className="bg-primary-50/50 rounded-xl p-4 border border-primary-100"
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <Thumb post={post} size="lg" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-primary-900 font-medium mb-1 line-clamp-2">
                                        {post.text.split('\n')[0] || 'No caption'}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-primary-600">
                                        <span className="px-2 py-0.5 bg-primary-200 rounded-full">
                                            {prettyType(post.type)}
                                        </span>
                                        <span>•</span>
                                        <span>{date}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-primary-200">
                                <div className="text-center">
                                    <div className="text-sm font-bold text-primary-900">{fmt(post.impressions)}</div>
                                    <div className="text-xs text-primary-600">Impr.</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-bold text-primary-900">{fmtN(post.reach)}</div>
                                    <div className="text-xs text-primary-600">Reach</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-bold text-primary-900">{fmt(post.likes)}</div>
                                    <div className="text-xs text-primary-600">
                                        {isFacebook ? 'Reactions' : 'Likes'}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-bold text-primary-900">{fmt(post.comments)}</div>
                                    <div className="text-xs text-primary-600">Comments</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredPosts.length === 0 && (
                <div className="py-12 text-center">
                    <div className="text-primary-400 text-sm">
                        {posts.length === 0
                            ? 'No posts published in this period.'
                            : 'No posts match your search.'}
                    </div>
                </div>
            )}
        </div>
    );
};
