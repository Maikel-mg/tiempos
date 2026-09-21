import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { showReminderNotification } from '@/lib/notifications';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import { getDailyTarget, getWorkdayStart } from '@/features/time-tracker/lib/schedule';
import { useWorkReminder } from '../useWorkReminder';

/** Vista viva del timer, para poder cambiarla entre evaluaciones. */
const running = { isRunning: false, elapsed: 0, taskName: '' };

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/lib/notifications', () => ({
  showReminderNotification: vi.fn(),
}));

vi.mock('@/lib/storage/IndexedDBStorage', () => ({
  indexedDBStorage: { getEntriesByDateRange: vi.fn() },
}));

vi.mock('@/features/time-tracker/lib/schedule', () => ({
  getWorkdayStart: vi.fn(),
  getDailyTarget: vi.fn(),
}));

vi.mock('@/features/time-tracker/lib/timerActions', () => ({
  stopRunningTimer: vi.fn(),
}));

vi.mock('@/hooks/useTimerToggle', () => ({
  useTimerToggle: () => ({ toggle: vi.fn() }),
}));

vi.mock('@/hooks/useRunningTimer', () => ({
  useRunningTimer: () => running,
}));

const WORKDAY_START = 9 * 60;
const TICK_MS = 30_000;

function setVisibility(value: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => value,
  });
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

/** Monta el hook y espera a la lectura inicial de IndexedDB. */
async function mountReminder() {
  const view = renderHook(() => useWorkReminder());
  await flush();
  return view;
}

async function tick(): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(TICK_MS);
  });
  await flush();
}

describe('useWorkReminder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Lunes 10:00: 60 minutos después de la hora de entrada.
    vi.setSystemTime(new Date(2026, 8, 21, 10, 0, 0));

    running.isRunning = false;
    running.elapsed = 0;
    running.taskName = '';

    vi.mocked(getWorkdayStart).mockReturnValue(WORKDAY_START);
    vi.mocked(getDailyTarget).mockReturnValue(8.25);
    vi.mocked(indexedDBStorage.getEntriesByDateRange).mockResolvedValue([]);
    vi.mocked(showReminderNotification).mockResolvedValue(true);
    setVisibility('visible');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('nudges about the missing timer when the workday has started', async () => {
    await mountReminder();

    expect(toast).toHaveBeenCalledWith(
      'No arrancaste el timer',
      expect.objectContaining({ description: 'No hay ningún timer corriendo desde las 09:00.' }),
    );
  });

  it('uses a system notification instead of a toast when the tab is hidden', async () => {
    setVisibility('hidden');

    await mountReminder();

    expect(showReminderNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'No arrancaste el timer', tag: 'timer-not-started' }),
    );
    expect(toast).not.toHaveBeenCalled();
  });

  it('falls back to the toast when the notification could not be shown', async () => {
    setVisibility('hidden');
    vi.mocked(showReminderNotification).mockResolvedValue(false);

    await mountReminder();

    expect(toast).toHaveBeenCalledWith('No arrancaste el timer', expect.anything());
  });

  it('stays quiet once the day target is met', async () => {
    vi.mocked(indexedDBStorage.getEntriesByDateRange).mockResolvedValue([
      {
        id: 'e1',
        taskId: 1,
        taskName: 'Desarrollo',
        proceso: { proceso: 1, nombre: 'Desarrollo' },
        date: '2026-09-21',
        startTime: '09:00',
        endTime: '17:00',
        duration: 8.25 * 3600,
        createdAt: '2026-09-21T09:00:00Z',
        updatedAt: '2026-09-21T17:00:00Z',
        synced: false,
      },
    ]);

    await mountReminder();

    expect(toast).not.toHaveBeenCalled();
    expect(showReminderNotification).not.toHaveBeenCalled();
  });

  it('checks in when the running timer passes the threshold', async () => {
    running.isRunning = true;
    running.elapsed = 15 * 60;
    running.taskName = 'Desarrollo';

    await mountReminder();

    expect(toast).toHaveBeenCalledWith(
      '¿Sigue en curso el timer?',
      expect.objectContaining({ description: '«Desarrollo» lleva 15m corriendo.' }),
    );
  });

  it('does not repeat the same step on every tick', async () => {
    await mountReminder();
    await tick();
    await tick();

    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('fires again when the timer reaches the next multiple', async () => {
    running.isRunning = true;
    running.elapsed = 15 * 60;
    running.taskName = 'Desarrollo';

    const view = await mountReminder();
    expect(toast).toHaveBeenCalledTimes(1);

    running.elapsed = 30 * 60;
    view.rerender();
    await tick();

    expect(toast).toHaveBeenCalledTimes(2);
  });

  it('fires again for a new timer session after a stop', async () => {
    // 09:10: el aviso de "sin timer" todavía no corresponde, así que este test
    // sólo mira la regla del timer corriendo.
    vi.setSystemTime(new Date(2026, 8, 21, 9, 10, 0));

    running.isRunning = true;
    running.elapsed = 15 * 60;
    running.taskName = 'Desarrollo';

    const view = await mountReminder();
    expect(toast).toHaveBeenCalledTimes(1);

    // El timer se para: la regla deja de aplicar y el contador vuelve a cero.
    running.isRunning = false;
    view.rerender();
    await tick();

    // Sesión nueva que vuelve a cruzar el umbral.
    running.isRunning = true;
    running.elapsed = 15 * 60;
    view.rerender();
    await tick();

    expect(toast).toHaveBeenCalledTimes(2);
  });

  it('nudges about the missing timer once a running timer is stopped', async () => {
    running.isRunning = true;
    running.elapsed = 15 * 60;
    running.taskName = 'Desarrollo';

    const view = await mountReminder();

    // Con el timer corriendo este aviso no aplica.
    expect(toast).not.toHaveBeenCalledWith('No arrancaste el timer', expect.anything());

    running.isRunning = false;
    view.rerender();
    await tick();

    expect(toast).toHaveBeenCalledWith('No arrancaste el timer', expect.anything());
  });

  it('does not evaluate before the first read of the day is done', async () => {
    const view = renderHook(() => useWorkReminder());

    // Sin dejar resolver la lectura de IndexedDB todavía no hay veredicto.
    expect(toast).not.toHaveBeenCalled();

    await flush();
    expect(toast).toHaveBeenCalledTimes(1);

    view.unmount();
  });
});
