import React from 'react';
import { Sidebar } from '../components/Sidebar';

interface LayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout = ({ children }: LayoutProps) => {
    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <Sidebar />
            <div className="pl-64 transition-all duration-300">
                <main className="p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};
