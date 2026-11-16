import { useCallback, useMemo, useState } from 'react';
import { TimeTrackerBar } from '@/features/time-tracker/components/TimeTrackerBar';
import { TimeEntryEditorDialog } from '@/features/time-tracker/components/TimeEntryEditorDialog';
import { useTimeTrackingSession, useTimeTrackingFlows } from '@/features/time-tracker/hooks/useTimeTrackingSession';
import { SplitEntryDialog } from '@/features/time-tracker/components/SplitEntryDialog';
import { SyncPanel } from '@/features/time-tracker/components/SyncPanel';
import { SyncDayButton } from '../components/SyncDayButton';
import { getWorkdayStart } from '@/features/time-tracker/lib/schedule';
import type { TimeEntry } from '@/features/time-tracker/types';
import { useTimerView } from '@/features/time-tracker/hooks/useTimerView';
import { PeriodBar } from '../components/PeriodBar';
import { ViewPills } from '../components/ViewPills';
import { AgendaShortcutsDialog } from '../components/AgendaShortcutsDialog';
import { AgendaView } from '../components/AgendaView';
import { CalendarView } from '../components/CalendarView';
import { InlineComposer } from '../components/InlineComposer';
import { MarcajesButton } from '../components/MarcajesButton';
import type { ComposerSlot, EntryDraft } from '../types';
import { TimelineView } from '../components/TimelineView';
import { useAgendaPreferences } from '../hooks/useAgendaPreferences';
import { useAgendaShortcuts } from '../hooks/useAgendaShortcuts';
import { useEntryKeyboardNavigation } from '../hooks/useEntryKeyboardNavigation';
import { useEntryActionShortcuts } from '../hooks/useEntryActionShortcuts';
import { useMarcajesPeriodo } from '../hooks/useMarcajesPeriodo';
import {
  conflictOf,
  cuadrarDia,
  desajustesOf,
  franjasOf,
  isDiaFichadoValido,
  patchEntry,
  type DayCuadre,
  type MarcajeFix,
} from '../lib/cuadre';
import { parseHHMM } from '@/lib/format';
import { AGENDA_VIEW_ORDER } from '../lib/agendaViews';
import {
  addDays,
  addMinutesToTime,
  DEFAULT_ENTRY_MINUTES,
  endOfDay,
  entriesOfDays,
  nextWorkday,
  sortByStart,
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
  const { entries, createEntry, updateEntry, timer, editor } = session;

  const [cursor, setCursor] = useState(() => toWorkday(todayKey()));
  const [composer, setComposer] = useState<ComposerSlot | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { view, setView, mode, setMode } = useAgendaPreferences();

  const days = useMemo(() => visibleDays(mode, cursor), [mode, cursor]);

  const { liveTimerEntry, handlePlayEntry, timerSplitDisabledReason } = useTimerView({
    createEntry,
    timer,
    todayInRange: days.includes(todayKey()),
  });
  const { split, sync, syncMany } = useTimeTrackingFlows(session, { liveTimerEntry });

  const actions = {
    onEdit: (entry: TimeEntry) => editor.openEdit(entry),
    onPlay: handlePlayEntry,
    onDuplicate: editor.duplicate,
    onSplit: split.handleSplitEntry,
    onSplitTimer: split.handleSplitTimer,
    timerSplitReason: timerSplitDisabledReason,
    onSync: sync.handleSyncEntry,
    onDelete: editor.remove,
  };
  const allEntries = useMemo(
    () => (liveTimerEntry ? [...entries, liveTimerEntry] : entries),
    [entries, liveTimerEntry],
  );
  const visibleEntries = useMemo(() => entriesOfDays(allEntries, days), [allEntries, days]);
  const workdayStart = useMemo(() => getWorkdayStart(cursor), [cursor]);

  // Marcajes del período: caché local primero, refresco en segundo plano.
  const marcajes = useMarcajesPeriodo(days);
  const cuadresPorDia = useMemo(() => {
    const today = todayKey();
    const map = new Map<string, DayCuadre>();
    for (const day of days) {
      const info = marcajes.byDay.get(day);
      const cuadre = cuadrarDia({
        day,
        today,
        times: info?.times ?? [],
        ignored: info?.ignored,
        // El Timer activo queda fuera: mientras corre no hay salida contra la que comparar.
        entries: visibleEntries.filter((entry) => entry.date === day && entry.id !== liveTimerEntry?.id),
      });
      map.set(day, { ...cuadre, stale: info?.marcajes.length ? info.stale : false });
    }
    return map;
  }, [days, marcajes.byDay, visibleEntries, liveTimerEntry?.id]);

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

  /**
   * Aplica una corrección del cuadre con el servicio de siempre, que recalcula
   * la duración. Antes comprueba solape: si choca, no se mueve nada y se explica
   * con qué Registro.
   */
  const applyMarcajeFix = useCallback(
    async (fix: MarcajeFix) => {
      const conflict = conflictOf(visibleEntries, fix);
      if (conflict) {
        return `No se aplicó «${fix.label}»: se solapa con ${conflict.taskName} (${conflict.startTime}–${conflict.endTime})`;
      }
      await updateEntry(fix.entryId, fix.patch);
      return null;
    },
    [visibleEntries, updateEntry],
  );

  /**
   * `Ajustar el día`: aplica en orden de hora y se para en el primer solape,
   * dejando corregidos los ajustes anteriores y diciendo cuál quedó sin aplicar.
   */
  const applyMarcajesLote = useCallback(
    async (fixes: MarcajeFix[]) => {
      // Orden de hora: por dónde queda el Registro después del ajuste.
      const ordenKey = (fix: MarcajeFix) => {
        const entry = visibleEntries.find((candidate) => candidate.id === fix.entryId);
        if (!entry) return Number.MAX_SAFE_INTEGER;
        const patched = patchEntry(entry, fix);
        return parseHHMM(patched.startTime) * 24 * 60 + parseHHMM(patched.endTime);
      };
      const enOrden = [...fixes].sort((a, b) => ordenKey(a) - ordenKey(b));

      let entriesAhora = visibleEntries;
      let applied = 0;

      for (const fix of enOrden) {
        const conflict = conflictOf(entriesAhora, fix);
        if (conflict) {
          return {
            applied,
            blocked: `«${fix.label}»: se solapa con ${conflict.taskName} (${conflict.startTime}–${conflict.endTime})`,
          };
        }
        await updateEntry(fix.entryId, fix.patch);
        entriesAhora = entriesAhora.map((entry) => (entry.id === fix.entryId ? patchEntry(entry, fix) : entry));
        applied++;
      }

      return { applied };
    },
    [visibleEntries, updateEntry],
  );

  /**
   * Aviso del Editor de registros: la franja del día y, si lo que hay escrito se
   * sale de ella, la corrección exacta. Solo en días pasados y con marcajes
   * fiables; hoy queda fuera del cuadre.
   */
  const evaluarMarcajeEnEditor = useCallback(
    (form: { date: string; startTime: string; endTime: string }) => {
      const info = marcajes.byDay.get(form.date);
      const times = info?.times ?? [];
      if (form.date === todayKey() || info?.ignored || !isDiaFichadoValido(times)) return null;

      const franjas = franjasOf(times);
      const borrador: TimeEntry = {
        id: 'editor',
        taskId: 0,
        taskName: '',
        proceso: { proceso: 0, nombre: '' },
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        duration: 0,
        synced: false,
        createdAt: '',
        updatedAt: '',
      };
      const [desajuste] = desajustesOf([borrador], franjas);

      return { franjas, fixes: (desajuste?.fixes ?? []).map((fix) => ({ label: fix.label, patch: fix.patch })) };
    },
    [marcajes.byDay],
  );

  const handleCreate = async (draft: EntryDraft) => {
    await createEntry(draft);
    setComposer(null);
  };

  const goPrev = () =>
    setCursor((current) => (mode === 'day' ? nextWorkday(current, -1) : addDays(current, -7)));
  const goNext = () =>
    setCursor((current) => (mode === 'day' ? nextWorkday(current, 1) : addDays(current, 7)));

  // Teclado: en modo día las flechas mueven la entrada activa; en semana, el período.
  const dayItems = useMemo(
    () =>
      mode === 'day'
        ? sortByStart(visibleEntries.filter((entry) => entry.id !== liveTimerEntry?.id))
        : [],
    [mode, visibleEntries, liveTimerEntry?.id],
  );
  const { activeEntry, activeEntryId } = useEntryKeyboardNavigation({ items: dayItems, isEnabled: mode === 'day' });
  useEntryActionShortcuts({ activeEntry, actions, isEnabled: mode === 'day' });
  const selectViewByPosition = (position: number) => {
    const target = AGENDA_VIEW_ORDER[position - 1];
    if (target) setView(target);
  };

  const focusDateSelector = () => {
    const input = document.getElementById('agenda-jump');
    if (!(input instanceof HTMLInputElement)) return;
    input.focus();
    // Chromium: además de enfocar, abre el calendario nativo.
    const picker = (input as HTMLInputElement & { showPicker?: () => void }).showPicker;
    if (typeof picker === 'function') {
      try {
        picker.call(input);
      } catch {
        // showPicker exige gesto de usuario; con el foco ya basta.
      }
    }
  };

  useAgendaShortcuts({
    onPrev: goPrev,
    onNext: goNext,
    onToday: () => setCursor(toWorkday(todayKey())),
    onToggleMode: () => setMode(mode === 'day' ? 'week' : 'day'),
    onNew: () => openComposerAfterDay(cursor),
    onNextView: () => {
      const index = AGENDA_VIEW_ORDER.indexOf(view);
      setView(AGENDA_VIEW_ORDER[(index + 1) % AGENDA_VIEW_ORDER.length]);
    },
    onSelectView: selectViewByPosition,
    onFocusDate: focusDateSelector,
    onShowHelp: () => setShortcutsOpen(true),
  });

  const step = (direction: 1 | -1) =>
    setCursor((current) => (mode === 'day' ? nextWorkday(current, direction) : addDays(current, direction * 7)));

  return (
    <main className="w-full">
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background backdrop-blur-sm">
        <div className="px-4 py-3 sm:px-6">
          <TimeTrackerBar
            onSubmit={editor.create}
            disabled={false}
            onSplitTimer={liveTimerEntry ? split.handleSplitTimer : undefined}
            splitDisabledReason={timerSplitDisabledReason}
            timer={timer}
          />
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
          <ViewPills value={view} available={AGENDA_VIEW_ORDER} onChange={setView} />
          <MarcajesButton
            days={days}
            entries={visibleEntries}
            marcajes={marcajes}
            cuadresPorDia={cuadresPorDia}
            onApplyFix={applyMarcajeFix}
            onSplit={split.handleSplitEntry}
            onApplyAll={applyMarcajesLote}
          />
          {view === 'timeline' && <SyncDayButton entries={visibleEntries} onSyncDay={syncMany} label="Sincronizar período" />}
        </PeriodBar>
        {sync.syncPanelOpen && (
          <SyncPanel
            selectedEntries={sync.entriesToSync}
            totalPendingCount={sync.pendingEntries.length}
            blockedCount={sync.blockedEntries.length}
            onSyncComplete={session.markSynced}
          />
        )}
        {view === 'calendar' ? (
          <CalendarView
            entries={visibleEntries}
            days={days}
            mode={mode}
            workdayStart={workdayStart}
            cuadresPorDia={cuadresPorDia}
            timerEntryId={liveTimerEntry?.id}
            activeEntryId={activeEntryId}
            actions={actions}
            onAddAt={(day, startTime) => openComposer(day, startTime)}
            onAddAfterDay={openComposerAfterDay}
            onSyncDay={syncMany}
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
            workdayStart={workdayStart}
            cuadresPorDia={cuadresPorDia}
            timerEntryId={liveTimerEntry?.id}
            activeEntryId={activeEntryId}
            actions={actions}
            onAdd={openComposer}
            onAddAfterDay={openComposerAfterDay}
            onSyncDay={syncMany}
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
            activeEntryId={activeEntryId}
            workdayStart={workdayStart}
            cuadresPorDia={cuadresPorDia}
            actions={actions}
            onAdd={(day, startTime) => openComposer(day, startTime)}
            onPickDay={(day) => {
              setCursor(toWorkday(day));
              setMode('day');
            }}
          />
        )}
      </div>

      <AgendaShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

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
        evaluarMarcaje={evaluarMarcajeEnEditor}
      />
    </main>
  );
}
