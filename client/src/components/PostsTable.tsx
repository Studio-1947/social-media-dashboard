import { Download } from 'lucide-react';

interface PostsTableProps {
    posts: any[];
}

export const PostsTable = ({ posts }: PostsTableProps) => {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">List of posts</h3>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Search"
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">
                        <Download size={16} />
                        Download CSV
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-gray-200">
                        <tr className="text-left text-sm text-gray-600">
                            <th className="pb-3 font-medium">Post</th>
                            <th className="pb-3 font-medium">Type</th>
                            <th className="pb-3 font-medium">Date</th>
                            <th className="pb-3 font-medium text-right">Views</th>
                            <th className="pb-3 font-medium text-right">Reach</th>
                            <th className="pb-3 font-medium text-right">Likes</th>
                            <th className="pb-3 font-medium text-right">Comments</th>
                            <th className="pb-3 font-medium text-right">Saved</th>
                            <th className="pb-3 font-medium text-right">Shares</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.map((post, index) => (
                            <tr key={post.postId || index} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={post.imageUrl || 'https://via.placeholder.com/48'}
                                            alt="Post thumbnail"
                                            className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = 'https://via.placeholder.com/48?text=No+Image';
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-gray-900 truncate max-w-[250px]">
                                                {post.content?.split('\n')[0] || post.caption?.split('\n')[0] || `Post from ${new Date(post.publishedAt?.dateTime).toLocaleDateString()}`}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                                                    View on Instagram
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4">
                                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                                        {post.type?.replace('FEED_', '').replace('_', ' ') || 'POST'}
                                    </span>
                                </td>
                                <td className="py-4 text-sm text-gray-600">
                                    {new Date(post.publishedAt?.dateTime || post.createdTime).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                    <div className="text-xs text-gray-400">
                                        {new Date(post.publishedAt?.dateTime || post.createdTime).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </td>
                                <td className="py-4 text-sm text-gray-900 text-right font-medium">{post.views || post.impressionsTotal || 0}</td>
                                <td className="py-4 text-sm text-gray-900 text-right font-medium">{post.reach || 0}</td>
                                <td className="py-4 text-sm text-gray-900 text-right font-medium">{post.likes || 0}</td>
                                <td className="py-4 text-sm text-gray-900 text-right font-medium">{post.comments || 0}</td>
                                <td className="py-4 text-sm text-gray-900 text-right font-medium">{post.saved || 0}</td>
                                <td className="py-4 text-sm text-gray-900 text-right font-medium">{post.shares || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
