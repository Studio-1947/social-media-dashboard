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
        <aside className="w-64 bg-black text-white flex flex-col flex-shrink-0 min-h-screen">
            {/* Logo Area */}
            <div className="p-6 border-b border-gray-800">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-bold tracking-tight">STUDIO 1947</h1>
                    <p className="text-xs text-gray-400">Analytics Dashboard</p>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                    Local Wisdom for Global Impact
                </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-1">
                    {navItems.map((item) => (
                        <li key={item.label}>
                            <button
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    item.active
                                        ? "bg-white text-black"
                                        : "text-gray-400 hover:text-white hover:bg-gray-900"
                                )}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                        HN
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">Himal Nagarik</div>
                        <div className="text-xs text-gray-400">@himalnagarik</div>
                    </div>
                    <button className="text-gray-400 hover:text-white transition-colors">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
};
