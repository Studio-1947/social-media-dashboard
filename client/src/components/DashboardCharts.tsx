import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
// type only imports or none if not needed

// Mock data removed in favor of props


export const DashboardCharts = ({ instagramData }: { instagramData: any }) => {
    // Transform real Metricool posts data into chart format
    const posts = instagramData?.data || [];

    // Create engagement chart from posts
    const chartData = posts.map((post: any, index: number) => ({
        name: `Post ${index + 1}`,
        engagement: post.engagement || 0,
        reach: post.reach || 0,
        impressions: post.impressionsTotal || 0,
        interactions: post.interactions || 0
    }));

    // Calculate totals for display
    const totalReach = posts.reduce((sum: number, p: any) => sum + (p.reach || 0), 0);
    const totalEngagement = posts.reduce((sum: number, p: any) => sum + (p.interactions || 0), 0);
    const avgEngagementRate = posts.length > 0
        ? (posts.reduce((sum: number, p: any) => sum + (p.engagement || 0), 0) / posts.length).toFixed(2)
        : 0;


    return (
        <div className="space-y-6">
            {/* Main Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Post Performance</h3>
                    <div className="text-sm text-gray-500">Last {posts.length} posts</div>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="name"
                                stroke="#9ca3af"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                style={{ fontSize: '12px' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="engagement"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#colorEngagement)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                    <div>
                        <div className="text-sm text-gray-500">Total Reach</div>
                        <div className="text-2xl font-bold text-gray-900">{totalReach.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">Total Interactions</div>
                        <div className="text-2xl font-bold text-gray-900">{totalEngagement.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">Avg Engagement Rate</div>
                        <div className="text-2xl font-bold text-gray-900">{avgEngagementRate}%</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
