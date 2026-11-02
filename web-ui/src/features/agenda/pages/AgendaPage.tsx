import { useCallback, useEffect, useMemo, useState } from 'react';
import { TimeTrackerBar } from '@/features/time-tracker/components/TimeTrackerBar';
import { TimeEntryEditorDialog } from '@/features/time-tracker/components/TimeEntryEditorDialog';
import { useTimeTrackingSession, useTimeTrackingFlows } from '@/features/time-tracker/hooks/useTimeTrackingSession';
import { SplitEntryDialog } from '@/features/time-tracker/components/SplitEntryDialog';
import { getWorkdayStart } from '@/features/time-tracker/lib/schedule';
import type { TimeEntry } from '@/features/time-tracker/types';
import { useTimerView } from '@/features/time-tracker/hooks/useTimerView';
import { PeriodBar } from '../components/PeriodBar';
import { ViewPills } from '../components/ViewPills';
import { AgendaView } from '../components/AgendaView';
import { CalendarView } from '../components/CalendarView';
import { InlineComposer, type ComposerSlot, type EntryDraft } from '../components/InlineComposer';
import { TimelineView } from '../components/TimelineView';
import { useAgendaPreferences } from '../hooks/useAgendaPreferences';
import { IMPLEMENTED_AGENDA_VIEWS } from '../lib/agendaViews';
import {
  addDays,
  addMinutesToTime,
  DEFAULT_ENTRY_MINUTES,
  endOfDay,
  entriesOfDays,
  nextWorkday,
  todayKey,
  toWorkday,
  visibleDays,
} from '../lib/planRange';

/**
 * Agenda: la pantalla de entrada de la aplicación.
 *
 * Muestra el período en curso —un día laborable o una semana laborable, nunca
 * sábado ni domingo— con tres lecturas del mismo período (Calendario, Agenda y
 * Timeline) sobre la sesión de registro de tiempos del time tracker.
 */
export function AgendaPage() {
  const session = useTimeTrackingSession();
  const { entries, createEntry, timer, editor } = session;

  const [cursor, setCursor] = useState(() => toWorkday(todayKey()));
  const [composer, setComposer] = useState<ComposerSlot | null>(null);
  const { view, setView, mode, setMode } = useAgendaPreferences();

  const days = useMemo(() => visibleDays(mode, cursor), [mode, cursor]);

  const { liveTimerEntry, handlePlayEntry } = useTimerView({
    createEntry,
    timer,
    todayInRange: days.includes(todayKey()),
  });
  const { split, sync } = useTimeTrackingFlows(session, { liveTimerEntry });

  const actions = {
    onEdit: (entry: TimeEntry) => editor.openEdit(entry),
    onPlay: handlePlayEntry,
    onDuplicate: editor.duplicate,
    onSplit: split.handleSplitEntry,
    onSync: sync.handleSyncEntry,
    onDelete: editor.remove,
  };
  const allEntries = useMemo(
    () => (liveTimerEntry ? [...entries, liveTimerEntry] : entries),
    [entries, liveTimerEntry],
  );
  const visibleEntries = useMemo(() => entriesOfDays(allEntries, days), [allEntries, days]);
  const workdayStart = useMemo(() => getWorkdayStart(cursor), [cursor]);

  /** Abre el compositor en un hueco del día visible. */
  const openComposer = useCallback(
    (date: string, startTime?: string, endTime?: string, preset?: ComposerSlot['preset']) => {
      const start = startTime ?? '09:00';
      setComposer({ date, startTime: start, endTime: endTime ?? addMinutesToTime(start, DEFAULT_ENTRY_MINUTES), preset });
    },
    [],
  );

  const openComposerAfterDay = useCallback(
    (date: string) => {
      const start = endOfDay(visibleEntries.filter((entry) => entry.date === date));
      setComposer({ date, startTime: start, endTime: addMinutesToTime(start, DEFAULT_ENTRY_MINUTES) });
    },
    [visibleEntries],
  );

  const handleCreate = async (draft: EntryDraft) => {
    await createEntry(draft);
    setComposer(null);
  };

  // Atajo N: alta al final del día visible.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'n' || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      event.preventDefault();
      openComposerAfterDay(cursor);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cursor, openComposerAfterDay]);

  const step = (direction: 1 | -1) =>
    setCursor((current) => (mode === 'day' ? nextWorkday(current, direction) : addDays(current, direction * 7)));

  return (
    <main className="w-full">
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background backdrop-blur-sm">
        <div className="px-4 py-3 sm:px-6">
          <TimeTrackerBar onSubmit={editor.create} disabled={false} timer={timer} />
        </div>
      </div>

      <div className="space-y-4 px-4 py-5 sm:px-6">
        {composer && (
          <InlineComposer
            date={composer.date}
            startTime={composer.startTime}
            endTime={composer.endTime}
            preset={composer.preset}
            onCancel={() => setComposer(null)}
            onSubmit={handleCreate}
          />
        )}
        <PeriodBar
          mode={mode}
          cursor={cursor}
          entries={visibleEntries}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onToday={() => setCursor(toWorkday(todayKey()))}
          onModeChange={setMode}
          onJump={(day) => setCursor(toWorkday(day))}
        >
          <ViewPills value={view} available={IMPLEMENTED_AGENDA_VIEWS} onChange={setView} />
        </PeriodBar>
        {view === 'calendar' ? (
          <CalendarView
            entries={visibleEntries}
            days={days}
            mode={mode}
            workdayStart={workdayStart}
            timerEntryId={liveTimerEntry?.id}
            actions={actions}
            onAdd={(day, startTime) => openComposer(day, startTime)}
            onPickDay={(day) => {
              setCursor(toWorkday(day));
              setMode('day');
            }}
          />
        ) : view === 'agenda' ? (
          <AgendaView
            entries={visibleEntries}
            days={days}
            mode={mode}
            timerEntryId={liveTimerEntry?.id}
            actions={actions}
            onAdd={openComposer}
            onAddAfterDay={openComposerAfterDay}
            onPickDay={(day) => {
              setCursor(toWorkday(day));
              setMode('day');
            }}
          />
        ) : (
          <TimelineView
            entries={visibleEntries}
            days={days}
            mode={mode}
            timerEntryId={liveTimerEntry?.id}
            workdayStart={workdayStart}
            actions={actions}
            onAddAt={(day, startTime) => openComposer(day, startTime)}
            onAddAfterDay={openComposerAfterDay}
            onPickDay={(day) => {
              setCursor(toWorkday(day));
              setMode('day');
            }}
          />
        )}
      </div>

      <SplitEntryDialog
        open={split.splittingEntry !== null}
        entry={split.splittingEntry}
        live={split.splittingTimer}
        onOpenChange={split.handleSplitDialogOpenChange}
        onConfirm={split.handleSplitConfirm}
      />

      <TimeEntryEditorDialog
        open={editor.isEditorOpen}
        mode={editor.editingEntry ? 'edit' : 'create'}
        entry={editor.editingEntry}
        onOpenChange={editor.handleOpenChange}
        onSubmit={editor.submit}
      />
    </main>
  );
}
