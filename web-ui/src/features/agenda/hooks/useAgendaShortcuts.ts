import { useEffect, useRef } from 'react';
import { shouldInterceptTableKeys } from '@/lib/keyboard-utils';
import { SHORTCUT_PRIORITY, bareKey, normalizeKey, registerShortcut } from '@/lib/keyboard/shortcutDispatcher';

export interface AgendaShortcutHandlers {
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleMode: () => void;
  onNew: () => void;
}

/**
 * Atajos de período de la Agenda, iguales en los dos modos:
 *
 *   ← / →  período anterior / siguiente (día en modo día, semana en modo semana)
 *   T      hoy
 *   W      alterna día / semana
 *   N      nuevo Registro de tiempo al final del día visible
 *
 * Registrados en el despachador central del proyecto, con prioridad de tabla y
 * sin dispararse mientras se escribe en un campo ni con un diálogo abierto.
 */
export function useAgendaShortcuts(handlers: AgendaShortcutHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    return registerShortcut({
      id: 'agenda.period',
      priority: SHORTCUT_PRIORITY.table,
      when: () => shouldInterceptTableKeys(),
      match: bareKey('arrowleft', 'arrowright', 't', 'w', 'n'),
      run: (event) => {
        const current = handlersRef.current;
        switch (normalizeKey(event)) {
          case 'arrowleft':
            current.onPrev();
            return;
          case 'arrowright':
            current.onNext();
            return;
          case 't':
            current.onToday();
            return;
          case 'w':
            current.onToggleMode();
            return;
          case 'n':
            current.onNew();
        }
      },
    });
  }, []);
}
