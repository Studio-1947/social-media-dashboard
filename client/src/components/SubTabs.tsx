import { cn } from '../lib/utils';

export interface SubTab {
    key: string;
    label: string;
}

interface SubTabsProps {
    tabs: SubTab[];
    active: string;
    onChange: (key: string) => void;
    accent: string;
}

/**
 * Section tabs within a network view.
 *
 * Callers build the `tabs` array conditionally — a tab exists only when there is
 * real data behind it for this client. No "Coming Soon" placeholders, no
 * permanently-empty sections.
 */
export const SubTabs = ({ tabs, active, onChange, accent }: SubTabsProps) => (
    <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-primary-100 pb-3">
        {tabs.map((tab) => {
            const isActive = tab.key === active;
            return (
                <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    className={cn(
                        'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200 active:scale-95',
                        isActive
                            ? 'text-white shadow-modern'
                            : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50'
                    )}
                    style={isActive ? { backgroundColor: accent } : undefined}
                >
                    {tab.label}
                </button>
            );
        })}
    </div>
);
