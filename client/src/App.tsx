import { useState, useEffect } from 'react';
import { DashboardLayout } from './layouts/DashboardLayout';
import { fetchInstagramData } from './services/api';
import { DateRangePicker } from './components/DateRangePicker';
import { MetricoolDashboard } from './components/MetricoolDashboard';
import { PostsTable } from './components/PostsTable';

function App() {
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
      <div className="max-w-7xl mx-auto">
        {/* Header with tabs and date picker */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <button className="text-sm font-medium text-gray-900 pb-2 border-b-2 border-blue-600">
              COMMUNITY
            </button>
            <button className="text-sm font-medium text-gray-500 pb-2 hover:text-gray-900">
              ACCOUNT
            </button>
            <button className="text-sm font-medium text-gray-500 pb-2 hover:text-gray-900">
              POSTS
            </button>
          </div>
          <DateRangePicker />
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <span className="text-blue-600 text-xl">ℹ️</span>
          <p className="text-sm text-blue-900">
            Followers metric will only be available from the day the account was connected.
            We'll be monitoring your account from this day so that you have all the evolution graphs from that moment.
            The rest of metrics are available.
          </p>
        </div>

        {instagramData?.data && instagramData.data.length > 0 ? (
          <>
            {/* Main Dashboard Sections */}
            <MetricoolDashboard instagramData={instagramData} />

            {/* Posts Table */}
            <div className="mt-8">
              <PostsTable posts={instagramData.data} />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="text-gray-400 text-lg">Loading Instagram data...</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default App;
