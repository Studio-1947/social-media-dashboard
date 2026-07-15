import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { fetchInsights, type DateRange, type Network } from '../services/metricoolApi';
import { buildAdvice } from './InsightsView';
import { buildOverviewReportCSV, downloadCSV, type ReportStat } from '../lib/report';
import { useSelection } from '../contexts/SelectionContext';

const CONFIDENCE_LABEL: Record<string, string> = {
    high: 'Strong pattern',
    medium: 'Fairly clear',
    low: 'Early hint',
    insufficient: 'Not enough posts yet',
};

/**
 * "Download report" for the Overview tab — the artifact an agency actually
 * hands a client, instead of a screenshot. Bundles the same stat cards already
 * on screen plus (for Facebook/Instagram) the Insights recommendation.
 *
 * Insights are fetched on click, not eagerly on mount: every Overview tab
 * already fires 2-4 requests for trend pills, and this is the one section
 * someone may never click, so it shouldn't tax every page load. The 5-minute
 * server-side cache (config/metricool.ts) means this is a free hit if the
 * client already opened the Insights tab this session.
 */
export const ReportExportButton = ({
    network,
    range,
    blogId,
    stats,
    supportsInsights,
}: {
    network: Network;
    range: DateRange;
    blogId: number;
    stats: ReportStat[];
    supportsInsights: boolean;
}) => {
    const { selectedBrand } = useSelection();
    const [downloading, setDownloading] = useState(false);

    const handleClick = async () => {
        setDownloading(true);
        try {
            let insights = null;
            if (supportsInsights) {
                try {
                    const data = await fetchInsights(network, range, blogId);
                    insights = {
                        confidence: CONFIDENCE_LABEL[data.recommendation.confidence] ?? data.recommendation.confidence,
                        advice: buildAdvice(data),
                    };
                } catch {
                    // A failed insights fetch shouldn't block the rest of the report —
                    // it just ships without that section, same as a "not enough data" case.
                    insights = null;
                }
            }

            const csv = buildOverviewReportCSV({
                brandName: selectedBrand?.name ?? 'Client',
                network,
                range,
                stats,
                insights,
            });

            const datePart = new Date().toISOString().split('T')[0];
            downloadCSV(`${network}_report_${datePart}.csv`, csv);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 text-sm text-primary-700 hover:text-primary-900 hover:bg-primary-50 rounded-xl border border-primary-200 transition-all duration-200 font-medium active:scale-95 disabled:opacity-60"
        >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{downloading ? 'Preparing…' : 'Download report'}</span>
        </button>
    );
};
