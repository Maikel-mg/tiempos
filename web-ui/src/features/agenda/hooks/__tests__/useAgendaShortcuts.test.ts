import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAgendaShortcuts } from '../useAgendaShortcuts';

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
}

function setup() {
  const handlers = {
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onToggleMode: vi.fn(),
    onNew: vi.fn(),
    onNextView: vi.fn(),
    onSelectView: vi.fn(),
    onFocusDate: vi.fn(),
    onShowHelp: vi.fn(),
  };
  renderHook(() => useAgendaShortcuts(handlers));
  return handlers;
}

describe('useAgendaShortcuts', () => {
  beforeEach(() => {
    document.body.focus();
  });

  it('las flechas mueven el período', () => {
    const handlers = setup();

    press('ArrowLeft');
    press('ArrowRight');

    expect(handlers.onPrev).toHaveBeenCalledTimes(1);
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
  });

  it('T hoy, W modo, N nuevo y F selector de fechas', () => {
    const handlers = setup();

    press('t');
    press('w');
    press('n');
    press('f');

    expect(handlers.onToday).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleMode).toHaveBeenCalledTimes(1);
    expect(handlers.onNew).toHaveBeenCalledTimes(1);
    expect(handlers.onFocusDate).toHaveBeenCalledTimes(1);
  });

  it('V rota la vista y 1/2/3 la eligen por posición', () => {
    const handlers = setup();

    press('v');
    press('1');
    press('2');
    press('3');

    expect(handlers.onNextView).toHaveBeenCalledTimes(1);
    expect(handlers.onSelectView.mock.calls.map(([position]) => position)).toEqual([1, 2, 3]);
  });

  it('? abre la chuleta', () => {
    const handlers = setup();

    press('?');

    expect(handlers.onShowHelp).toHaveBeenCalledTimes(1);
  });

  it('no dispara nada mientras se escribe en un campo', () => {
    const handlers = setup();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    press('v');
    press('ArrowRight');

    expect(handlers.onNextView).not.toHaveBeenCalled();
    expect(handlers.onNext).not.toHaveBeenCalled();
    input.remove();
    document.body.focus();
  });

  it('ignora las combinaciones con modificador', () => {
    const handlers = setup();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
    });

    expect(handlers.onNextView).not.toHaveBeenCalled();
  });
});
