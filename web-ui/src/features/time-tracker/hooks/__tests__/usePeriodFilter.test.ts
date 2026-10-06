import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePeriodFilter } from '../usePeriodFilter';
import type { TimeEntry } from '../../types';

// Fijamos "hoy" a un miércoles para que el rango semanal/mensual sea determinista.
const NOW = new Date(2026, 5, 10, 12, 0, 0); // 2026-06-10 (miércoles)

function makeEntry(id: string, date: string, duration: number, recoverable = false): TimeEntry {
  return {
    id,
    taskId: 100,
    taskName: `Task ${id}`,
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date,
    startTime: '09:00',
    endTime: '10:00',
    duration,
    recoverable,
    createdAt: `${date}T09:00:00Z`,
    updatedAt: `${date}T09:00:00Z`,
    synced: false,
  };
}

const weekA = makeEntry('week-a', '2026-06-09', 3600);
const weekB = makeEntry('week-b', '2026-06-14', 1800);
const monthOnly = makeEntry('month-only', '2026-06-01', 500);
const oldEntry = makeEntry('old', '2026-05-20', 700);
const recoverable = makeEntry('recoverable', '2026-06-09', 999, true);

const ALL_ENTRIES = [weekA, weekB, monthOnly, oldEntry, recoverable];

function renderFilter(entries: TimeEntry[] = ALL_ENTRIES, timerElapsed = 0) {
  return renderHook(() => usePeriodFilter({ entries, timerElapsed }));
}

describe('usePeriodFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('arranca en semana, vista tabla y sin rango personalizado', () => {
    const { result } = renderFilter();

    expect(result.current.period).toBe('week');
    expect(result.current.activeTab).toBe('table');
    expect(result.current.customRange).toBeUndefined();
  });

  it('filtra las entradas al rango de la semana activa', () => {
    const { result } = renderFilter();

    const ids = result.current.filteredByPeriod.map((e) => e.id);
    expect(ids).toEqual(['week-a', 'week-b', 'recoverable']);
  });

  it('considera hoy dentro del rango de la semana', () => {
    const { result } = renderFilter();

    expect(result.current.todayInRange).toBe(true);
  });

  it('suma las entradas no recuperables y el timer cuando hoy entra en el rango', () => {
    const { result } = renderFilter(ALL_ENTRIES, 60);

    // 3600 + 1800 (no recuperables de la semana) + 60 (timer) = 5460
    expect(result.current.periodTotal).toBe(5460);
    expect(result.current.periodTotalDisplay).toBe('01:31:00');
  });

  it('no suma el timer cuando el rango personalizado no incluye hoy', () => {
    const { result } = renderFilter(ALL_ENTRIES, 60);

    act(() => {
      result.current.handlePeriodChange('custom', {
        start: new Date(2026, 4, 1),
        end: new Date(2026, 4, 31),
      });
    });

    expect(result.current.todayInRange).toBe(false);
    // Solo la entrada de mayo (700), sin timer.
    expect(result.current.periodTotal).toBe(700);
  });

  it('cambia a mes y filtra por el mes', () => {
    const { result } = renderFilter();

    act(() => {
      result.current.handlePeriodChange('month');
    });

    expect(result.current.period).toBe('month');
    const ids = result.current.filteredByPeriod.map((e) => e.id);
    expect(ids).toEqual(['week-a', 'week-b', 'month-only', 'recoverable']);
  });

  it('guarda el rango personalizado al cambiar de periodo', () => {
    const { result } = renderFilter();
    const range = { start: new Date(2026, 4, 1), end: new Date(2026, 4, 31) };

    act(() => {
      result.current.handlePeriodChange('custom', range);
    });

    expect(result.current.period).toBe('custom');
    expect(result.current.customRange).toEqual(range);
    expect(result.current.filteredByPeriod.map((e) => e.id)).toEqual(['old']);
  });

  it('conserva el rango personalizado al cambiar a otro periodo sin rango', () => {
    const { result } = renderFilter();
    const range = { start: new Date(2026, 4, 1), end: new Date(2026, 4, 31) };

    act(() => {
      result.current.handlePeriodChange('custom', range);
    });
    act(() => {
      result.current.handlePeriodChange('today');
    });

    expect(result.current.period).toBe('today');
    expect(result.current.customRange).toEqual(range);
  });

  it('expone setActiveTab para cambiar la pestaña activa', () => {
    const { result } = renderFilter();

    act(() => {
      result.current.setActiveTab('grouped');
    });

    expect(result.current.activeTab).toBe('grouped');
  });
});
