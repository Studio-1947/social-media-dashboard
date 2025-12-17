import { Home, BarChart3, Users, MessageSquare, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
    { icon: Home, label: 'Dashboard', active: true },
    { icon: BarChart3, label: 'Analytics', active: false },
    { icon: Users, label: 'Community', active: false },
    { icon: MessageSquare, label: 'Posts', active: false },
    { icon: Settings, label: 'Settings', active: false },
];

export const Sidebar = () => {
    return (
        <aside className="w-64 bg-gradient-to-b from-primary-950 to-primary-900 text-white flex flex-col flex-shrink-0 min-h-screen shadow-modern-xl">
            {/* Logo Area */}
            <div className="p-6 border-b border-white/10">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                        STUDIO 1947
                    </h1>
                    <p className="text-xs text-primary-300 font-medium">Analytics Dashboard</p>
                </div>
                <p className="text-[10px] text-primary-400 mt-3 leading-relaxed italic">
                    Local Wisdom for Global Impact
                </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-1.5">
                    {navItems.map((item) => (
                        <li key={item.label}>
                            <button
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden",
                                    item.active
                                        ? "bg-white text-primary-900 shadow-modern"
                                        : "text-primary-300 hover:text-white hover:bg-white/10"
                                )}
                            >
                                {/* Hover gradient effect */}
                                {!item.active && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/0 to-accent-purple/0 group-hover:from-accent-blue/10 group-hover:to-accent-purple/10 transition-all duration-300" />
                                )}

                                <item.icon size={18} className="relative z-10" />
                                <span className="relative z-10">{item.label}</span>

                                {item.active && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue relative z-10" />
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 group">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-xs font-bold shadow-modern ring-2 ring-white/20">
                        HN
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">Himal Nagarik</div>
                        <div className="text-xs text-primary-400">@himalnagarik</div>
                    </div>
                    <button className="text-primary-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
};
