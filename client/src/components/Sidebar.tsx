import { LayoutDashboard, MessageSquare, Calendar, Link, Megaphone, Settings, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
    { icon: LayoutDashboard, label: 'Analytics', active: true },
    { icon: MessageSquare, label: 'Inbox' },
    { icon: Calendar, label: 'Planning' },
    { icon: Link, label: 'SmartLinks' },
    { icon: Megaphone, label: 'Ads' },
];

export const Sidebar = () => {
    return (
        <div className="w-64 bg-[#1e1e2d] text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-50 transition-all duration-300">
            <div className="p-4 flex items-center gap-2 border-b border-gray-700">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-xl">M</div>
                <span className="font-bold text-lg tracking-tight">Metricool Clone</span>
            </div>

            <div className="p-4">
                <button className="w-full bg-[#2a2a3c] hover:bg-[#323248] transition-colors p-3 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500"></div>
                        <div className="text-left">
                            <div className="text-sm font-medium">My Brand</div>
                            <div className="text-xs text-gray-400">Personal Brand</div>
                        </div>
                    </div>
                    <ChevronDown size={16} className="text-gray-400 group-hover:text-white" />
                </button>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                            item.active
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "text-gray-400 hover:bg-[#2a2a3c] hover:text-white"
                        )}
                    >
                        <item.icon size={20} />
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-700">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-[#2a2a3c] rounded-lg transition-colors">
                    <Settings size={20} />
                    <span className="text-sm font-medium">Settings</span>
                </button>
            </div>
        </div>
    );
};
