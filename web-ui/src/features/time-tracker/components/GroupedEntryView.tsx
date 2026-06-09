import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Clock, MoreVertical, Play, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { groupEntriesByWeek, getWeekKey } from '../lib/groupEntriesByWeek';
import type { TimeEntry, LocalWeekGroup, LocalWeekDay } from '../types';

interface GroupedEntryViewProps {
  entries: TimeEntry[];
  selectedIds: Set<string>;
  onSelect?: (ids: Set<string>) => void;
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (entry: TimeEntry) => void;
  onPlay?: (entry: TimeEntry) => void;
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

export function GroupedEntryView({
  entries,
  selectedIds: _selectedIds,
  onSelect: _onSelect,
  onDelete: _onDelete,
  onEdit: _onEdit,
  onPlay: _onPlay,
}: GroupedEntryViewProps) {
  const weekGroups = useMemo(() => groupEntriesByWeek(entries), [entries]);

  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(() => {
    return new Set([getTodayWeekKey()]);
  });
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    const todayKey = getTodayWeekKey();
    const todayWeek = weekGroups.find((w) => w.weekKey === todayKey);
    if (!todayWeek) return new Set();
    return new Set(todayWeek.days.map((d) => d.date));
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

  if (entries.length === 0) {
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
      {weekGroups.map((weekGroup) => (
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
}

function DayRow({ day, isExpanded, onToggle, onDelete, onEdit, onPlay }: DayRowProps) {
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
            {day.entries.map((entry) => (
              <div key={entry.id} className="p-3 flex items-start justify-between gap-4">
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
