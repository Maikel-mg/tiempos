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
