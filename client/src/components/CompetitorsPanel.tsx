import { useEffect, useState } from 'react';
import { fetchCompetitors, type DateRange, type Network } from '../services/metricoolApi';
import { asSeriesArray } from '../lib/series';
import { Panel, LoadingPanel } from './AnalyticsPanels';

/**
 * Rendered only when useHasCompetitors() already confirmed this client has
 * competitor profiles configured in Metricool — so an empty list here is a
 * genuine surprise, not the normal case.
 */
export const CompetitorsPanel = ({
    network,
    range,
    blogId,
}: {
    network: Network;
    range: DateRange;
    blogId: number;
}) => {
    const [rows, setRows] = useState<any[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchCompetitors(network, range, blogId)
            .then((res) => {
                if (!cancelled) setRows(asSeriesArray(res.data) as any[]);
            })
            .catch(() => {
                if (!cancelled) setRows([]);
            });
        return () => {
            cancelled = true;
        };
    }, [network, range.from, range.to, blogId]);

    if (rows === null) return <LoadingPanel label="Loading competitors…" />;

    return (
        <Panel title="Competitors" subtitle="Profiles tracked for this client in Metricool">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-primary-200">
                        <tr className="text-left text-xs text-primary-600 uppercase tracking-wide">
                            <th className="pb-4 font-semibold">Profile</th>
                            <th className="pb-4 font-semibold text-right">Followers</th>
                            <th className="pb-4 font-semibold text-right">Posts</th>
                            <th className="pb-4 font-semibold text-right">Interactions</th>
                            <th className="pb-4 font-semibold text-right">Engagement</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr
                                key={row.id ?? row.name ?? i}
                                className="border-b border-primary-100 hover:bg-primary-50/50 transition-colors"
                            >
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        {row.picture && (
                                            <img
                                                src={row.picture}
                                                alt=""
                                                className="w-9 h-9 rounded-full object-cover bg-primary-100"
                                            />
                                        )}
                                        <span className="text-sm font-medium text-primary-900">
                                            {row.name ?? row.label ?? row.username ?? 'Unknown'}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-4 text-sm text-right font-semibold text-primary-900">
                                    {Number(row.followers ?? 0).toLocaleString()}
                                </td>
                                <td className="py-4 text-sm text-right font-semibold text-primary-900">
                                    {Number(row.posts ?? row.postsCount ?? 0).toLocaleString()}
                                </td>
                                <td className="py-4 text-sm text-right font-semibold text-primary-900">
                                    {Number(row.interactions ?? 0).toLocaleString()}
                                </td>
                                <td className="py-4 text-sm text-right font-semibold text-primary-900">
                                    {Number(row.engagement ?? 0).toFixed(2)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {rows.length === 0 && (
                    <div className="py-12 text-center text-sm text-primary-400">
                        No competitor data returned for this period.
                    </div>
                )}
            </div>
        </Panel>
    );
};
