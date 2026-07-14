import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { fetchBrands, type Brand, type DateRange, type Network } from '../services/metricoolApi';
import { FacebookView } from './FacebookView';
import { InstagramView } from './InstagramView';
import { YouTubeView } from './YouTubeView';
import { ErrorPanel, LoadingPanel } from './AnalyticsPanels';
import { socialFlowBrand } from '../config/brand';
import { cn } from '../lib/utils';

/**
 * Networks Social Flow has actually built a view for.
 *
 * A network being connected in Metricool does NOT mean a tab appears — a view
 * has to exist for it too. This array is intersected with the selected client's
 * connected networks, so adding a tab means building its view first. No "Coming
 * Soon" placeholders.
 */
const IMPLEMENTED_NETWORKS: Network[] = ['facebook', 'instagram', 'youtube'];

const SELECTED_BLOG_ID_KEY = 'socialflow.selectedBlogId';

export const SocialDashboard = ({ range }: { range: DateRange }) => {
    const [brands, setBrands] = useState<Brand[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nonce, setNonce] = useState(0);

    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(() => {
        const stored = localStorage.getItem(SELECTED_BLOG_ID_KEY);
        return stored ? Number(stored) : null;
    });
    const [preferredNetwork, setPreferredNetwork] = useState<Network | null>(null);
    const [switcherOpen, setSwitcherOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setError(null);

        fetchBrands()
            .then((list) => {
                if (cancelled) return;
                setBrands(list);
            })
            .catch((err: any) => {
                if (cancelled) return;
                setError(
                    err?.response?.data?.message || err?.message || 'Could not load the client list.'
                );
            });

        return () => {
            cancelled = true;
        };
    }, [nonce]);

    /**
     * The selected client. Falls back to the first brand when nothing is stored
     * OR when the stored blogId no longer exists on the account (a client can be
     * removed in Metricool between sessions).
     */
    const selectedBrand = useMemo<Brand | null>(() => {
        if (!brands?.length) return null;
        return brands.find((b) => b.blogId === selectedBlogId) ?? brands[0];
    }, [brands, selectedBlogId]);

    /**
     * Tab visibility, derived SYNCHRONOUSLY from the brand list already in memory.
     *
     * Do not replace this with a per-switch "connected networks" fetch. An earlier
     * build did exactly that and it raced: on switching client, the previously
     * selected tab stayed mounted against the NEW blogId for one render before the
     * async check resolved, firing real requests for a network that client doesn't
     * have — observed as genuine 500s. Deriving from data we already hold makes
     * the race impossible.
     */
    const availableNetworks = useMemo<Network[]>(() => {
        if (!selectedBrand) return [];
        return IMPLEMENTED_NETWORKS.filter((n) => selectedBrand.connectedNetworks.includes(n));
    }, [selectedBrand]);

    /**
     * Likewise derived, never stored-then-corrected. If the preferred tab isn't
     * available for this client, we fall to the first one that is — in the same
     * render, so no view ever mounts against a client that lacks its network.
     */
    const activeNetwork: Network | null =
        preferredNetwork && availableNetworks.includes(preferredNetwork)
            ? preferredNetwork
            : (availableNetworks[0] ?? null);

    const selectBrand = (blogId: number) => {
        setSelectedBlogId(blogId);
        localStorage.setItem(SELECTED_BLOG_ID_KEY, String(blogId));
        setSwitcherOpen(false);
    };

    if (error) return <ErrorPanel message={error} onRetry={() => setNonce((n) => n + 1)} />;
    if (!brands) return <LoadingPanel label="Loading clients…" />;

    if (brands.length === 0) {
        return (
            <ErrorPanel
                message="This Metricool account has no brands. Add a client in Metricool, then reload."
                onRetry={() => setNonce((n) => n + 1)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Client switcher */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative">
                    <button
                        onClick={() => setSwitcherOpen((o) => !o)}
                        className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-primary-200 shadow-modern hover:shadow-modern-lg hover:border-primary-300 transition-all duration-200 active:scale-95"
                    >
                        {selectedBrand?.picture ? (
                            <img
                                src={selectedBrand.picture}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover bg-primary-100"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-xs font-bold">
                                {selectedBrand?.name.slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div className="text-left">
                            <div className="text-sm font-bold text-primary-900 leading-tight">
                                {selectedBrand?.name}
                            </div>
                            <div className="text-xs text-primary-500">
                                {brands.length} client{brands.length === 1 ? '' : 's'}
                            </div>
                        </div>
                        <ChevronDown
                            size={16}
                            className={cn(
                                'text-primary-400 transition-transform duration-200',
                                switcherOpen && 'rotate-180'
                            )}
                        />
                    </button>

                    {switcherOpen && (
                        <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-modern-xl border border-primary-100 p-2 z-50 animate-slide-down max-h-96 overflow-y-auto">
                            {brands.map((brand) => (
                                <button
                                    key={brand.blogId}
                                    onClick={() => selectBrand(brand.blogId)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-left',
                                        brand.blogId === selectedBrand?.blogId
                                            ? 'bg-primary-50'
                                            : 'hover:bg-primary-50'
                                    )}
                                >
                                    {brand.picture ? (
                                        <img
                                            src={brand.picture}
                                            alt=""
                                            className="w-8 h-8 rounded-full object-cover bg-primary-100 flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {brand.name.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-primary-900 truncate">
                                            {brand.name}
                                        </div>
                                        <div className="text-xs text-primary-500 truncate">
                                            {IMPLEMENTED_NETWORKS.filter((n) =>
                                                brand.connectedNetworks.includes(n)
                                            )
                                                .map((n) => socialFlowBrand.networks[n].label)
                                                .join(' · ') || 'No supported networks'}
                                        </div>
                                    </div>
                                    {brand.blogId === selectedBrand?.blogId && (
                                        <Check size={16} className="text-primary-900 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Network tabs — only networks this client has AND we have a view for. */}
                <div className="flex flex-wrap items-center gap-2">
                    {availableNetworks.map((network) => {
                        const isActive = network === activeNetwork;
                        const { label, color } = socialFlowBrand.networks[network];
                        return (
                            <button
                                key={network}
                                onClick={() => setPreferredNetwork(network)}
                                className={cn(
                                    'px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95',
                                    isActive
                                        ? 'text-white shadow-modern'
                                        : 'bg-white text-primary-600 border border-primary-200 hover:text-primary-900 hover:border-primary-300'
                                )}
                                style={isActive ? { backgroundColor: color } : undefined}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Views are keyed by client + network so switching clients remounts
                rather than reusing state fetched for a different blogId. */}
            {selectedBrand && activeNetwork === 'facebook' && (
                <FacebookView
                    key={`fb-${selectedBrand.blogId}`}
                    range={range}
                    blogId={selectedBrand.blogId}
                />
            )}
            {selectedBrand && activeNetwork === 'instagram' && (
                <InstagramView
                    key={`ig-${selectedBrand.blogId}`}
                    range={range}
                    blogId={selectedBrand.blogId}
                />
            )}
            {selectedBrand && activeNetwork === 'youtube' && (
                <YouTubeView
                    key={`yt-${selectedBrand.blogId}`}
                    range={range}
                    blogId={selectedBrand.blogId}
                />
            )}

            {selectedBrand && activeNetwork === null && (
                <div className="modern-card p-12 text-center">
                    <div className="text-primary-900 font-semibold mb-1">
                        Nothing to show for {selectedBrand.name}
                    </div>
                    <p className="text-sm text-primary-600">
                        This client has no Facebook, Instagram or YouTube profile connected in
                        Metricool.
                    </p>
                </div>
            )}
        </div>
    );
};
