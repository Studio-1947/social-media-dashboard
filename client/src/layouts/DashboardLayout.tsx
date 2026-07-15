import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';

interface DashboardLayoutProps {
    children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    // Lifted from Sidebar so main's margin-left can track the sidebar's actual
    // width — the sidebar is now `fixed` at every breakpoint (not just mobile),
    // taken fully out of document flow, so nothing else naturally reserves
    // space for it the way a flex sibling would have.
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="min-h-dvh bg-gradient-to-br from-primary-50 via-white to-primary-50">
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

            {/* Sidebar — fixed to the viewport on every breakpoint. On mobile this
                slides in as a drawer (translate-x); on desktop it's always
                visible, pinned in place regardless of how tall or short the
                main content is or how far the page scrolls. */}
            <div className={`
                fixed top-0 left-0 h-dvh z-40
                transform transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Closes the mobile drawer once a client/network is picked — on
                    desktop this is a no-op since the drawer is never "open". */}
                <Sidebar
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed((v) => !v)}
                    onNavigate={() => setIsMobileMenuOpen(false)}
                />
            </div>

            {/* Main Content Area — margin-left reserves exactly the fixed
                sidebar's current width on desktop (w-20 collapsed / w-72
                expanded, matching Sidebar.tsx). On mobile the sidebar is an
                overlay drawer, not a permanent column, so no margin is needed. */}
            <main
                className={`overflow-x-hidden transition-[margin] duration-300 ease-in-out ${
                    isCollapsed ? 'lg:ml-20' : 'lg:ml-72'
                }`}
            >
                <div className="p-4 sm:p-6 lg:p-10 min-h-dvh pt-20 lg:pt-6">
                    {children}
                </div>
            </main>
        </div>
    );
};
