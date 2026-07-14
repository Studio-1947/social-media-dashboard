import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DateRangePicker } from '../components/DateRangePicker';
import { SocialDashboard } from '../components/SocialDashboard';

/** Metricool wants `2025-11-17T00:00:00` — no timezone suffix. */
function formatApiDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}

function defaultRange() {
    const to = new Date();
    to.setHours(23, 59, 59, 0);

    const from = new Date();
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);

    return { from: formatApiDate(from), to: formatApiDate(to) };
}

export const Dashboard = () => {
    // Last 30 days, relative to today. The old build had a fixed 2025 window
    // hardcoded here, which quietly went stale.
    const [dateRange, setDateRange] = useState(defaultRange);

    const rangeLabel = () => {
        const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        const from = new Date(dateRange.from).toLocaleDateString('en-US', opts);
        const to = new Date(dateRange.to).toLocaleDateString('en-US', opts);
        return `${from} - ${to}`;
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 tracking-tight">
                        Social Media Analytics
                    </h1>
                    <DateRangePicker
                        onRangeChange={(from, to) => setDateRange({ from, to })}
                        currentRangeLabel={rangeLabel()}
                    />
                </div>

                {/* The client switcher, network tabs and every view hang off this. */}
                <SocialDashboard range={dateRange} />
            </div>
        </DashboardLayout>
    );
};
