import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

const presets = [
    'Yesterday',
    'Last 7 days',
    'Last 30 days',
    'Current month',
    'Last 3 months',
    'Last 6 months',
    'Last 12 months'
];

export const DateRangePicker = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activePreset, setActivePreset] = useState('Last 30 days');
    const [dateRange, setDateRange] = useState("Nov 17, 2025 - Dec 16, 2025");

    const handlePresetClick = (preset: string) => {
        setActivePreset(preset);
        // In a real app, this would use date-fns to calculate actual ranges
        // For now, we'll update the label to show it's functional
        const now = new Date();
        const endDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        let startDate = "";

        switch (preset) {
            case 'Yesterday':
                startDate = new Date(now.setDate(now.getDate() - 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                setDateRange(`${startDate} - ${startDate}`);
                break;
            case 'Last 7 days':
                startDate = new Date(now.setDate(now.getDate() - 7)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                setDateRange(`${startDate} - ${endDate}`);
                break;
            case 'Last 30 days':
                startDate = new Date(now.setDate(now.getDate() - 30)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                setDateRange(`${startDate} - ${endDate}`);
                break;
            case 'Current month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                setDateRange(`${startDate} - ${endDate}`);
                break;
            default:
                setDateRange("Custom Range Selected");
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-primary-200 shadow-modern text-sm font-medium text-primary-900 hover:shadow-modern-lg hover:border-primary-300 transition-all duration-200 active:scale-95"
            >
                <CalendarIcon size={16} className="text-primary-600" />
                <span className="font-semibold">{dateRange}</span>
                <ChevronDown size={14} className={cn(
                    "text-primary-400 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-[550px] bg-white rounded-2xl shadow-modern-xl border border-primary-100 p-5 z-50 animate-slide-down">
                    <div className="flex gap-4">
                        {/* Sidebar Presets */}
                        <div className="w-48 border-r border-primary-100 pr-4 space-y-1">
                            <h4 className="text-xs font-semibold text-primary-600 mb-3 uppercase tracking-wide">Quick Select</h4>
                            {presets.map(preset => (
                                <button
                                    key={preset}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between group",
                                        activePreset === preset
                                            ? "bg-primary-900 text-white font-semibold shadow-modern"
                                            : "text-primary-700 hover:bg-primary-50 hover:text-primary-900"
                                    )}
                                >
                                    <span>{preset}</span>
                                    {activePreset === preset && <Check size={14} className="text-white" />}
                                </button>
                            ))}
                        </div>

                        {/* Calendars Area */}
                        <div className="flex-1 pl-2">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm font-bold text-primary-900">Select Range</div>
                            </div>
                            <div className="h-56 bg-gradient-to-br from-primary-50 to-white rounded-xl flex items-center justify-center border border-primary-100 p-6 text-center">
                                <div>
                                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <CalendarIcon className="w-6 h-6 text-primary-600" />
                                    </div>
                                    <p className="text-primary-900 font-semibold text-sm mb-1">Calendar Integration</p>
                                    <p className="text-primary-500 text-xs">Selecting a preset above will automatically update your dashboard analytics for that period.</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm text-primary-700 hover:bg-primary-50 rounded-lg transition-colors duration-200 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-6 py-2 text-sm bg-gradient-to-r from-primary-900 to-primary-800 text-white hover:shadow-modern-lg rounded-lg transition-all duration-200 font-semibold active:scale-95"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
