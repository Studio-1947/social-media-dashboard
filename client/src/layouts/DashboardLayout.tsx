import React from 'react';
import { Sidebar } from '../components/Sidebar';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    return (
        <div className="flex min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
            {/* Sidebar - Fixed width */}
            <Sidebar />

            {/* Main Content Area - Takes remaining space */}
            <main className="flex-1 overflow-x-hidden">
                <div className="p-6 lg:p-10 min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
};
