import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface MetricCard {
    value: string | number;
    label: string;
    color: string;
    trend?: 'up' | 'down';
    percentage?: string;
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

    const MetricCard = ({ value, label, color, trend, percentage }: MetricCard) => (
        <div className={`${color} rounded-2xl p-5 shadow-modern hover-lift group relative overflow-hidden`}>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium opacity-70 uppercase tracking-wide">{label}</div>
                    {trend && (
                        <span className={`text-xs px-2 py-1 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {trend === 'up' ? '↑' : '↓'} {percentage || ''}
                        </span>
                    )}
                </div>
                <div className="text-3xl font-bold tracking-tight">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm border border-primary-200 rounded-xl p-4 shadow-modern-lg">
                    <p className="text-sm font-semibold text-primary-900 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-xs text-primary-700" style={{ color: entry.color }}>
                            {entry.name}: <span className="font-bold">{entry.value.toLocaleString()}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Community Growth Section */}
            <div className="modern-card p-6 lg:p-8 animate-slide-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <h3 className="text-xl font-bold text-primary-900">Community Growth</h3>
                    <div className="flex items-center gap-2 text-sm bg-gradient-to-r from-accent-blue to-accent-purple text-white px-4 py-2 rounded-full shadow-modern">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="font-semibold">himalnagarik</span>
                    </div>
                </div>

                {/* Growth Metrics */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-primary-600 mb-4 uppercase tracking-wide">Growth Metrics</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <MetricCard
                            value="15"
                            label="Followers"
                            color="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 text-primary-900"
                        />
                        <MetricCard
                            value="2"
                            label="Following"
                            color="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 text-primary-900"
                        />
                        <MetricCard
                            value={totalPosts}
                            label="Total Content"
                            color="bg-gradient-to-br from-primary-900 to-primary-800 text-white border-transparent"
                            trend="up"
                        />
                    </div>
                </div>

                {/* Chart */}
                <div className="h-72 mt-6 bg-primary-50/30 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                            <XAxis
                                dataKey="name"
                                stroke="#64748b"
                                style={{ fontSize: '12px', fontWeight: '500' }}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                style={{ fontSize: '12px', fontWeight: '500' }}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="reach"
                                stroke="#f59e0b"
                                strokeWidth={3}
                                fill="url(#colorReach)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Account Profile Section */}
            <div className="modern-card p-6 lg:p-8 animate-slide-up animate-delay-100">
                <h3 className="text-xl font-bold text-primary-900 mb-6">Profile Performance</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <MetricCard
                        value={avgReachPerPost}
                        label="Avg. Reach per Post"
                        color="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 text-primary-900"
                        trend="down"
                    />
                    <MetricCard
                        value={totalPosts}
                        label="Total Content"
                        color="bg-gradient-to-br from-primary-900 to-primary-800 text-white border-transparent"
                        trend="up"
                    />
                </div>

                <div className="h-72 bg-primary-50/30 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                            <XAxis
                                dataKey="name"
                                stroke="#64748b"
                                style={{ fontSize: '12px', fontWeight: '500' }}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                style={{ fontSize: '12px', fontWeight: '500' }}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="reach"
                                stroke="#10b981"
                                strokeWidth={3}
                                dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 7 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Organic Summary Section */}
            <div className="modern-card p-6 lg:p-8 animate-slide-up animate-delay-200">
                <h3 className="text-xl font-bold text-primary-900 mb-6">Organic Summary</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                    <MetricCard
                        value={avgEngagement}
                        label="Engagement"
                        color="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 text-primary-900"
                        trend="up"
                    />
                    <MetricCard
                        value={totalInteractions}
                        label="Interactions"
                        color="bg-gradient-to-br from-accent-blue/10 to-accent-blue/20 border border-accent-blue/30 text-primary-900"
                        trend="up"
                    />
                    <MetricCard
                        value={avgReachPerPost}
                        label="Avg. Reach"
                        color="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 text-primary-900"
                        trend="down"
                    />
                    <MetricCard
                        value={totalViews}
                        label="Views"
                        color="bg-gradient-to-br from-accent-purple/10 to-accent-purple/20 border border-accent-purple/30 text-primary-900"
                        trend="down"
                    />
                    <MetricCard
                        value={totalPosts}
                        label="Posts"
                        color="bg-gradient-to-br from-primary-900 to-primary-800 text-white border-transparent"
                        trend="up"
                    />
                </div>

                <div className="h-72 bg-primary-50/30 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                            <XAxis
                                dataKey="name"
                                stroke="#64748b"
                                style={{ fontSize: '12px', fontWeight: '500' }}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                style={{ fontSize: '12px', fontWeight: '500' }}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="engagement" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="interactions" stroke="#10b981" strokeWidth={2.5} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Organic Interactions Section */}
            <div className="modern-card p-6 lg:p-8 animate-slide-up animate-delay-300">
                <h3 className="text-xl font-bold text-primary-900 mb-6">Organic Interactions</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <MetricCard
                        value={totalLikes}
                        label="Likes"
                        color="bg-gradient-to-br from-accent-green/10 to-accent-green/20 border border-accent-green/30 text-primary-900"
                        trend="up"
                    />
                    <MetricCard
                        value={totalComments}
                        label="Comments"
                        color="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 text-primary-900"
                    />
                    <MetricCard
                        value={totalSaved}
                        label="Saved"
                        color="bg-gradient-to-br from-accent-orange/10 to-accent-orange/20 border border-accent-orange/30 text-primary-900"
                    />
                    <MetricCard
                        value={totalPosts}
                        label="Posts"
                        color="bg-gradient-to-br from-primary-900 to-primary-800 text-white border-transparent"
                        trend="up"
                    />
                </div>

                <div className="h-72 bg-primary-50/30 rounded-xl p-4 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                            <XAxis
                                dataKey="name"
                                stroke="#64748b"
                                style={{ fontSize: '12px', fontWeight: '500' }}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                style={{ fontSize: '12px', fontWeight: '500' }}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="likes"
                                stroke="#10b981"
                                strokeWidth={3}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Detailed Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-4 text-center border border-primary-100 hover-lift">
                        <div className="text-2xl font-bold text-primary-900">{(totalLikes / posts.length || 0).toFixed(2)}</div>
                        <div className="text-xs text-primary-600 mt-1.5 uppercase tracking-wide">Daily Likes</div>
                    </div>
                    <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-4 text-center border border-primary-100 hover-lift">
                        <div className="text-2xl font-bold text-primary-900">{(totalLikes / posts.length || 0).toFixed(1)}</div>
                        <div className="text-xs text-primary-600 mt-1.5 uppercase tracking-wide">Likes/Post</div>
                    </div>
                    <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-4 text-center border border-primary-100 hover-lift">
                        <div className="text-2xl font-bold text-primary-900">{(totalComments / posts.length || 0).toFixed(2)}</div>
                        <div className="text-xs text-primary-600 mt-1.5 uppercase tracking-wide">Daily Comments</div>
                    </div>
                    <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-4 text-center border border-primary-100 hover-lift">
                        <div className="text-2xl font-bold text-primary-900">{(totalComments / posts.length || 0).toFixed(1)}</div>
                        <div className="text-xs text-primary-600 mt-1.5 uppercase tracking-wide">Comments/Post</div>
                    </div>
                    <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-4 text-center border border-primary-100 hover-lift col-span-2 sm:col-span-1">
                        <div className="text-2xl font-bold text-primary-900">{totalLikes > 0 && totalComments > 0 ? (totalLikes / totalComments).toFixed(0) : 0}</div>
                        <div className="text-xs text-primary-600 mt-1.5 uppercase tracking-wide">Likes/Comment</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
