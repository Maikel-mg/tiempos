import { useEffect, useRef, useState } from 'react';
import { shouldInterceptTableKeys } from '@/lib/keyboard-utils';
import { SHORTCUT_PRIORITY, bareKey, normalizeKey, registerShortcut } from '@/lib/keyboard/shortcutDispatcher';
import type { TimeEntry } from '@/features/time-tracker/types';

interface UseEntryKeyboardNavigationParams {
  /** Registros de tiempo en el orden en que se ven, sin el Timer activo. */
  items: TimeEntry[];
  isEnabled: boolean;
}

/**
 * Navegación por teclado entre los Registros de tiempo del día visible.
 *
 *   ↑ / ↓      anterior / siguiente
 *   Home / End primero / último
 *   Esc        quita la selección
 *
 * Sólo se registra en modo día: en modo semana las flechas mueven el período.
 */
export function useEntryKeyboardNavigation({ items, isEnabled }: UseEntryKeyboardNavigationParams) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Al cambiar de día no queda nada activo.
  const idsKey = items.map((item) => item.id).join('|');
  useEffect(() => {
    setActiveIndex(-1);
  }, [idsKey]);

  useEffect(() => {
    if (!isEnabled) return;
    return registerShortcut({
      id: 'agenda.entry-navigation',
      priority: SHORTCUT_PRIORITY.table,
      when: () => shouldInterceptTableKeys(),
      match: bareKey('arrowup', 'arrowdown', 'home', 'end', 'escape'),
      run: (event) => {
        const total = itemsRef.current.length;
        if (total === 0) return;
        const key = normalizeKey(event);
        const current = activeIndexRef.current;

        if (key === 'escape') {
          setActiveIndex(-1);
          return;
        }
        if (key === 'home') {
          setActiveIndex(0);
          return;
        }
        if (key === 'end') {
          setActiveIndex(total - 1);
          return;
        }
        if (current === -1) {
          setActiveIndex(0);
          return;
        }
        setActiveIndex(key === 'arrowdown' ? Math.min(total - 1, current + 1) : Math.max(0, current - 1));
      },
    });
  }, [isEnabled]);

  // Mantener a la vista el Registro de tiempo activo.
  useEffect(() => {
    if (activeIndex < 0) return;
    const element = document.querySelector<HTMLElement>('[data-plan-active="true"]');
    // jsdom no implementa scrollIntoView.
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const activeEntry = activeIndex >= 0 ? (items[activeIndex] ?? null) : null;
  return { activeEntry, activeEntryId: activeEntry?.id };
}
