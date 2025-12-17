import React from 'react';
import { Sidebar } from '../components/Sidebar';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar - Fixed width */}
            <Sidebar />

            {/* Main Content Area - Takes remaining space */}
            <main className="flex-1 overflow-x-hidden">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
