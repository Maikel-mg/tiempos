import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEntryActionShortcuts } from '../useEntryActionShortcuts';
import type { TimeEntry } from '@/features/time-tracker/types';

function entry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'a',
    taskId: 1,
    taskName: 'Clasificador',
    proceso: { proceso: 1, nombre: 'Clasificador' },
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '11:00',
    duration: 7200,
    synced: false,
    ...overrides,
  } as TimeEntry;
}

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
}

function setup(activeEntry: TimeEntry | null, isEnabled = true) {
  const actions = {
    onEdit: vi.fn(),
    onPlay: vi.fn(),
    onDuplicate: vi.fn(),
    onSplit: vi.fn(),
    onSync: vi.fn(),
    onDelete: vi.fn(),
  };
  renderHook(() => useEntryActionShortcuts({ activeEntry, actions, isEnabled }));
  return actions;
}

describe('useEntryActionShortcuts', () => {
  beforeEach(() => {
    document.body.focus();
    vi.restoreAllMocks();
  });

  it('E y Enter editan, D duplica y R hace play', () => {
    const actions = setup(entry());

    press('e');
    press('Enter');
    press('d');
    press('r');

    expect(actions.onEdit).toHaveBeenCalledTimes(2);
    expect(actions.onDuplicate).toHaveBeenCalledTimes(1);
    expect(actions.onPlay).toHaveBeenCalledTimes(1);
  });

  it('G guarda solo si está pendiente de sincronizar', () => {
    const pending = setup(entry());
    press('g');
    expect(pending.onSync).toHaveBeenCalledTimes(1);
  });

  it('G no hace nada sobre un Registro de tiempo sincronizado', () => {
    const synced = setup(entry({ synced: true }));

    press('g');

    expect(synced.onSync).not.toHaveBeenCalled();
  });

  it('S divide cuando la regla lo permite', () => {
    const actions = setup(entry());

    press('s');

    expect(actions.onSplit).toHaveBeenCalledTimes(1);
  });

  it('S no divide un Registro de tiempo de menos de dos minutos', () => {
    const actions = setup(entry({ startTime: '09:00', endTime: '09:01', duration: 60 }));

    press('s');

    expect(actions.onSplit).not.toHaveBeenCalled();
  });

  it('Supr pide confirmación y borra', () => {
    const actions = setup(entry());
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    press('Delete');

    expect(actions.onDelete).toHaveBeenCalledWith('a');
  });

  it('sin entrada activa no hace nada', () => {
    const actions = setup(null);

    press('e');
    press('d');

    expect(actions.onEdit).not.toHaveBeenCalled();
    expect(actions.onDuplicate).not.toHaveBeenCalled();
  });

  it('desactivada no responde', () => {
    const actions = setup(entry(), false);

    press('e');

    expect(actions.onEdit).not.toHaveBeenCalled();
  });
});
