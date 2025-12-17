import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export const DateRangePicker = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [dateRange] = useState("Nov 17, 2025 - Dec 16, 2025");

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-primary-200 shadow-modern text-sm font-medium text-primary-900 hover:shadow-modern-lg hover:border-primary-300 transition-all duration-200"
            >
                <CalendarIcon size={16} className="text-primary-600" />
                <span className="font-semibold">{dateRange}</span>
                <ChevronDown size={14} className={cn(
                    "text-primary-400 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-[600px] bg-white rounded-2xl shadow-modern-xl border border-primary-100 p-5 z-50 animate-slide-down">
                    <div className="flex gap-4">
                        {/* Sidebar Presets */}
                        <div className="w-48 border-r border-primary-100 pr-4 space-y-1">
                            <h4 className="text-xs font-semibold text-primary-600 mb-3 uppercase tracking-wide">Quick Select</h4>
                            {['Yesterday', 'Last week', 'Current month', 'Last 30 days', 'Previous month', 'Last 3 months', 'Last 6 months', 'Last 12 months'].map(preset => (
                                <button
                                    key={preset}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                        preset === 'Last 30 days'
                                            ? "bg-gradient-to-r from-primary-900 to-primary-800 text-white font-semibold shadow-modern"
                                            : "text-primary-700 hover:bg-primary-50 hover:text-primary-900"
                                    )}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>

                        {/* Calendars Area (Placeholder for real calendar logic) */}
                        <div className="flex-1 pl-2">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm font-bold text-primary-900">November 2025</div>
                                <div className="text-sm font-bold text-primary-900">December 2025</div>
                            </div>
                            <div className="h-64 bg-gradient-to-br from-primary-50 to-white rounded-xl flex items-center justify-center border border-primary-100">
                                <div className="text-center">
                                    <CalendarIcon className="w-12 h-12 text-primary-300 mx-auto mb-2" />
                                    <p className="text-primary-500 text-sm">Calendar Component Integration Pending...</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm text-primary-700 hover:bg-primary-50 rounded-lg transition-colors duration-200 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm bg-gradient-to-r from-accent-blue to-accent-purple text-white hover:shadow-modern-lg rounded-lg transition-all duration-200 font-semibold"
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
