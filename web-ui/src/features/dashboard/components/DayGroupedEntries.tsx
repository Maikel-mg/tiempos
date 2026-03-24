import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import type { TimeEntry } from '@/lib/types';
import type { WeekGroup, WeekDay } from '../types';

// Utility functions
function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  return `${dayNames[date.getDay()]} ${date.getDate()}`;
}

function formatFullShortDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  return `${dayNames[date.getDay()]} ${date.getDate()}`;
}

function getDateKey(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// Get Monday of the week for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Get Sunday of the week for a given date
function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  return new Date(weekStart);
}

function getWeekKey(dateString: string): string {
  const date = new Date(dateString);
  const weekStart = getWeekStart(date);
  return `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]}`;
  } else {
    return `${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]}`;
  }
}

function groupEntriesByWeek(entries: TimeEntry[]): WeekGroup[] {
  // First group by day
  const dayGroups = new Map<string, TimeEntry[]>();
  
  entries.forEach((entry) => {
    const start = entry.timeInterval?.start;
    if (!start) return;
    
    const dateKey = getDateKey(start);
    const existing = dayGroups.get(dateKey) || [];
    dayGroups.set(dateKey, [...existing, entry]);
  });
  
  // Then group days by week
  const weekGroups = new Map<string, WeekDay[]>();
  
  dayGroups.forEach((dayEntries, dateKey) => {
    const date = new Date(dateKey);
    const weekStart = getWeekStart(date);
    const weekStartKey = getDateKey(weekStart.toISOString());
    
    const totalSeconds = dayEntries.reduce((sum, entry) => {
      const duration = entry.timeInterval?.duration;
      const seconds = typeof duration === 'number' ? duration : 0;
      return sum + seconds;
    }, 0);
    
    const weekDay: WeekDay = {
      date: dateKey,
      dateFormatted: formatShortDate(dateKey),
      fullDateFormatted: formatFullShortDate(dateKey),
      totalSeconds,
      entries: dayEntries,
    };
    
    const existingWeek = weekGroups.get(weekStartKey) || [];
    weekGroups.set(weekStartKey, [...existingWeek, weekDay]);
  });
  
  // Convert to WeekGroup array
  const result: WeekGroup[] = [];
  
  const sortedWeekKeys = Array.from(weekGroups.keys()).sort((a, b) => b.localeCompare(a));
  
  sortedWeekKeys.forEach((weekStartKey) => {
    const weekDays = weekGroups.get(weekStartKey)!;
    
    // Sort days within week (Monday to Sunday)
    weekDays.sort((a, b) => a.date.localeCompare(b.date));
    
    const weekStartDate = new Date(weekStartKey + 'T00:00:00');
    const weekEndDate = getWeekEnd(weekStartDate);
    const weekEndKey = getDateKey(weekEndDate.toISOString());
    
    const totalSeconds = weekDays.reduce((sum, day) => sum + day.totalSeconds, 0);
    
    result.push({
      weekKey: getWeekKey(weekStartKey),
      weekStart: weekStartKey,
      weekEnd: weekEndKey,
      weekRangeFormatted: formatWeekRange(weekStartKey, weekEndKey),
      totalSeconds,
      days: weekDays,
    });
  });
  
  return result;
}

interface DayGroupedEntriesProps {
  entries: TimeEntry[];
}

export function DayGroupedEntries({ entries }: DayGroupedEntriesProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  
  const weekGroups = useMemo(() => groupEntriesByWeek(entries), [entries]);
  
  const toggleWeek = (weekKey: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekKey)) {
        next.delete(weekKey);
      } else {
        next.add(weekKey);
      }
      return next;
    });
  };
  
  const toggleDay = (dayKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  };
  
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Time Entries por Semana</h2>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay time entries en este período</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Time Entries por Semana</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {weekGroups.map((weekGroup) => (
          <WeekGroupCard
            key={weekGroup.weekKey}
            weekGroup={weekGroup}
            isWeekExpanded={expandedWeeks.has(weekGroup.weekKey)}
            onWeekToggle={() => toggleWeek(weekGroup.weekKey)}
            expandedDays={expandedDays}
            onDayToggle={toggleDay}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface WeekGroupCardProps {
  weekGroup: WeekGroup;
  isWeekExpanded: boolean;
  onWeekToggle: () => void;
  expandedDays: Set<string>;
  onDayToggle: (dayKey: string) => void;
}

function WeekGroupCard({ weekGroup, isWeekExpanded, onWeekToggle, expandedDays, onDayToggle }: WeekGroupCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Week Header - always visible, clickable */}
      <button
        onClick={onWeekToggle}
        className="w-full flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {isWeekExpanded ? (
            <ChevronDown className="h-5 w-5 text-purple-600" />
          ) : (
            <ChevronRight className="h-5 w-5 text-purple-600" />
          )}
          <span className="font-semibold">Semana {weekGroup.weekRangeFormatted}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {weekGroup.days.length} {weekGroup.days.length === 1 ? 'día' : 'días'}
          </span>
          <span className="font-mono font-semibold bg-purple-600 text-white px-3 py-1 rounded">
            {formatDuration(weekGroup.totalSeconds)}
          </span>
        </div>
      </button>
      
      {/* Week Body - collapsible */}
      {isWeekExpanded && (
        <div className="border-t bg-background">
          <div className="divide-y">
            {weekGroup.days.map((day) => (
              <DayRow
                key={day.date}
                day={day}
                isExpanded={expandedDays.has(day.date)}
                onToggle={() => onDayToggle(day.date)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface DayRowProps {
  day: WeekDay;
  isExpanded: boolean;
  onToggle: () => void;
}

function DayRow({ day, isExpanded, onToggle }: DayRowProps) {
  return (
    <div>
      {/* Day Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{day.fullDateFormatted}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {day.entries.length} {day.entries.length === 1 ? 'entrada' : 'entradas'}
          </span>
          <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
            {formatDuration(day.totalSeconds)}
          </span>
        </div>
      </button>
      
      {/* Day Body - collapsible */}
      {isExpanded && (
        <div className="border-t bg-muted/20">
          <div className="divide-y">
            {day.entries.map((entry, index) => (
              <div key={entry.id || index} className="p-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    {entry.timeInterval?.start && (
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {formatTime(entry.timeInterval.start)}
                        {entry.timeInterval.end && ` - ${formatTime(entry.timeInterval.end)}`}
                      </span>
                    )}
                    {entry.project?.name && (
                      <>
                        <span className="font-medium text-foreground">{entry.project.name}</span>
                        <span>›</span>
                      </>
                    )}
                    {entry.taskName && (
                      <>
                        <span>{entry.taskName}</span>
                        <span>›</span>
                      </>
                    )}
                  </div>
                  {entry.description && (
                    <p className="text-sm truncate">{entry.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="font-mono text-sm">
                    {formatDuration(
                      typeof entry.timeInterval?.duration === 'number'
                        ? entry.timeInterval.duration
                        : 0
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
