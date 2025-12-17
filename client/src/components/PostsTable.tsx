import { Download } from 'lucide-react';

interface PostsTableProps {
    posts: any[];
}

export const PostsTable = ({ posts }: PostsTableProps) => {
    return (
        <div className="modern-card p-6 lg:p-8 animate-slide-up animate-delay-400">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-xl font-bold text-primary-900">List of Posts</h3>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Search posts..."
                        className="px-4 py-2 text-sm border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-200 bg-white placeholder:text-primary-400"
                    />
                    <button className="flex items-center gap-2 px-4 py-2 text-sm text-primary-700 hover:text-primary-900 hover:bg-primary-50 rounded-xl border border-primary-200 transition-all duration-200 font-medium">
                        <Download size={16} />
                        <span className="hidden sm:inline">Download CSV</span>
                    </button>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-primary-200">
                        <tr className="text-left text-xs text-primary-600 uppercase tracking-wide">
                            <th className="pb-4 font-semibold">Post</th>
                            <th className="pb-4 font-semibold">Type</th>
                            <th className="pb-4 font-semibold">Date</th>
                            <th className="pb-4 font-semibold text-right">Views</th>
                            <th className="pb-4 font-semibold text-right">Reach</th>
                            <th className="pb-4 font-semibold text-right">Likes</th>
                            <th className="pb-4 font-semibold text-right">Comments</th>
                            <th className="pb-4 font-semibold text-right">Saved</th>
                            <th className="pb-4 font-semibold text-right">Shares</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.map((post, index) => (
                            <tr key={post.postId || index} className="border-b border-primary-100 hover:bg-primary-50/50 transition-colors duration-200 group">
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={post.imageUrl || 'https://via.placeholder.com/48'}
                                            alt="Post thumbnail"
                                            className="w-12 h-12 rounded-lg object-cover bg-primary-100 ring-2 ring-primary-100 group-hover:ring-primary-200 transition-all duration-200"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = 'https://via.placeholder.com/48?text=No+Image';
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-primary-900 truncate max-w-[250px] font-medium">
                                                {post.content?.split('\n')[0] || post.caption?.split('\n')[0] || `Post from ${new Date(post.publishedAt?.dateTime).toLocaleDateString()}`}
                                            </div>
                                            <div className="text-xs text-primary-500 mt-1">
                                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent-blue transition-colors">
                                                    View on Instagram →
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4">
                                    <span className="text-xs px-2.5 py-1 bg-primary-100 rounded-full text-primary-700 font-medium">
                                        {post.type?.replace('FEED_', '').replace('_', ' ') || 'POST'}
                                    </span>
                                </td>
                                <td className="py-4 text-sm text-primary-700">
                                    {new Date(post.publishedAt?.dateTime || post.createdTime).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                    <div className="text-xs text-primary-400 mt-0.5">
                                        {new Date(post.publishedAt?.dateTime || post.createdTime).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </td>
                                <td className="py-4 text-sm text-primary-900 text-right font-semibold">{(post.views || post.impressionsTotal || 0).toLocaleString()}</td>
                                <td className="py-4 text-sm text-primary-900 text-right font-semibold">{(post.reach || 0).toLocaleString()}</td>
                                <td className="py-4 text-sm text-primary-900 text-right font-semibold">{(post.likes || 0).toLocaleString()}</td>
                                <td className="py-4 text-sm text-primary-900 text-right font-semibold">{(post.comments || 0).toLocaleString()}</td>
                                <td className="py-4 text-sm text-primary-900 text-right font-semibold">{(post.saved || 0).toLocaleString()}</td>
                                <td className="py-4 text-sm text-primary-900 text-right font-semibold">{(post.shares || 0).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
                {posts.map((post, index) => (
                    <div key={post.postId || index} className="bg-primary-50/50 rounded-xl p-4 border border-primary-100 hover:border-primary-200 transition-all duration-200">
                        <div className="flex items-start gap-3 mb-3">
                            <img
                                src={post.imageUrl || 'https://via.placeholder.com/64'}
                                alt="Post thumbnail"
                                className="w-16 h-16 rounded-lg object-cover bg-primary-100"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://via.placeholder.com/64?text=No+Image';
                                }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-primary-900 font-medium mb-1 line-clamp-2">
                                    {post.content?.split('\n')[0] || post.caption?.split('\n')[0] || `Post from ${new Date(post.publishedAt?.dateTime).toLocaleDateString()}`}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-primary-600">
                                    <span className="px-2 py-0.5 bg-primary-200 rounded-full">
                                        {post.type?.replace('FEED_', '').replace('_', ' ') || 'POST'}
                                    </span>
                                    <span>•</span>
                                    <span>
                                        {new Date(post.publishedAt?.dateTime || post.createdTime).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-primary-200">
                            <div className="text-center">
                                <div className="text-sm font-bold text-primary-900">{(post.views || post.impressionsTotal || 0).toLocaleString()}</div>
                                <div className="text-xs text-primary-600">Views</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-bold text-primary-900">{(post.likes || 0).toLocaleString()}</div>
                                <div className="text-xs text-primary-600">Likes</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-bold text-primary-900">{(post.comments || 0).toLocaleString()}</div>
                                <div className="text-xs text-primary-600">Comments</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
