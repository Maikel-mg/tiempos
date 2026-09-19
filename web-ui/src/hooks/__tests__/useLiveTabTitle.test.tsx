import 'fake-indexeddb/auto';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveTabTitle } from '../useLiveTabTitle';
import { runningTimer } from '@/features/time-tracker/lib/runningTimer';
import type { TimerState } from '@/features/time-tracker/types';

const BASE_TITLE = 'Importador de Tiempos';
const BASE_FAVICON = '/vite.svg';

function makeRunningState(startTimeMs: number, taskName: string): TimerState {
  return {
    isRunning: true,
    taskId: 1,
    taskName,
    startTime: new Date(startTimeMs).toISOString(),
    elapsed: 0,
  };
}

function iconHref(): string | null {
  return document.querySelector('link[rel="icon"]')?.getAttribute('href') ?? null;
}

describe('useLiveTabTitle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.head.innerHTML = `<link rel="icon" type="image/svg+xml" href="${BASE_FAVICON}" />`;
    document.title = BASE_TITLE;
    runningTimer.stop();
  });

  afterEach(() => {
    // Unmount before touching the global store, otherwise the emission would
    // update a still-mounted hook outside act().
    cleanup();
    runningTimer.stop();
    vi.useRealTimers();
  });

  it('leaves the title and favicon untouched while stopped', () => {
    renderHook(() => useLiveTabTitle());

    expect(document.title).toBe(BASE_TITLE);
    expect(iconHref()).toBe(BASE_FAVICON);
  });

  it('shows elapsed time and a live favicon while running, then ticks', () => {
    renderHook(() => useLiveTabTitle());

    act(() => {
      runningTimer.start(makeRunningState(Date.now() - 90_000, 'Revisar informes'));
    });

    expect(document.title).toBe('00:01:30 · Revisar informes');
    expect(iconHref()).toContain('data:image/svg+xml');

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(document.title).toBe('00:01:32 · Revisar informes');
  });

  it('restores the base title and favicon when the timer stops', () => {
    renderHook(() => useLiveTabTitle());

    act(() => {
      runningTimer.start(makeRunningState(Date.now(), 'Tarea'));
    });
    expect(document.title).not.toBe(BASE_TITLE);

    act(() => {
      runningTimer.stop();
    });

    expect(document.title).toBe(BASE_TITLE);
    expect(iconHref()).toBe(BASE_FAVICON);
  });

  it('restores the base title and favicon on unmount', () => {
    const { unmount } = renderHook(() => useLiveTabTitle());

    act(() => {
      runningTimer.start(makeRunningState(Date.now(), 'Tarea'));
    });

    unmount();

    expect(document.title).toBe(BASE_TITLE);
    expect(iconHref()).toBe(BASE_FAVICON);
  });

  it('truncates very long task names', () => {
    renderHook(() => useLiveTabTitle());

    act(() => {
      runningTimer.start(makeRunningState(Date.now(), 'A'.repeat(80)));
    });

    const title = document.title;
    expect(title).toContain('00:00:00 · ');
    expect(title.endsWith('…')).toBe(true);
    expect(title.length).toBeLessThan(80);
  });
});
