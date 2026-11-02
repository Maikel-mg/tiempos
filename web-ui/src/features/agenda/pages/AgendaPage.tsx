import { useMemo, useState } from 'react';
import { TimeTrackerBar } from '@/features/time-tracker/components/TimeTrackerBar';
import { TimeEntryEditorDialog } from '@/features/time-tracker/components/TimeEntryEditorDialog';
import { useTimeTrackingSession } from '@/features/time-tracker/hooks/useTimeTrackingSession';
import { getWorkdayStart } from '@/features/time-tracker/lib/schedule';
import { PeriodBar } from '../components/PeriodBar';
import { ViewPills } from '../components/ViewPills';
import { AgendaView } from '../components/AgendaView';
import { CalendarView } from '../components/CalendarView';
import { TimelineView } from '../components/TimelineView';
import { useAgendaPreferences } from '../hooks/useAgendaPreferences';
import { IMPLEMENTED_AGENDA_VIEWS } from '../lib/agendaViews';
import {
  addDays,
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
  const { entries, timer, editor } = session;

  const [cursor, setCursor] = useState(() => toWorkday(todayKey()));
  const { view, setView, mode, setMode } = useAgendaPreferences();

  const days = useMemo(() => visibleDays(mode, cursor), [mode, cursor]);
  const visibleEntries = useMemo(() => entriesOfDays(entries, days), [entries, days]);
  const workdayStart = useMemo(() => getWorkdayStart(cursor), [cursor]);

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
            onEdit={(entry) => editor.openEdit(entry)}
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
            onEdit={(entry) => editor.openEdit(entry)}
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
            workdayStart={workdayStart}
            onEdit={(entry) => editor.openEdit(entry)}
            onPickDay={(day) => {
              setCursor(toWorkday(day));
              setMode('day');
            }}
          />
        )}
      </div>

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
