import { useState } from 'react';
import { Home, MessageSquare, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const navItems = [
    { id: 'overview', icon: Home, label: 'Overview', active: true },
    { id: 'posts', icon: MessageSquare, label: 'Posts', active: false },
];

export const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeSection, setActiveSection] = useState('overview');
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const scrollToSection = (sectionId: string) => {
        setActiveSection(sectionId);
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <aside className={cn(
            "bg-gradient-to-b from-primary-950 to-primary-900 text-white flex flex-col flex-shrink-0 h-screen sticky top-0 shadow-modern-xl transition-all duration-300 ease-in-out relative",
            isCollapsed ? "w-20" : "w-64"
        )}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white text-primary-900 rounded-full items-center justify-center shadow-modern hover:scale-110 transition-transform z-50"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Logo Area */}
            <div className="p-6 border-b border-white/10">
                {!isCollapsed ? (
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                            STUDIO 1947
                        </h1>
                        <p className="text-xs text-primary-300 font-medium">Analytics Dashboard</p>
                        <p className="text-[10px] text-primary-400 mt-2 leading-relaxed italic">
                            Local Wisdom for Global Impact
                        </p>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-accent-blue to-accent-purple rounded-xl flex items-center justify-center text-sm font-bold">
                            S47
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-1.5">
                    {navItems.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => scrollToSection(item.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden",
                                    activeSection === item.id
                                        ? "bg-white text-primary-900 shadow-modern"
                                        : "text-primary-300 hover:text-white hover:bg-white/10"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                {/* Hover gradient effect */}
                                {activeSection !== item.id && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/0 to-accent-purple/0 group-hover:from-accent-blue/10 group-hover:to-accent-purple/10 transition-all duration-300" />
                                )}

                                <item.icon size={18} className="relative z-10 flex-shrink-0" />
                                {!isCollapsed && (
                                    <>
                                        <span className="relative z-10">{item.label}</span>
                                        {activeSection === item.id && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue relative z-10" />
                                        )}
                                    </>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-white/10">
                {!isCollapsed ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 group">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-xs font-bold shadow-modern ring-2 ring-white/20 flex-shrink-0">
                            HN
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">Himal Nagarik</div>
                            <div className="text-xs text-primary-400">@himalnagarik</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-primary-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-xs font-bold shadow-modern ring-2 ring-white/20">
                            HN
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-primary-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};
