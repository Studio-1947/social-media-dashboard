import { useState } from 'react';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { socialFlowBrand } from '../config/brand';
import { cn } from '../lib/utils';

/**
 * The product shell — Social Flow's own identity and the signed-in agency user.
 *
 * Deliberately carries NO client identity: which client you're looking at is the
 * switcher's job, and it changes per selection. Hardcoding a client's name or
 * handle here (as an earlier build did) makes every other client's dashboard
 * quietly mislabelled.
 */
export const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <aside
            className={cn(
                'bg-gradient-to-b from-primary-950 to-primary-900 text-white flex flex-col flex-shrink-0 h-screen sticky top-0 shadow-modern-xl transition-[width] duration-300 ease-in-out relative overflow-hidden',
                isCollapsed ? 'w-20' : 'w-64'
            )}
        >
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white text-primary-900 rounded-full items-center justify-center shadow-modern hover:scale-110 transition-transform z-50"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className="p-6 border-b border-white/10 overflow-hidden">
                <div
                    className={cn(
                        'transition-all duration-300 ease-in-out',
                        isCollapsed
                            ? 'opacity-0 translate-x-[-20px] absolute pointer-events-none'
                            : 'opacity-100 translate-x-0 relative'
                    )}
                >
                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                            {socialFlowBrand.logo.text}
                        </h1>
                        <p className="text-xs text-primary-300 font-medium">
                            {socialFlowBrand.logo.subtitle}
                        </p>
                        <p className="text-[10px] text-primary-400 mt-2 leading-relaxed italic">
                            {socialFlowBrand.tagline}
                        </p>
                    </div>
                </div>

                <div
                    className={cn(
                        'transition-all duration-300 ease-in-out flex justify-center',
                        isCollapsed
                            ? 'opacity-100 scale-100 relative'
                            : 'opacity-0 scale-50 absolute pointer-events-none'
                    )}
                >
                    <div className="w-10 h-10 bg-gradient-to-br from-accent-blue to-accent-purple rounded-xl flex items-center justify-center text-sm font-bold">
                        SF
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4" />

            <div className="p-4 border-t border-white/10 overflow-hidden">
                <div
                    className={cn(
                        'transition-all duration-300 ease-in-out flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 group relative',
                        isCollapsed
                            ? 'opacity-0 translate-x-[-20px] pointer-events-none'
                            : 'opacity-100 translate-x-0'
                    )}
                >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-xs font-bold shadow-modern ring-2 ring-white/20 flex-shrink-0">
                        S47
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                            {socialFlowBrand.poweredBy}
                        </div>
                        <div className="text-xs text-primary-400">Agency account</div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-primary-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                        title="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>

                <div
                    className={cn(
                        'transition-all duration-300 ease-in-out flex flex-col items-center gap-3 absolute inset-x-0 bottom-4',
                        isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'
                    )}
                >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-xs font-bold shadow-modern ring-2 ring-white/20">
                        S47
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-primary-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                        title="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
};
