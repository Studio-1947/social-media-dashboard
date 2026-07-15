import { FacebookView } from './FacebookView';
import { InstagramView } from './InstagramView';
import { YouTubeView } from './YouTubeView';
import { ErrorPanel, LoadingPanel } from './AnalyticsPanels';
import { useSelection } from '../contexts/SelectionContext';
import { socialFlowBrand } from '../config/brand';
import { NETWORK_ICON } from '../lib/networkIcons';
import type { DateRange } from '../services/metricoolApi';

/**
 * The content area: "which network am I looking at" (a colored header, driven
 * by the Sidebar's selection) followed by that network's view. Client and
 * network SWITCHING now happens in the Sidebar — this component only reads the
 * current selection and renders it.
 */
export const SocialDashboard = ({ range }: { range: DateRange }) => {
    const { brands, loading, error, reload, selectedBrand, activeNetwork } = useSelection();

    if (error) return <ErrorPanel message={error} onRetry={reload} />;
    if (loading) return <LoadingPanel label="Loading clients…" />;

    if (!brands || brands.length === 0) {
        return (
            <ErrorPanel
                message="This Metricool account has no brands. Add a client in Metricool, then reload."
                onRetry={reload}
            />
        );
    }

    if (!selectedBrand) return null;

    if (!activeNetwork) {
        return (
            <div className="modern-card p-12 text-center">
                <div className="text-primary-900 font-semibold mb-1">
                    Nothing to show for {selectedBrand.name}
                </div>
                <p className="text-sm text-primary-600">
                    This client has no Facebook, Instagram or YouTube profile connected in
                    Metricool.
                </p>
            </div>
        );
    }

    const { label, color } = socialFlowBrand.networks[activeNetwork];
    const Icon = NETWORK_ICON[activeNetwork];

    return (
        <div className="space-y-6">
            {/* The network's color bleeds in here so it's unmistakable which
                platform's data is on screen — this updates the instant the
                Sidebar's platform selection changes. */}
            <div
                key={activeNetwork}
                className="rounded-2xl p-4 sm:p-5 flex items-center gap-4 border animate-fade-in"
                style={{
                    background: `linear-gradient(135deg, ${color}16, ${color}05)`,
                    borderColor: `${color}30`,
                }}
            >
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-modern"
                    style={{ backgroundColor: color }}
                >
                    <Icon size={20} />
                </div>
                <div className="min-w-0">
                    <div
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color }}
                    >
                        {label}
                    </div>
                    <div className="text-lg font-bold text-primary-900 truncate">
                        {selectedBrand.name}
                    </div>
                </div>
            </div>

            {/* Views are keyed by client + network so switching clients remounts
                rather than reusing state fetched for a different blogId. */}
            {activeNetwork === 'facebook' && (
                <FacebookView key={`fb-${selectedBrand.blogId}`} range={range} blogId={selectedBrand.blogId} />
            )}
            {activeNetwork === 'instagram' && (
                <InstagramView key={`ig-${selectedBrand.blogId}`} range={range} blogId={selectedBrand.blogId} />
            )}
            {activeNetwork === 'youtube' && (
                <YouTubeView key={`yt-${selectedBrand.blogId}`} range={range} blogId={selectedBrand.blogId} />
            )}
        </div>
    );
};
