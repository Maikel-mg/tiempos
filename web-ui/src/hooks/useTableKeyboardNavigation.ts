import { useState, useEffect, useCallback, useRef, type RefObject, type RefCallback } from 'react';
import { shouldInterceptTableKeys } from '@/lib/keyboard-utils';

/**
 * Options for the `useTableKeyboardNavigation` hook.
 */
export interface UseTableKeyboardNavigationOptions<TData> {
  /** Ref to the container element wrapping the table rows. */
  containerRef: RefObject<HTMLElement>;
  /** The array of data items rendered as table rows. */
  items: TData[];
  /** Function that returns a stable string ID for each item. */
  getRowId: (item: TData, index: number) => string;
  /** Callback when Enter is pressed on the active row. */
  onActivate?: (item: TData, index: number) => void;
  /** Callback when Escape is pressed. */
  onEscape?: () => void;
  /** Whether keyboard navigation is enabled (default: true). */
  isEnabled?: boolean;
  /** Number of items per page for PageUp/PageDown (default: 10). */
  pageSize?: number;
  /** Callback when PageUp is pressed. */
  onPageUp?: () => void;
  /** Callback when PageDown is pressed. */
  onPageDown?: () => void;
}

/**
 * Return value of the `useTableKeyboardNavigation` hook.
 */
export interface UseTableKeyboardNavigationReturn {
  /** Index of the currently active row, or -1 if none. */
  activeIndex: number;
  /** Stable ID of the currently active row, or null. */
  activeRowId: string | null;
  /** Spread these props onto each `<tr>` element. */
  getRowProps: (index: number) => {
    'data-row-index': number;
    'data-state': 'active' | undefined;
    tabIndex: 0 | -1;
    ref: RefCallback<HTMLElement>;
  };
  /** Focus the first row programmatically. */
  focusFirst: () => void;
  /** Clear the active row. */
  clearActive: () => void;
}

/**
 * Linear-style arrow-key navigation inside a table.
 *
 * Manages a roving tabindex pattern: one row has `tabIndex={0}` and
 * `data-state="active"`; all others have `tabIndex={-1}`.
 *
 * **Keyboard behavior:**
 * - `ArrowDown` / `ArrowUp` — move to next / previous row
 * - `Home` — jump to first row
 * - `End` — jump to last row
 * - `Enter` — trigger `onActivate` callback on the active row
 * - `Escape` — clear active row and trigger `onEscape` callback
 * - `PageUp` / `PageDown` — trigger page callbacks (for virtual scrolling)
 *
 * **Guard conditions:** keys are NOT intercepted when:
 * - The focused element is an editable control (input, textarea, select, contentEditable)
 * - A dialog or command palette is open
 * - `isEnabled` is `false`
 *
 * Rows with `aria-disabled="true"` are skipped during navigation.
 *
 * @example
 * ```tsx
 * const { activeIndex, getRowProps, focusFirst } = useTableKeyboardNavigation({
 *   containerRef,
 *   items: filteredProcesses,
 *   getRowId: (p) => String(p.proceso),
 *   onActivate: (item) => navigate(`/tasks/${item.proceso}`),
 * });
 *
 * return (
 *   <div ref={containerRef} tabIndex={-1} onFocus={focusFirst}>
 *     <table>
 *       <tbody>
 *         {filteredProcesses.map((row, i) => (
 *           <tr key={getRowId(row, i)} {...getRowProps(i)}>
 *             ...
 *           </tr>
 *         ))}
 *       </tbody>
 *     </table>
 *   </div>
 * );
 * ```
 */
