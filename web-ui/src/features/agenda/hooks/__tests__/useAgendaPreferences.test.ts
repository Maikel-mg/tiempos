import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useAgendaPreferences } from '../useAgendaPreferences';

const KEY = 'agenda.preferences';

describe('useAgendaPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('arranca en Agenda y día', () => {
    const { result } = renderHook(() => useAgendaPreferences());

    expect(result.current.view).toBe('agenda');
    expect(result.current.mode).toBe('day');
  });

  it('recuerda la vista y el modo entre montajes', () => {
    const first = renderHook(() => useAgendaPreferences());
    act(() => {
      first.result.current.setView('timeline');
      first.result.current.setMode('week');
    });
    first.unmount();

    const second = renderHook(() => useAgendaPreferences());
    expect(second.result.current.view).toBe('timeline');
    expect(second.result.current.mode).toBe('week');
  });

  it('cae a los valores por defecto si el almacenamiento está corrupto', () => {
    localStorage.setItem(KEY, '{no es json');

    const { result } = renderHook(() => useAgendaPreferences());

    expect(result.current.view).toBe('agenda');
    expect(result.current.mode).toBe('day');
  });

  it('ignora un modo desconocido guardado', () => {
    localStorage.setItem(KEY, JSON.stringify({ view: 'calendar', mode: 'mes' }));

    const { result } = renderHook(() => useAgendaPreferences());

    expect(result.current.view).toBe('calendar');
    expect(result.current.mode).toBe('day');
  });
});
