import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Clock, MoreVertical, Play, Pencil, Trash2, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { groupEntriesByWeek, getWeekKey, getWeekStart, parseDateString, formatDateToString, formatWeekRange, formatShortDate } from '../lib/groupEntriesByWeek';
import { TimerRow } from './TimerRow';
import type { TimeEntry, LocalWeekGroup, LocalWeekDay } from '../types';

interface TimerEntryData {
  taskName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  description?: string;
}

interface GroupedEntryViewProps {
  entries: TimeEntry[];
  selectedIds: Set<string>;
  onSelect?: (ids: Set<string>) => void;
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (entry: TimeEntry) => void;
  onPlay?: (entry: TimeEntry) => void;
  onDuplicate?: (entry: TimeEntry) => void;
  timerEntry?: TimerEntryData | null;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
}

function getTodayWeekKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return getWeekKey(`${y}-${m}-${d}`);
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function GroupedEntryView({
  entries,
  selectedIds,
  onSelect,
  onDelete: _onDelete,
  onEdit: _onEdit,
  onPlay: _onPlay,
  onDuplicate: _onDuplicate,
  timerEntry,
}: GroupedEntryViewProps) {
  const weekGroups = useMemo(() => groupEntriesByWeek(entries), [entries]);

  // When timer is running, ensure today has a day group even if no entries exist
  const effectiveWeekGroups = useMemo(() => {
    if (!timerEntry) return weekGroups;

    const todayStr = toLocalDateString(new Date());
    const todayWeekKey = getWeekKey(todayStr);
    const timerSeconds = timerEntry.duration;

    // Check if today already has entries in the existing groups
    const todayExists = weekGroups.some(w =>
      w.weekKey === todayWeekKey && w.days.some(d => d.date === todayStr)
    );

    if (todayExists) {
      // Update existing day's totalSeconds to include timer elapsed
      return weekGroups.map(w => {
        if (w.weekKey !== todayWeekKey) return w;
        return {
          ...w,
          totalSeconds: w.totalSeconds + timerSeconds,
          days: w.days.map(d => {
            if (d.date !== todayStr) return d;
            return { ...d, totalSeconds: d.totalSeconds + timerSeconds };
          }),
        };
      });
    }

    // Create a synthetic day for today with timer elapsed
    const todayDay: LocalWeekDay = {
      date: todayStr,
      dateFormatted: formatShortDate(todayStr),
      totalSeconds: timerSeconds,
      entries: [],
    };

    // Find existing week group for this week
    const existingWeekIdx = weekGroups.findIndex(w => w.weekKey === todayWeekKey);
    if (existingWeekIdx >= 0) {
      // Add today to existing week group
      const updated = [...weekGroups];
      const week = { ...updated[existingWeekIdx] };
      week.days = [...week.days, todayDay].sort((a, b) => a.date.localeCompare(b.date));
      week.totalSeconds = week.totalSeconds + timerSeconds;
      updated[existingWeekIdx] = week;
      return updated;
    }

    // Create a new week group for today
    const monday = getWeekStart(parseDateString(todayStr));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekStartStr = formatDateToString(monday);
    const weekEndStr = formatDateToString(sunday);

    const newWeek: LocalWeekGroup = {
      weekKey: todayWeekKey,
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      weekRangeFormatted: formatWeekRange(weekStartStr, weekEndStr),
      totalSeconds: timerSeconds,
      days: [todayDay],
    };

    return [newWeek, ...weekGroups].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }, [weekGroups, timerEntry]);

  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(() => {
    return new Set([getTodayWeekKey()]);
  });
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    const todayKey = getTodayWeekKey();
    const todayWeek = weekGroups.find((w) => w.weekKey === todayKey);
    const days = todayWeek ? todayWeek.days.map((d) => d.date) : [];
    // Always include today when timer is running
    const todayStr = toLocalDateString(new Date());
    if (!days.includes(todayStr)) {
      days.push(todayStr);
    }
    return new Set(days);
  });

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

  if (entries.length === 0 && !timerEntry) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="text-center py-16 space-y-3">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">No hay registros de tiempo</p>
          <p className="text-sm text-muted-foreground">
            Empezá usando el temporizador o agregá un registro manual arriba.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {effectiveWeekGroups.map((weekGroup) => (
        <WeekGroupCard
          key={weekGroup.weekKey}
          weekGroup={weekGroup}
          isWeekExpanded={expandedWeeks.has(weekGroup.weekKey)}
          onWeekToggle={() => toggleWeek(weekGroup.weekKey)}
          expandedDays={expandedDays}
          onDayToggle={toggleDay}
          onDelete={_onDelete}
          onEdit={_onEdit}
          onPlay={_onPlay}
          onDuplicate={_onDuplicate}
          selectedIds={selectedIds}
          onSelect={onSelect}
          timerEntry={timerEntry}
        />
      ))}
    </div>
  );
}

