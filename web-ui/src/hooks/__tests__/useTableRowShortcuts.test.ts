import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTableRowShortcuts } from '../useTableRowShortcuts';

type Item = { id: string; name: string };

const ACTIVE_ITEM: Item = { id: '1', name: 'Row 1' };

function renderShortcuts(activeItem: Item | null = ACTIVE_ITEM) {
  const onEdit = vi.fn();
  const onDuplicate = vi.fn();
  const onPlay = vi.fn();
  const onSync = vi.fn();
  const onDelete = vi.fn();

  renderHook(() =>
    useTableRowShortcuts<Item>({
      activeItem,
      onEdit,
      onDuplicate,
      onPlay,
      onSync,
      onDelete,
    })
  );

  return { onEdit, onDuplicate, onPlay, onSync, onDelete };
}

function press(key: string, modifiers: KeyboardEventInit = {}) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, ...modifiers }));
  });
}

describe('useTableRowShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.focus();
    // Ensure no dialog/palette guard is active.
    document.querySelectorAll('[role="dialog"][data-state="open"]').forEach((el) => el.remove());
    document.querySelectorAll('[cmdk-dialog]').forEach((el) => el.remove());
  });

  it('runs row actions for bare letter keys', () => {
    const handlers = renderShortcuts();

    press('d');
    press('s');
    press('r');
    press('e');

    expect(handlers.onDuplicate).toHaveBeenCalledTimes(1);
    expect(handlers.onSync).toHaveBeenCalledTimes(1);
    expect(handlers.onPlay).toHaveBeenCalledTimes(1);
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
  });

  it('ignores Alt+letter so Alt+D does not duplicate the active entry', () => {
    const handlers = renderShortcuts();

    press('d', { altKey: true });

    expect(handlers.onDuplicate).not.toHaveBeenCalled();
  });

  it('ignores Ctrl+Shift+S so the global timer toggle does not sync the row', () => {
    const handlers = renderShortcuts();

    press('S', { ctrlKey: true, shiftKey: true });

    expect(handlers.onSync).not.toHaveBeenCalled();
  });

  it('ignores Meta/Cmd+letter combinations', () => {
    const handlers = renderShortcuts();

    press('d', { metaKey: true });
    press('s', { metaKey: true });

    expect(handlers.onDuplicate).not.toHaveBeenCalled();
    expect(handlers.onSync).not.toHaveBeenCalled();
  });

  it('does nothing when there is no active item', () => {
    const handlers = renderShortcuts(null);

    press('d');

    expect(handlers.onDuplicate).not.toHaveBeenCalled();
  });
});
