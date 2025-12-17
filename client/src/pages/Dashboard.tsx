import { useState, useEffect } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { fetchInstagramData } from '../services/api';
import { DateRangePicker } from '../components/DateRangePicker';
import { MetricoolDashboard } from '../components/MetricoolDashboard';
import { PostsTable } from '../components/PostsTable';

export const Dashboard = () => {
    const [instagramData, setInstagramData] = useState<any>(null);

    useEffect(() => {
        const userId = '4145269';
        const blogId = '5604084';
        const from = '2025-11-17T00%3A00%3A00';
        const to = '2025-12-16T23%3A59%3A59';

        fetchInstagramData(userId, blogId, from, to)
            .then(res => {
                console.log('Instagram Data:', res);
                setInstagramData(res);
            })
            .catch(err => console.error('Instagram API Error:', err));
    }, []);

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto animate-fade-in">
                {/* Header with date picker */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 tracking-tight">Social Media Analytics</h1>
                    <DateRangePicker />
                </div>

                {/* Info Banner */}
                <div className="bg-gradient-to-r from-accent-blue/10 via-accent-purple/10 to-accent-blue/10 border border-accent-blue/20 rounded-xl lg:rounded-2xl p-4 lg:p-5 mb-6 lg:mb-8 flex items-start gap-3 lg:gap-4 shadow-modern animate-slide-up">
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
                            <span className="text-accent-blue text-lg lg:text-xl">ℹ️</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-primary-900 mb-1">Followers Metric Information</h4>
                        <p className="text-xs sm:text-sm text-primary-700 leading-relaxed">
                            Followers metric will only be available from the day the account was connected.
                            We'll be monitoring your account from this day so that you have all the evolution graphs from that moment.
                            The rest of metrics are available.
                        </p>
                    </div>
                </div>

                {instagramData?.data && instagramData.data.length > 0 ? (
                    <>
                        {/* Overview Section - Main Dashboard */}
                        <div id="overview" className="scroll-mt-6">
                            <MetricoolDashboard instagramData={instagramData} />
                        </div>

                        {/* Posts Section */}
                        <div id="posts" className="mt-12 scroll-mt-6">
                            <h2 className="text-2xl font-bold text-primary-900 mb-6">Recent Posts</h2>
                            <PostsTable posts={instagramData.data} />
                        </div>
                    </>
                ) : (
                    <div className="modern-card p-16 text-center animate-scale-in">
                        <div className="inline-block p-4 rounded-full bg-primary-100 mb-4">
                            <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <div className="text-primary-600 text-lg font-semibold">Loading Instagram data...</div>
                        <div className="text-primary-500 text-sm mt-2">Please wait while we fetch your analytics</div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
