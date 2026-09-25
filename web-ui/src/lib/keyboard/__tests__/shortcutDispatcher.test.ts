import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SHORTCUT_PRIORITY,
  altKey,
  bareKey,
  clearShortcuts,
  commandKey,
  registerShortcut,
} from '../shortcutDispatcher';

function press(key: string, modifiers: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...modifiers }));
}

describe('shortcut matchers', () => {
  it('bareKey matches bare keys, case-insensitively, and rejects modifiers', () => {
    const match = bareKey('d', 'Enter');

    expect(match(new KeyboardEvent('keydown', { key: 'd' }))).toBe(true);
    expect(match(new KeyboardEvent('keydown', { key: 'D' }))).toBe(true);
    expect(match(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(true);

    expect(match(new KeyboardEvent('keydown', { key: 'd', altKey: true }))).toBe(false);
    expect(match(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }))).toBe(false);
    expect(match(new KeyboardEvent('keydown', { key: 'd', metaKey: true }))).toBe(false);
    expect(match(new KeyboardEvent('keydown', { key: 'x' }))).toBe(false);
  });

  it('commandKey matches Ctrl/Cmd and honors the shift option', () => {
    const toggle = commandKey('s', { shift: true });
    expect(toggle(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(toggle(new KeyboardEvent('keydown', { key: 'S', metaKey: true, shiftKey: true }))).toBe(true);
    expect(toggle(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }))).toBe(false);

    const palette = commandKey('k');
    expect(palette(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))).toBe(true);
    expect(palette(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(palette(new KeyboardEvent('keydown', { key: 'k' }))).toBe(false);
  });

  it('altKey matches Alt-only combinations', () => {
    const nav = altKey('d');
    expect(nav(new KeyboardEvent('keydown', { key: 'd', altKey: true }))).toBe(true);
    expect(nav(new KeyboardEvent('keydown', { key: 'd' }))).toBe(false);
    expect(nav(new KeyboardEvent('keydown', { key: 'd', altKey: true, ctrlKey: true }))).toBe(false);
    expect(nav(new KeyboardEvent('keydown', { key: 'd', altKey: true, shiftKey: true }))).toBe(false);
  });
});

describe('shortcut dispatcher', () => {
  beforeEach(() => {
    clearShortcuts();
    document.body.focus();
  });

  afterEach(() => {
    clearShortcuts();
  });

  it('routes a bare key to the bare-letter shortcut', () => {
    const run = vi.fn();
    registerShortcut({ id: 'row', match: bareKey('d'), run });

    press('d');

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not fire a row shortcut for Alt+letter (regression)', () => {
    const rowRun = vi.fn();
    const navRun = vi.fn();
    registerShortcut({
      id: 'row',
      priority: SHORTCUT_PRIORITY.table,
      match: bareKey('d'),
      run: rowRun,
    });
    registerShortcut({
      id: 'nav',
      priority: SHORTCUT_PRIORITY.global,
      match: altKey('d'),
      run: navRun,
    });

    press('d', { altKey: true });

    expect(navRun).toHaveBeenCalledTimes(1);
    expect(rowRun).not.toHaveBeenCalled();
  });

  it('evaluates higher priority shortcuts first', () => {
    const order: string[] = [];
    registerShortcut({ id: 'low', priority: 1, match: () => true, run: () => order.push('low') });
    registerShortcut({ id: 'high', priority: 100, match: () => true, run: () => order.push('high') });

    press('x');

    expect(order).toEqual(['high']);
  });

  it('skips shortcuts whose when() returns false', () => {
    const run = vi.fn();
    registerShortcut({ id: 'row', when: () => false, match: bareKey('d'), run });

    press('d');

    expect(run).not.toHaveBeenCalled();
  });

  it('lets a non-matching shortcut fall through to the next one', () => {
    const navRun = vi.fn();
    const rowRun = vi.fn();
    registerShortcut({
      id: 'nav',
      priority: SHORTCUT_PRIORITY.global,
      match: altKey('d'),
      run: navRun,
    });
    registerShortcut({
      id: 'row',
      priority: SHORTCUT_PRIORITY.table,
      match: bareKey('d'),
      run: rowRun,
    });

    press('d');

    expect(rowRun).toHaveBeenCalledTimes(1);
    expect(navRun).not.toHaveBeenCalled();
  });

  it('stops handling after unregister', () => {
    const run = vi.fn();
    const off = registerShortcut({ id: 'row', match: bareKey('d'), run });

    off();
    press('d');

    expect(run).not.toHaveBeenCalled();
  });

  it('consumes the matched event (preventDefault)', () => {
    registerShortcut({ id: 'row', match: bareKey('d'), run: vi.fn() });

    const event = new KeyboardEvent('keydown', { key: 'd', cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
