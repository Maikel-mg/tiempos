import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useEntryKeyboardNavigation } from '../useEntryKeyboardNavigation';
import type { TimeEntry } from '@/features/time-tracker/types';

function entry(id: string): TimeEntry {
  return {
    id,
    taskId: 1,
    taskName: `Tarea ${id}`,
    proceso: { proceso: 1, nombre: `Tarea ${id}` },
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    synced: false,
  } as TimeEntry;
}

const ITEMS = [entry('a'), entry('b'), entry('c')];

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
}

describe('useEntryKeyboardNavigation', () => {
  beforeEach(() => {
    document.body.focus();
  });

  it('baja, sube y salta a los extremos', () => {
    const { result } = renderHook(() => useEntryKeyboardNavigation({ items: ITEMS, isEnabled: true }));
    expect(result.current.activeEntryId).toBeUndefined();

    press('ArrowDown');
    expect(result.current.activeEntryId).toBe('a');

    press('ArrowDown');
    expect(result.current.activeEntryId).toBe('b');

    press('End');
    expect(result.current.activeEntryId).toBe('c');

    press('ArrowUp');
    expect(result.current.activeEntryId).toBe('b');

    press('Home');
    expect(result.current.activeEntryId).toBe('a');
  });

  it('Esc quita la entrada activa', () => {
    const { result } = renderHook(() => useEntryKeyboardNavigation({ items: ITEMS, isEnabled: true }));

    press('ArrowDown');
    expect(result.current.activeEntry).not.toBeNull();

    press('Escape');
    expect(result.current.activeEntry).toBeNull();
  });

  it('al cambiar la lista no queda nada activo', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useEntryKeyboardNavigation({ items, isEnabled: true }),
      { initialProps: { items: ITEMS } },
    );

    press('ArrowDown');
    expect(result.current.activeEntryId).toBe('a');

    rerender({ items: [entry('z')] });
    expect(result.current.activeEntry).toBeNull();
  });

  it('desactivada no responde a las flechas', () => {
    const { result } = renderHook(() => useEntryKeyboardNavigation({ items: ITEMS, isEnabled: false }));

    press('ArrowDown');

    expect(result.current.activeEntry).toBeNull();
  });
});
