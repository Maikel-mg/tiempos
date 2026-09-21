import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { remindersConfig } from '@/config/stores';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import { showReminderNotification } from '@/lib/notifications';
import { useRunningTimer } from '@/hooks/useRunningTimer';
import { useTimerToggle } from '@/hooks/useTimerToggle';
import { getDailyTarget, getWorkdayStart } from '@/features/time-tracker/lib/schedule';
import { stopRunningTimer } from '@/features/time-tracker/lib/timerActions';
import {
  advanceFired,
  buildReminderMessage,
  evaluateReminders,
  type ReminderContext,
  type ReminderKind,
  type ReminderSettings,
} from '@/features/time-tracker/lib/workReminders';

/** Cada cuánto se evalúan las reglas. */
const TICK_MS = 30_000;
/** Cada cuánto se relee lo trabajado hoy (IndexedDB es barato, pero no gratis). */
const REFRESH_MS = 5 * 60_000;
/** Duración del toast: hay que poder leerlo y actuar. */
const TOAST_MS = 15_000;

interface DayContext {
  date: string;
  startMinutes: number | null;
  targetSeconds: number;
}

function todayString(): string {
  return new Date().toLocaleDateString('sv-SE');
}

function readDayContext(): DayContext {
  const date = todayString();
  return {
    date,
    startMinutes: getWorkdayStart(date),
    targetSeconds: getDailyTarget(date) * 3600,
  };
}

async function readTodayWorkedSeconds(date: string): Promise<number> {
  const entries = await indexedDBStorage.getEntriesByDateRange(date, date);
  return entries
    .filter((entry) => !entry.recoverable)
    .reduce((sum, entry) => sum + entry.duration, 0);
}

function readReminderSettings(): ReminderSettings {
  const config = remindersConfig.get();
  return {
    runningAlertEnabled: config?.runningAlertEnabled ?? true,
    runningAlertMinutes: config?.runningAlertMinutes ?? 15,
    noTimerAlertEnabled: config?.noTimerAlertEnabled ?? true,
    noTimerAlertMinutes: config?.noTimerAlertMinutes ?? 30,
  };
}

/**
 * Los dos recordatorios de trabajo, desde cualquier página.
 *
 * La app suele quedar de fondo, así que el canal depende de dónde esté mirando
 * el usuario: con la pestaña de fondo se manda una notificación del sistema (un
 * toast ahí no lo ve nadie), y con la pestaña a la vista un toast con acciones.
 * Sin permiso de notificaciones se cae al toast igual: degradado, pero el aviso
 * no se pierde del todo.
 */
export function useWorkReminder(): void {
  const { isRunning, elapsed, taskName } = useRunningTimer();
  const { toggle: toggleTimer } = useTimerToggle();

  // Valores vivos para que el intervalo los lea sin recrearse: useRunningTimer
  // publica `elapsed` cada segundo.
  const liveRef = useRef({ isRunning, elapsed, taskName });
  liveRef.current = { isRunning, elapsed, taskName };

  const dayRef = useRef<DayContext | null>(null);
  if (dayRef.current === null) dayRef.current = readDayContext();
  const workedRef = useRef(0);
  const firedRef = useRef({ running: 0, noTimer: 0 });

  const handleStop = useCallback(async () => {
    const result = await stopRunningTimer();

    if (result.action === 'stopped') {
      toast.success(`Timer detenido: ${result.taskName}`);
      return;
    }
    if (result.action === 'blocked-midnight') {
      toast.warning('El timer cruzó medianoche. Resolvé el corte en Mi TimeTracker.');
      return;
    }
    toast.info('El timer ya no estaba corriendo.');
  }, []);

  const remind = useCallback(
    async (kind: ReminderKind, context: ReminderContext) => {
      const { title, body, tag } = buildReminderMessage(kind, context);

      if (document.visibilityState === 'hidden') {
        const shown = await showReminderNotification({ title, body, tag });
        if (shown) return;
      }

      if (kind === 'running') {
        toast(title, {
          description: body,
          duration: TOAST_MS,
          action: { label: 'Detener ahora', onClick: () => void handleStop() },
        });
        return;
      }

      toast(title, {
        description: body,
        duration: TOAST_MS,
        action: {
          label: 'Iniciar con la última tarea',
          onClick: () => {
            // El toast vive 15 s: si el timer arrancó mientras tanto, no lo pare.
            if (liveRef.current.isRunning) return;
            void toggleTimer();
          },
        },
      });
    },
    [handleStop, toggleTimer],
  );

  useEffect(() => {
    let cancelled = false;
    let ready = false;

    const refresh = async () => {
      const day = readDayContext();
      if (cancelled) return;
      dayRef.current = day;

      try {
        workedRef.current = await readTodayWorkedSeconds(day.date);
      } catch (error) {
        console.error('Error reading today totals for reminders:', error);
      }

      if (cancelled) return;
      ready = true;
    };

    const evaluate = () => {
      if (cancelled || !ready) return;

      const day = dayRef.current;
      if (!day) return;

      const live = liveRef.current;
      const context: ReminderContext = {
        now: Date.now(),
        isRunning: live.isRunning,
        taskName: live.taskName,
        elapsedSeconds: live.elapsed,
        workdayStartMinutes: day.startMinutes,
        todayWorkedSeconds: workedRef.current,
        todayTargetSeconds: day.targetSeconds,
      };

      const progress = evaluateReminders(context, readReminderSettings());

      const running = advanceFired(firedRef.current.running, progress.runningStep);
      firedRef.current.running = running.fired;
      if (running.fire) void remind('running', context);

      const noTimer = advanceFired(firedRef.current.noTimer, progress.noTimerStep);
      firedRef.current.noTimer = noTimer.fired;
      if (noTimer.fire) void remind('no-timer', context);
    };

    void refresh().then(() => evaluate());

    const tick = setInterval(evaluate, TICK_MS);
    const refreshTick = setInterval(() => void refresh(), REFRESH_MS);
    // Al volver a la pestaña el aviso puede estar vencido: se reevalúa ya.
    document.addEventListener('visibilitychange', evaluate);

    return () => {
      cancelled = true;
      clearInterval(tick);
      clearInterval(refreshTick);
      document.removeEventListener('visibilitychange', evaluate);
    };
  }, [remind]);
}
