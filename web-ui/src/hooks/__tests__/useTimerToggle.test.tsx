import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { toggleTimer } from '@/features/time-tracker/lib/timerActions';
import { useTimerToggle } from '../useTimerToggle';

vi.mock('@/features/time-tracker/lib/timerActions', () => ({
  toggleTimer: vi.fn(),
  hydrateFromStorage: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

async function runToggle() {
  const { result } = renderHook(() => useTimerToggle());
  await act(async () => {
    await result.current.toggle();
  });
}

describe('useTimerToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports a started timer', async () => {
    vi.mocked(toggleTimer).mockResolvedValue({ action: 'started', taskName: 'Tarea' });

    await runToggle();

    expect(toast.success).toHaveBeenCalledWith('Timer iniciado: Tarea');
  });

  it('reports a stopped timer', async () => {
    vi.mocked(toggleTimer).mockResolvedValue({ action: 'stopped', taskName: 'Tarea' });

    await runToggle();

    expect(toast.success).toHaveBeenCalledWith('Timer detenido: Tarea');
  });

  it('explains when there is no previous task', async () => {
    vi.mocked(toggleTimer).mockResolvedValue({ action: 'no-previous-task' });

    await runToggle();

    expect(toast.info).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('warns when the stop would cross midnight', async () => {
    vi.mocked(toggleTimer).mockResolvedValue({ action: 'blocked-midnight', taskName: 'Nocturna' });

    await runToggle();

    expect(toast.warning).toHaveBeenCalled();
  });

  it('reports a failure', async () => {
    vi.mocked(toggleTimer).mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await runToggle();

    expect(toast.error).toHaveBeenCalled();
  });
});
