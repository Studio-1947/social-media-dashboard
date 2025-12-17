import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface MetricCard {
    value: string | number;
    label: string;
    color: string;
    trend?: 'up' | 'down';
}

export const MetricoolDashboard = ({ instagramData }: { instagramData: any }) => {
    const posts = instagramData?.data || [];

    // Calculate metrics
    const totalPosts = posts.length;
    const totalReach = posts.reduce((sum: number, p: any) => sum + (p.reach || 0), 0);
    const totalViews = posts.reduce((sum: number, p: any) => sum + (p.views || p.impressionsTotal || 0), 0);
    const totalLikes = posts.reduce((sum: number, p: any) => sum + (p.likes || 0), 0);
    const totalComments = posts.reduce((sum: number, p: any) => sum + (p.comments || 0), 0);
    const totalSaved = posts.reduce((sum: number, p: any) => sum + (p.saved || 0), 0);
    const totalInteractions = posts.reduce((sum: number, p: any) => sum + (p.interactions || 0), 0);
    const avgEngagement = posts.length > 0
        ? (posts.reduce((sum: number, p: any) => sum + (p.engagement || 0), 0) / posts.length).toFixed(2)
        : '0';
    const avgReachPerPost = posts.length > 0 ? Math.round(totalReach / posts.length) : 0;

    // Chart data for engagement over time
    const chartData = posts.map((post: any) => ({
        name: new Date(post.publishedAt?.dateTime || post.createdTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        engagement: post.engagement || 0,
        reach: post.reach || 0,
        views: post.views || post.impressionsTotal || 0,
        likes: post.likes || 0,
        interactions: post.interactions || 0
    }));

    const MetricCard = ({ value, label, color, trend }: MetricCard) => (
        <div className={`${color} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-gray-900">
                    {value}
                    {trend && <span className="text-sm ml-1">{trend === 'up' ? '↑' : '↓'}</span>}
                </div>
            </div>
            <div className="text-sm text-gray-700 mt-1">{label}</div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Community Growth Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Community</h3>
                    <div className="flex items-center gap-2 text-sm bg-red-500 text-white px-3 py-1 rounded">
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                        himalnagarik
                    </div>
                </div>

                <div className="mb-4">
                    <h4 className="text-base font-medium text-gray-700 mb-4">Growth</h4>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <MetricCard value="15" label="Followers" color="bg-blue-200" />
                        <MetricCard value="2" label="Following" color="bg-green-200" />
                        <MetricCard value={totalPosts} label="Total content" color="bg-amber-200" trend="up" />
                    </div>
                </div>

                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="reach" stroke="#d97706" strokeWidth={3} fill="url(#colorReach)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Account Profile Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h4 className="text-base font-medium text-gray-700 mb-4">Profile</h4>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <MetricCard value={avgReachPerPost} label="Avg. reach per day" color="bg-green-200" trend="down" />
                    <MetricCard value={totalPosts} label="Total content" color="bg-amber-200" trend="up" />
                </div>

                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="reach" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Organic Summary Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h4 className="text-base font-medium text-gray-700 mb-4">Organic Summary</h4>
                <div className="grid grid-cols-5 gap-4 mb-6">
                    <MetricCard value={avgEngagement} label="Engagement" color="bg-blue-200" trend="up" />
                    <MetricCard value={totalInteractions} label="Interactions" color="bg-green-200" trend="up" />
                    <MetricCard value={avgReachPerPost} label="Avg. reach per post" color="bg-pink-200" trend="down" />
                    <MetricCard value={totalViews} label="Views" color="bg-purple-200" trend="down" />
                    <MetricCard value={totalPosts} label="Posts" color="bg-amber-200" trend="up" />
                </div>

                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="views" stroke="#a855f7" strokeWidth={2} />
                            <Line type="monotone" dataKey="engagement" stroke="#3b82f6" strokeWidth={2} />
                            <Line type="monotone" dataKey="interactions" stroke="#22c55e" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Organic Interactions Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h4 className="text-base font-medium text-gray-700 mb-4">Organic Interactions</h4>
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <MetricCard value={totalLikes} label="Likes" color="bg-green-200" trend="up" />
                    <MetricCard value={totalComments} label="Comments" color="bg-pink-200" />
                    <MetricCard value={totalSaved} label="Saved" color="bg-purple-200" />
                    <MetricCard value={totalPosts} label="Posts" color="bg-amber-200" trend="up" />
                </div>

                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="likes" stroke="#22c55e" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Detailed Metrics Grid */}
                <div className="grid grid-cols-5 gap-4 mt-6">
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{(totalLikes / posts.length || 0).toFixed(2)}</div>
                        <div className="text-sm text-gray-600 mt-1">Daily likes</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{(totalLikes / posts.length || 0).toFixed(1)}</div>
                        <div className="text-sm text-gray-600 mt-1">Likes per post</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{(totalComments / posts.length || 0).toFixed(2)}</div>
                        <div className="text-sm text-gray-600 mt-1">Daily comments</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{(totalComments / posts.length || 0).toFixed(1)}</div>
                        <div className="text-sm text-gray-600 mt-1">Comments per post</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{totalLikes > 0 && totalComments > 0 ? (totalLikes / totalComments).toFixed(0) : 0}</div>
                        <div className="text-sm text-gray-600 mt-1">Likes per comment</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