export function useTableKeyboardNavigation<TData>({
  containerRef,
  items,
  getRowId,
  onActivate,
  onEscape,
  isEnabled = true,
  pageSize = 10,
  onPageUp,
  onPageDown,
}: UseTableKeyboardNavigationOptions<TData>): UseTableKeyboardNavigationReturn {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  const onPageUpRef = useRef(onPageUp);
  onPageUpRef.current = onPageUp;

  const onPageDownRef = useRef(onPageDown);
  onPageDownRef.current = onPageDown;

  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;

  /**
   * Check if a row at the given index is disabled (aria-disabled="true").
   */
  const isRowDisabled = useCallback((index: number): boolean => {
    const container = containerRef.current;
    if (!container) return false;
    const rows = container.querySelectorAll('tr[data-row-index]');
    const row = rows[index];
    if (!row) return false;
    return row.getAttribute('aria-disabled') === 'true';
  }, [containerRef]);

  /**
   * Find the next non-disabled row in the given direction.
   * Returns -1 if no valid row is found.
   */
  const findNextEnabled = useCallback(
    (from: number, direction: 1 | -1): number => {
      const total = itemsRef.current.length;
      if (total === 0) return -1;

      let next = from + direction;
      // Clamp to bounds
      if (next < 0) next = 0;
      if (next >= total) next = total - 1;

      // If the next row is not disabled, return it
      if (!isRowDisabled(next)) return next;

      // Otherwise, scan in the same direction
      let scanned = 0;
      while (scanned < total) {
        next += direction;
        if (next < 0 || next >= total) return -1;
        if (!isRowDisabled(next)) return next;
        scanned++;
      }
      return -1;
    },
    [isRowDisabled]
  );

  /**
   * Scroll the active row into view.
   */
  const scrollIntoView = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rows = container.querySelectorAll('tr[data-row-index]');
      const row = rows[index];
      if (row && typeof row.scrollIntoView === 'function') {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    },
    [containerRef]
  );

  /**
   * Window keydown handler.
   */
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shouldInterceptTableKeys()) return;

      const total = itemsRef.current.length;
      if (total === 0) return;

      const current = activeIndexRef.current;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          if (current === -1) {
            // Focus first non-disabled row
            const first = findNextEnabled(-1, 1);
            if (first !== -1) {
              setActiveIndex(first);
              scrollIntoView(first);
            }
          } else {
            const next = findNextEnabled(current, 1);
            if (next !== -1 && next !== current) {
              setActiveIndex(next);
              scrollIntoView(next);
            }
          }
          break;
        }

        case 'ArrowUp': {
          e.preventDefault();
          if (current === -1) {
            // Focus last non-disabled row
            const last = findNextEnabled(total, -1);
            if (last !== -1) {
              setActiveIndex(last);
              scrollIntoView(last);
            }
          } else {
            const prev = findNextEnabled(current, -1);
            if (prev !== -1 && prev !== current) {
              setActiveIndex(prev);
              scrollIntoView(prev);
            }
          }
          break;
        }

        case 'Home': {
          e.preventDefault();
          const first = findNextEnabled(-1, 1);
          if (first !== -1) {
            setActiveIndex(first);
            scrollIntoView(first);
          }
          break;
        }

        case 'End': {
          e.preventDefault();
          const last = findNextEnabled(total, -1);
          if (last !== -1) {
            setActiveIndex(last);
            scrollIntoView(last);
          }
          break;
        }

        case 'Enter': {
          if (current >= 0 && current < total) {
            e.preventDefault();
            onActivateRef.current?.(itemsRef.current[current], current);
          }
          break;
        }

        case 'Escape': {
          e.preventDefault();
          setActiveIndex(-1);
          onEscapeRef.current?.();
          break;
        }

        case 'PageUp': {
          e.preventDefault();
          onPageUpRef.current?.();
          break;
        }

        case 'PageDown': {
          e.preventDefault();
          onPageDownRef.current?.();
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, findNextEnabled, scrollIntoView]);

  const activeRowId =
    activeIndex >= 0 && activeIndex < items.length
      ? getRowId(items[activeIndex], activeIndex)
      : null;

  const focusFirst = useCallback(() => {
    const first = findNextEnabled(-1, 1);
    if (first !== -1) {
      setActiveIndex(first);
      scrollIntoView(first);
    }
  }, [findNextEnabled, scrollIntoView]);

  const clearActive = useCallback(() => {
    setActiveIndex(-1);
  }, []);

  const getRowProps = useCallback(
    (index: number) => {
      const isActive = activeIndex === index;
      return {
        'data-row-index': index,
        'data-state': isActive ? ('active' as const) : undefined,
        tabIndex: (isActive ? 0 : -1) as 0 | -1,
        ref: (_el: HTMLElement | null) => {
          // scrollIntoView is handled via the keydown handler
        },
      };
    },
    [activeIndex]
  );

  return {
    activeIndex,
    activeRowId,
    getRowProps,
    focusFirst,
    clearActive,
  };
}
