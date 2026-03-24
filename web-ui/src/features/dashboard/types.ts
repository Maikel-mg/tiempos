export type PeriodType = 'today' | 'week' | 'month' | 'last-month' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TaskSummary {
  name: string;
  seconds: number;
  percentage: number;
}

export interface DashboardSummary {
  totalSeconds: number;
  entriesCount: number;
  avgPerDaySeconds: number;
  tasksBreakdown: TaskSummary[];
}

// Types for DayGroupedEntries component
export interface DayEntry {
  timeEntry: import('@/lib/types').TimeEntry;
}

export interface DayGroup {
  date: string;           // YYYY-MM-DD
  dateFormatted: string;   // "Lunes, 24 de Marzo"
  totalSeconds: number;
  entries: import('@/lib/types').TimeEntry[];
}

// Types for WeekGroupedEntries component
export interface WeekDay {
  date: string;           // YYYY-MM-DD
  dateFormatted: string;  // "Lunes"
  fullDateFormatted: string; // "Lunes 24"
  totalSeconds: number;
  entries: import('@/lib/types').TimeEntry[];
}

export interface WeekGroup {
  weekKey: string;        // YYYY-WXX
  weekStart: string;      // YYYY-MM-DD (Monday)
  weekEnd: string;        // YYYY-MM-DD (Sunday)
  weekRangeFormatted: string; // "24 - 30 Mar"
  totalSeconds: number;
  days: WeekDay[];
}
