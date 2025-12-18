import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';

interface DashboardLayoutProps {
    children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-gradient-to-br from-primary-900 to-primary-800 text-white rounded-xl shadow-modern-lg flex items-center justify-center hover:scale-105 transition-all duration-200"
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Backdrop Overlay for Mobile */}
            {isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
                />
            )}

            {/* Sidebar - Responsive */}
            <div className={`
                fixed lg:sticky lg:top-0 lg:h-screen left-0 z-40
                transform transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-x-hidden w-full">
                <div className="p-4 sm:p-6 lg:p-10 min-h-screen pt-20 lg:pt-6">
                    {children}
                </div>
            </main>
        </div>
    );
};
