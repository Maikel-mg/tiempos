import { useEffect, useRef } from 'react';
import { shouldInterceptTableKeys } from '@/lib/keyboard-utils';
import { SHORTCUT_PRIORITY, bareKey, normalizeKey, registerShortcut } from '@/lib/keyboard/shortcutDispatcher';
import { splitAffordance } from '@/features/time-tracker/lib/splitEntry';
import type { EntryActions } from '../types';
import type { TimeEntry } from '@/features/time-tracker/types';

interface UseEntryActionShortcutsParams {
  activeEntry: TimeEntry | null;
  actions: EntryActions;
  isEnabled: boolean;
}

/**
 * Letras de acción sobre el Registro de tiempo activo del día.
 *
 *   E / Enter  editar
 *   D          duplicar
 *   R          play
 *   G          guardar = sincronizar
 *   S          dividir
 *   Supr       eliminar (con confirmación)
 *
 * Sincronizar no hace nada sobre un Registro de tiempo ya sincronizado y dividir
 * respeta las mismas reglas que el menú.
 */
export function useEntryActionShortcuts({ activeEntry, actions, isEnabled }: UseEntryActionShortcutsParams) {
  const activeRef = useRef(activeEntry);
  activeRef.current = activeEntry;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const enabledRef = useRef(isEnabled);
  enabledRef.current = isEnabled;

  useEffect(() => {
    return registerShortcut({
      id: 'agenda.entry-actions',
      priority: SHORTCUT_PRIORITY.table,
      when: () => enabledRef.current && activeRef.current !== null && shouldInterceptTableKeys(),
      match: bareKey('enter', 'e', 'd', 'r', 'g', 's', 'delete'),
      run: (event) => {
        const entry = activeRef.current;
        if (!entry) return;
        const current = actionsRef.current;

        switch (normalizeKey(event)) {
          case 'enter':
          case 'e':
            current.onEdit?.(entry);
            return;
          case 'd':
            current.onDuplicate?.(entry);
            return;
          case 'r':
            current.onPlay?.(entry);
            return;
          case 'g':
            if (!entry.synced) current.onSync?.(entry);
            return;
          case 's': {
            const split = splitAffordance(entry);
            if (split.visible && split.enabled) current.onSplit?.(entry);
            return;
          }
          case 'delete':
            if (!entry.synced && window.confirm(`¿Eliminar "${entry.taskName}"?`)) {
              current.onDelete?.(entry.id);
            }
        }
      },
    });
  }, []);
}
