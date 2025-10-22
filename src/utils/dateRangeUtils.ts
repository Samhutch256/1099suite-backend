import { RangePreset } from '../hooks/useLeadsFilters';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getWeek } from 'date-fns';

export interface DateRange {
  start: string; // ISO string
  end: string;   // ISO string
}

export const resolveRange = (preset: RangePreset, customStart?: string, customEnd?: string): DateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case 'today':
      return {
        start: today.toISOString(),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
      };
    
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      return {
        start: weekStart.toISOString(),
        end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1).toISOString(),
      };
    
    case 'month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: monthStart.toISOString(),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
      };
    
    case 'quarter':
      const quarter = Math.floor(today.getMonth() / 3);
      const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
      return {
        start: quarterStart.toISOString(),
        end: new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999).toISOString(),
      };
    
    case 'year':
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return {
        start: yearStart.toISOString(),
        end: new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString(),
      };
    
    case 'custom':
      if (customStart && customEnd) {
        return {
          start: new Date(customStart).toISOString(),
          end: new Date(customEnd + 'T23:59:59.999Z').toISOString(),
        };
      }
      // Fall through to 'all' if custom dates are not provided
      
    case 'all':
    default:
      return {
        start: new Date(0).toISOString(), // Beginning of time
        end: new Date(8640000000000000).toISOString(), // End of time (max safe date)
      };
  }
};

export const formatDateRange = (preset: RangePreset, customStart?: string, customEnd?: string): string => {
  switch (preset) {
    case 'today':
      return 'Today';
    case 'week':
      return 'This Week';
    case 'month':
      return 'This Month';
    case 'quarter':
      return 'This Quarter';
    case 'year':
      return 'This Year';
    case 'custom':
      if (customStart && customEnd) {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
      }
      return 'Custom Range';
    case 'all':
    default:
      return 'All Time';
  }
};

export const getDateFieldMapping = () => {
  return {
    created: 'created_at',
    updated: 'updated_at',
    appt_set: 'appointment_set_on_date',
    appt_held: 'appointment_date',
    deal_signed: 'date_set',
    service_completed: 'date_set_for',
    follow_up_due: 'next_follow_up', // This would need to be computed from follow_up_reminders
  } as const;
};

export type Scope = 'day' | 'week' | 'month' | 'year';

export interface Period {
  start: Date;
  end: Date;
  title: string;
}

export const getPeriod = (date: Date, scope: Scope): Period => {
  switch (scope) {
    case 'day':
      return {
        start: date,
        end: date,
        title: format(date, 'MMM d, yyyy'),
      };

    case 'week':
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
      const weekNumber = getWeek(date, { weekStartsOn: 1 });
      return {
        start: weekStart,
        end: weekEnd,
        title: `${format(weekStart, 'MMM d')}–${format(weekEnd, 'MMM d, yyyy')} (Week ${weekNumber})`,
      };

    case 'month':
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      return {
        start: monthStart,
        end: monthEnd,
        title: format(date, 'MMM yyyy'),
      };

    case 'year':
      const yearStart = startOfYear(date);
      const yearEnd = endOfYear(date);
      return {
        start: yearStart,
        end: yearEnd,
        title: format(date, 'yyyy'),
      };

    default:
      return {
        start: date,
        end: date,
        title: format(date, 'MMM d, yyyy'),
      };
  }
};

export const formatDateForDatabase = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const getScopeOptions = (): { label: string; value: Scope }[] => [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];
