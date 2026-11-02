import { useEffect, useRef } from 'react';
import { shouldInterceptTableKeys } from '@/lib/keyboard-utils';
import { SHORTCUT_PRIORITY, bareKey, normalizeKey, registerShortcut } from '@/lib/keyboard/shortcutDispatcher';

export interface AgendaShortcutHandlers {
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleMode: () => void;
  onNew: () => void;
  /** Rota a la siguiente vista del período. */
  onNextView: () => void;
  /** Elige vista por posición: 1 Calendario, 2 Agenda, 3 Timeline. */
  onSelectView: (position: number) => void;
  /** Lleva el foco al selector de fechas del paginador. */
  onFocusDate: () => void;
  /** Abre la chuleta de atajos. */
  onShowHelp: () => void;
}

/**
 * Atajos de período de la Agenda, iguales en los dos modos:
 *
 *   ← / →  período anterior / siguiente (día en modo día, semana en modo semana)
 *   T      hoy
 *   W      alterna día / semana
 *   N      nuevo Registro de tiempo al final del día visible
 *   V      rota a la siguiente vista del período
 *   1 2 3  elige vista: Calendario, Agenda, Timeline
 *   F      lleva el foco al selector de fechas
 *   ?      chuleta de atajos
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
      match: bareKey('arrowleft', 'arrowright', 't', 'w', 'n', 'v', 'f', '?', '1', '2', '3'),
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
            return;
          case 'v':
            current.onNextView();
            return;
          case '1':
          case '2':
          case '3':
            current.onSelectView(Number(normalizeKey(event)));
            return;
          case 'f':
            current.onFocusDate();
            return;
          case '?':
            current.onShowHelp();
        }
      },
    });
  }, []);
}
