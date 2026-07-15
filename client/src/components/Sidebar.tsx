import { useState } from 'react';
import { LogOut, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSelection } from '../contexts/SelectionContext';
import { socialFlowBrand } from '../config/brand';
import { NETWORK_ICON } from '../lib/networkIcons';
import { cn } from '../lib/utils';

/**
 * The product shell AND the primary navigation: which client, then which
 * network. It used to be pure decoration (logo + an empty <nav>) while the real
 * navigation lived buried in the main content area — confusing, since a dark
 * full-height panel with a collapse toggle reads as "this is where you
 * navigate" and then did nothing. Now it actually is that.
 *
 * Sub-tabs (Overview/Audience/Posts/Insights/Competitors) stay in the content
 * area — those are "what to look at", scoped to one network, not "where am I".
 */
export const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();
    const {
        brands,
        loading,
        error,
        reload,
        selectedBrand,
        selectBrand,
        availableNetworks,
        activeNetwork,
        selectNetwork,
    } = useSelection();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const pickBrand = (blogId: number) => {
        selectBrand(blogId);
        onNavigate?.();
    };

    const pickNetwork = (network: Parameters<typeof selectNetwork>[0]) => {
        selectNetwork(network);
        onNavigate?.();
    };

    return (
        <aside
            className={cn(
                'bg-gradient-to-b from-primary-950 to-primary-900 text-white flex flex-col flex-shrink-0 h-screen sticky top-0 shadow-modern-xl transition-[width] duration-300 ease-in-out relative overflow-hidden',
                isCollapsed ? 'w-20' : 'w-72'
            )}
        >
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white text-primary-900 rounded-full items-center justify-center shadow-modern hover:scale-110 transition-transform z-50"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Product identity */}
            <div className="p-6 pb-4 border-b border-white/10 overflow-hidden flex-shrink-0">
                <div
                    className={cn(
                        'transition-all duration-300 ease-in-out',
                        isCollapsed
                            ? 'opacity-0 translate-x-[-20px] absolute pointer-events-none'
                            : 'opacity-100 translate-x-0 relative'
                    )}
                >
                    <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                        {socialFlowBrand.logo.text}
                    </h1>
                    <p className="text-xs text-primary-300 font-medium mt-0.5">
                        {socialFlowBrand.logo.subtitle}
                    </p>
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

            {/* Clients — the actual per-client switcher, now living where "navigation" should be */}
            <div className="flex-1 min-h-0 flex flex-col">
                <div
                    className={cn(
                        'px-4 pt-4 pb-1.5 flex-shrink-0',
                        isCollapsed && 'flex justify-center px-0'
                    )}
                >
                    {!isCollapsed && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary-400">
                            Clients
                        </span>
                    )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-3 space-y-1">
                    {loading &&
                        Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-11 rounded-xl bg-white/5 animate-pulse"
                                style={{ animationDelay: `${i * 100}ms` }}
                            />
                        ))}

                    {error && (
                        <div className="px-2 py-3 text-center">
                            {!isCollapsed && (
                                <div className="flex items-center gap-1.5 text-xs text-accent-orange mb-2 justify-center">
                                    <AlertTriangle size={13} />
                                    <span>Couldn't load clients</span>
                                </div>
                            )}
                            <button
                                onClick={reload}
                                className="text-xs font-semibold text-primary-300 hover:text-white underline"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {brands?.map((brand) => {
                        const isActive = brand.blogId === selectedBrand?.blogId;
                        return (
                            <button
                                key={brand.blogId}
                                onClick={() => pickBrand(brand.blogId)}
                                title={brand.name}
                                className={cn(
                                    'w-full flex items-center gap-3 rounded-xl transition-all duration-200 text-left',
                                    isCollapsed ? 'justify-center p-2' : 'px-3 py-2.5',
                                    isActive ? 'bg-white/10' : 'hover:bg-white/5'
                                )}
                            >
                                {brand.picture ? (
                                    <img
                                        src={brand.picture}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        className={cn(
                                            'rounded-full object-cover bg-white/10 flex-shrink-0 ring-2',
                                            isActive ? 'ring-accent-blue' : 'ring-transparent',
                                            isCollapsed ? 'w-9 h-9' : 'w-8 h-8'
                                        )}
                                    />
                                ) : (
                                    <div
                                        className={cn(
                                            'rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-xs font-bold flex-shrink-0 ring-2',
                                            isActive ? 'ring-accent-blue' : 'ring-transparent',
                                            isCollapsed ? 'w-9 h-9' : 'w-8 h-8'
                                        )}
                                    >
                                        {brand.name.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                {!isCollapsed && (
                                    <span
                                        className={cn(
                                            'text-sm font-medium truncate',
                                            isActive ? 'text-white' : 'text-primary-300'
                                        )}
                                    >
                                        {brand.name}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Platforms — icon nav for the SELECTED client's networks. This is
                    what used to be a row of plain-text buttons at the top of the main
                    content area; it's here now because "which platform" is a
                    navigation decision, same category as "which client". */}
                {selectedBrand && availableNetworks.length > 0 && (
                    <div className="flex-shrink-0 px-3 pt-3 pb-2 border-t border-white/10 mt-2">
                        {!isCollapsed && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-400 px-1">
                                Platforms
                            </span>
                        )}
                        <div className={cn('mt-1.5 space-y-1', isCollapsed && 'flex flex-col items-center')}>
                            {availableNetworks.map((network) => {
                                const isActive = network === activeNetwork;
                                const { label, color } = socialFlowBrand.networks[network];
                                const Icon = NETWORK_ICON[network];
                                return (
                                    <button
                                        key={network}
                                        onClick={() => pickNetwork(network)}
                                        title={label}
                                        className={cn(
                                            'flex items-center gap-2.5 rounded-xl font-semibold transition-all duration-200',
                                            isCollapsed ? 'w-11 h-11 justify-center' : 'w-full px-3 py-2 text-sm'
                                        )}
                                        style={
                                            isActive
                                                ? { backgroundColor: color, color: '#fff' }
                                                : { color: 'rgb(203 213 225)' }
                                        }
                                    >
                                        <Icon size={16} className="flex-shrink-0" />
                                        {!isCollapsed && <span className="truncate">{label}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Agency identity + logout */}
            <div className="p-4 border-t border-white/10 overflow-hidden flex-shrink-0">
                <div
                    className={cn(
                        'transition-all duration-300 ease-in-out flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 group relative',
                        isCollapsed
                            ? 'opacity-0 translate-x-[-20px] pointer-events-none absolute'
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
                        'transition-all duration-300 ease-in-out flex flex-col items-center gap-3',
                        isCollapsed ? 'opacity-100 scale-100 relative' : 'opacity-0 scale-50 pointer-events-none absolute'
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