interface WeekGroupCardProps {
  weekGroup: LocalWeekGroup;
  isWeekExpanded: boolean;
  onWeekToggle: () => void;
  expandedDays: Set<string>;
  onDayToggle: (dayKey: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (entry: TimeEntry) => void;
  onPlay?: (entry: TimeEntry) => void;
  onDuplicate?: (entry: TimeEntry) => void;
  selectedIds: Set<string>;
  onSelect?: (ids: Set<string>) => void;
  timerEntry?: TimerEntryData | null;
}

function WeekGroupCard({
  weekGroup,
  isWeekExpanded,
  onWeekToggle,
  expandedDays,
  onDayToggle,
  onDelete,
  onEdit,
  onPlay,
  onDuplicate,
  selectedIds,
  onSelect,
  timerEntry,
}: WeekGroupCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Week Header */}
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
          <span className="font-semibold">{weekGroup.weekRangeFormatted}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {weekGroup.days.length} {weekGroup.days.length === 1 ? 'día' : 'días'}
          </span>
          <span className="bg-purple-600 text-white px-3 py-1 rounded font-mono">
            {formatDuration(weekGroup.totalSeconds)}
          </span>
        </div>
      </button>

      {/* Week Body */}
      {isWeekExpanded && (
        <div className="border-t bg-background">
          <div className="divide-y">
            {weekGroup.days.map((day) => (
              <DayRow
                key={day.date}
                day={day}
                isExpanded={expandedDays.has(day.date)}
                onToggle={() => onDayToggle(day.date)}
                onDelete={onDelete}
                onEdit={onEdit}
                onPlay={onPlay}
                onDuplicate={onDuplicate}
                selectedIds={selectedIds}
                onSelect={onSelect}
                timerEntry={day.date === toLocalDateString(new Date()) ? timerEntry : null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface DayRowProps {
  day: LocalWeekDay;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (entry: TimeEntry) => void;
  onPlay?: (entry: TimeEntry) => void;
  onDuplicate?: (entry: TimeEntry) => void;
  selectedIds: Set<string>;
  onSelect?: (ids: Set<string>) => void;
  timerEntry?: TimerEntryData | null;
}

function DayRow({ day, isExpanded, onToggle, onDelete, onEdit, onPlay, onDuplicate, selectedIds, onSelect, timerEntry }: DayRowProps) {
  const toggleEntry = (entryId: string) => {
    if (!onSelect) return;
    const newSet = new Set(selectedIds);
    if (newSet.has(entryId)) {
      newSet.delete(entryId);
    } else {
      newSet.add(entryId);
    }
    onSelect(newSet);
  };

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
          <span className="font-medium">{day.dateFormatted}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {day.entries.length} {day.entries.length === 1 ? 'entrada' : 'entradas'}
          </span>
          <span className="bg-muted px-2 py-0.5 rounded font-mono text-sm">
            {formatDuration(day.totalSeconds)}
          </span>
        </div>
      </button>

      {/* Day Body */}
      {isExpanded && (
        <div className="border-t bg-muted/20">
          <div className="divide-y">
            {timerEntry && (
              <div className="p-0">
                <table className="w-full"><tbody><TimerRow {...timerEntry} /></tbody></table>
              </div>
            )}
            {day.entries.map((entry) => (
              <div key={entry.id} className={`p-3 flex items-start justify-between gap-4 ${selectedIds.has(entry.id) ? 'bg-green-50' : ''}`}>
                <button
                  onClick={() => toggleEntry(entry.id)}
                  className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-md hover:bg-accent shrink-0"
                >
                  {selectedIds.has(entry.id) ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{entry.taskName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {entry.startTime} – {entry.endTime}
                    </span>
                    <span className="font-mono text-xs">
                      {formatDuration(entry.duration)}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {entry.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Acciones">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onPlay?.(entry)}>
                      <Play className="h-4 w-4" />
                      Play
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={entry.synced}
                      onClick={() => onEdit?.(entry)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate?.(entry)}>
                      <Copy className="h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete?.(entry.id)}>
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
