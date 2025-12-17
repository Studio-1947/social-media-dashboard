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
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
                <CalendarIcon size={16} className="text-gray-500" />
                <span>{dateRange}</span>
                <ChevronDown size={14} className="text-gray-400" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-[600px] bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex">
                        {/* Sidebar Presets */}
                        <div className="w-48 border-r border-gray-100 pr-4 space-y-1">
                            {['Yesterday', 'Last week', 'Current month', 'Last 30 days', 'Previous month', 'Last 3 months', 'Last 6 months', 'Last 12 months'].map(preset => (
                                <button
                                    key={preset}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                                        preset === 'Last 30 days' ? "bg-[#2a2a3c] text-white" : "text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>

                        {/* Calendars Area (Placeholder for real calendar logic) */}
                        <div className="flex-1 pl-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm font-semibold text-gray-700">November 2025</div>
                                <div className="text-sm font-semibold text-gray-700">December 2025</div>
                            </div>
                            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                                Calendar Component Integration Pending...
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md shadow-sm shadow-blue-500/30"
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
