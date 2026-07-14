import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Marks a section whose numbers are hand-written sample data, not this client's
 * real figures.
 *
 * Every sample-data substitution in Social Flow MUST be paired with one of
 * these. A silent fallback is how a stale credential once went unnoticed for two
 * weeks, and it is how a client ends up reading a mock follower count as their
 * own. If you are about to render mock numbers without a badge, don't.
 */
export const SampleDataBadge = ({ className }: { className?: string }) => (
    <span
        className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            'bg-accent-orange/15 text-accent-orange border border-accent-orange/30',
            className
        )}
        title="Metricool returned no data for this metric and date range. The figures shown are illustrative sample data, not this client's real numbers."
    >
        <AlertTriangle size={12} />
        Sample data
    </span>
);
