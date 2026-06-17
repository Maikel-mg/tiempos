import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTableKeyboardNavigation } from '../useTableKeyboardNavigation';
import type { RefObject } from 'react';

// Helper to create a mock container with rows
function createMockContainer(rowCount: number) {
  const container = document.createElement('div');
  for (let i = 0; i < rowCount; i++) {
    const row = document.createElement('tr');
    row.setAttribute('data-row-index', String(i));
    container.appendChild(row);
  }
  document.body.appendChild(container);
  return container;
}

function cleanupContainer(container: HTMLElement) {
  document.body.removeChild(container);
}

describe('useTableKeyboardNavigation', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset focus
    document.body.focus();
  });

  afterEach(() => {
    if (container) cleanupContainer(container);
  });

  const defaultItems = [
    { id: '1', name: 'Row 1' },
    { id: '2', name: 'Row 2' },
    { id: '3', name: 'Row 3' },
  ];

  const getRowId = (item: { id: string }, index: number) => `${item.id}-${index}`;

  it('initializes with activeIndex -1 (no active row)', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    expect(result.current.activeIndex).toBe(-1);
    expect(result.current.activeRowId).toBeNull();
  });

  it('ArrowDown moves to first row from -1', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    expect(result.current.activeIndex).toBe(0);
    expect(result.current.activeRowId).toBe('1-0');
  });

  it('ArrowDown moves to next row', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    // Move to first row
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeIndex).toBe(0);

    // Move to second row
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeIndex).toBe(1);
  });

  it('ArrowDown does not go past last row', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    // Move to last row
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeIndex).toBe(2);

    // ArrowDown again should stay at last
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeIndex).toBe(2);
  });

  it('ArrowUp moves to previous row', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    // Move to second row
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeIndex).toBe(1);

    // Move up
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    expect(result.current.activeIndex).toBe(0);
  });

  it('ArrowUp does not go below 0', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    // Move to first row
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeIndex).toBe(0);

    // ArrowUp should stay at 0
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    expect(result.current.activeIndex).toBe(0);
  });

  it('Home moves to first row', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    // Move to last row
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeIndex).toBe(2);

    // Home
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    });
    expect(result.current.activeIndex).toBe(0);
  });

  it('End moves to last row', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    });
    expect(result.current.activeIndex).toBe(2);
  });

  it('Escape clears active row', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;
    const onEscape = vi.fn();

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
        onEscape,
      })
    );

    // Move to a row
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeIndex).toBe(0);

    // Escape
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.activeIndex).toBe(-1);
    expect(result.current.activeRowId).toBeNull();
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('Enter calls onActivate with the active item', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;
    const onActivate = vi.fn();

    renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
        onActivate,
      })
    );

    // Move to second row
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    // Enter
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    expect(onActivate).toHaveBeenCalledWith(defaultItems[1], 1);
  });

  it('does not intercept keys when shouldInterceptTableKeys returns false', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    // Focus an input inside the container
    const input = document.createElement('input');
    container.appendChild(input);
    input.focus();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    // Should not move — input is focused
    expect(result.current.activeIndex).toBe(-1);
  });

  it('does not intercept keys when dialog is open', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    // Add open dialog
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('data-state', 'open');
    document.body.appendChild(dialog);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    expect(result.current.activeIndex).toBe(-1);

    document.body.removeChild(dialog);
  });

  it('isEnabled=false prevents navigation', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
        isEnabled: false,
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    expect(result.current.activeIndex).toBe(-1);
  });

  it('getRowProps returns correct attributes for active row', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    // Move to first row
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    const props = result.current.getRowProps(0);
    expect(props['data-row-index']).toBe(0);
    expect(props['data-state']).toBe('active');
    expect(props.tabIndex).toBe(0);

    // Non-active row
    const nonActiveProps = result.current.getRowProps(1);
    expect(nonActiveProps['data-state']).toBeUndefined();
    expect(nonActiveProps.tabIndex).toBe(-1);
  });

  it('clearActive resets to -1', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeIndex).toBe(0);

    act(() => {
      result.current.clearActive();
    });
    expect(result.current.activeIndex).toBe(-1);
  });

  it('focusFirst sets activeIndex to 0', () => {
    container = createMockContainer(3);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    act(() => {
      result.current.focusFirst();
    });
    expect(result.current.activeIndex).toBe(0);
  });

  it('skips disabled rows during navigation', () => {
    container = createMockContainer(4);
    // Mark row index 1 as disabled
    const rows = container.querySelectorAll('tr');
    rows[1].setAttribute('aria-disabled', 'true');

    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: defaultItems,
        getRowId,
      })
    );

    // ArrowDown from -1 → should skip row 1 (disabled) and go to row 2
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    // Should land on row 0 (first non-disabled)
    expect(result.current.activeIndex).toBe(0);

    // ArrowDown again → should skip row 1 (disabled) and go to row 2
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeIndex).toBe(2);
  });

  it('handles empty items array', () => {
    container = createMockContainer(0);
    const containerRef = { current: container } as RefObject<HTMLElement>;

    const { result } = renderHook(() =>
      useTableKeyboardNavigation({
        containerRef,
        items: [],
        getRowId,
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.activeIndex).toBe(-1);
  });
});
