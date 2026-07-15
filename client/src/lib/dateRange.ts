import type { DateRange } from '../services/metricoolApi';

/** Matches DateRangePicker's formatApiDate: 'YYYY-MM-DDTHH:mm:ss', no zone suffix. */
const parse = (s: string) => new Date(s);

const format = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * The immediately-preceding period of equal length, for period-over-period
 * comparison. E.g. range = [Nov 8, Nov 15) → previous = [Nov 1, Nov 8).
 */
export const getPreviousPeriod = (range: DateRange): DateRange => {
    const from = parse(range.from);
    const to = parse(range.to);
    const durationMs = to.getTime() - from.getTime();

    return {
        from: format(new Date(from.getTime() - durationMs)),
        to: format(from),
    };
};
