import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { fetchBrands, type Brand, type Network } from '../services/metricoolApi';

/**
 * Which client and which network are selected — shared between the Sidebar
 * (which client, which network to view) and the main content area (which view
 * to render). They used to live entirely inside SocialDashboard with no way for
 * the Sidebar to see or drive them; this context is the single source of truth
 * so both can read AND change the selection.
 */

/** Networks Social Flow has actually built a view for.
 *
 * A network being connected in Metricool does NOT mean a tab appears — a view
 * has to exist for it too. This array is intersected with the selected client's
 * connected networks, so adding a tab means building its view first. No "Coming
 * Soon" placeholders.
 */
const IMPLEMENTED_NETWORKS: Network[] = ['facebook', 'instagram', 'youtube'];

const SELECTED_BLOG_ID_KEY = 'socialflow.selectedBlogId';

interface SelectionContextValue {
    brands: Brand[] | null;
    loading: boolean;
    error: string | null;
    reload: () => void;

    selectedBrand: Brand | null;
    selectBrand: (blogId: number) => void;

    /** This client's connected networks, intersected with what we've built a view for. */
    availableNetworks: Network[];
    activeNetwork: Network | null;
    selectNetwork: (network: Network) => void;
}

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
    const [brands, setBrands] = useState<Brand[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nonce, setNonce] = useState(0);

    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(() => {
        const stored = localStorage.getItem(SELECTED_BLOG_ID_KEY);
        return stored ? Number(stored) : null;
    });
    const [preferredNetwork, setPreferredNetwork] = useState<Network | null>(null);

    useEffect(() => {
        let cancelled = false;
        setError(null);

        fetchBrands()
            .then((list) => {
                if (!cancelled) setBrands(list);
            })
            .catch((err: any) => {
                if (!cancelled) {
                    setError(
                        err?.response?.data?.message || err?.message || 'Could not load the client list.'
                    );
                }
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
     * Derived SYNCHRONOUSLY from the brand list already in memory — never a
     * per-switch "connected networks" fetch. An earlier build did that and it
     * raced: on switching client, the previous tab stayed mounted against the
     * NEW blogId for one render before the async check resolved, firing real
     * requests against a network that client doesn't have (observed as genuine
     * 500s). Deriving from data already held makes the race impossible.
     */
    const availableNetworks = useMemo<Network[]>(() => {
        if (!selectedBrand) return [];
        return IMPLEMENTED_NETWORKS.filter((n) => selectedBrand.connectedNetworks.includes(n));
    }, [selectedBrand]);

    /** Likewise derived, never stored-then-corrected: falls to the first
     * available network in the same render if the preferred one doesn't apply
     * to whichever client is now selected. */
    const activeNetwork: Network | null =
        preferredNetwork && availableNetworks.includes(preferredNetwork)
            ? preferredNetwork
            : (availableNetworks[0] ?? null);

    const selectBrand = (blogId: number) => {
        setSelectedBlogId(blogId);
        localStorage.setItem(SELECTED_BLOG_ID_KEY, String(blogId));
    };

    const selectNetwork = (network: Network) => setPreferredNetwork(network);

    return (
        <SelectionContext.Provider
            value={{
                brands,
                loading: !brands && !error,
                error,
                reload: () => setNonce((n) => n + 1),
                selectedBrand,
                selectBrand,
                availableNetworks,
                activeNetwork,
                selectNetwork,
            }}
        >
            {children}
        </SelectionContext.Provider>
    );
};

export function useSelection(): SelectionContextValue {
    const ctx = useContext(SelectionContext);
    if (!ctx) throw new Error('useSelection must be used within a SelectionProvider');
    return ctx;
}
