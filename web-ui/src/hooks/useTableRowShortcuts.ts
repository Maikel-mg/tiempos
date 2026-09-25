import { useEffect, useRef } from 'react';
import { shouldInterceptTableKeys } from '@/lib/keyboard-utils';
import {
  SHORTCUT_PRIORITY,
  bareKey,
  normalizeKey,
  registerShortcut,
} from '@/lib/keyboard/shortcutDispatcher';

interface UseTableRowShortcutsOptions<T> {
  activeItem: T | null;
  onEdit: (item: T) => void;
  onDuplicate: (item: T) => void;
  onPlay: (item: T) => void;
  onSync: (item: T) => void;
  onDelete: (item: T) => void;
  isEnabled?: boolean | (() => boolean);
}

/**
 * Bare-letter shortcuts for the active table row, registered in the central
 * dispatcher:
 * - Enter / E → edit
 * - D → duplicate
 * - R → play
 * - S → sync
 * - Delete → delete
 *
 * Only fires for bare keys (no Ctrl/Cmd/Alt): combinations belong to the global
 * shortcuts, so `Alt+D` navigates instead of duplicating the row.
 */
export function useTableRowShortcuts<T>({
  activeItem,
  onEdit,
  onDuplicate,
  onPlay,
  onSync,
  onDelete,
  isEnabled = true,
}: UseTableRowShortcutsOptions<T>) {
  const activeItemRef = useRef(activeItem);
  activeItemRef.current = activeItem;

  const onEditRef = useRef(onEdit);
  onEditRef.current = onEdit;

  const onDuplicateRef = useRef(onDuplicate);
  onDuplicateRef.current = onDuplicate;

  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;

  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const isEnabledRef = useRef(isEnabled);
  isEnabledRef.current = isEnabled;

  useEffect(() => {
    return registerShortcut({
      id: 'table.row-shortcuts',
      priority: SHORTCUT_PRIORITY.table,
      when: () => {
        const enabled =
          typeof isEnabledRef.current === 'function'
            ? isEnabledRef.current()
            : isEnabledRef.current;
        return enabled && activeItemRef.current != null && shouldInterceptTableKeys();
      },
      match: bareKey('enter', 'e', 'd', 'r', 's', 'delete'),
      run: (e) => {
        const item = activeItemRef.current;
        if (!item) return;

        const key = normalizeKey(e);

        if (key === 'enter' || key === 'e') {
          onEditRef.current(item);
          return;
        }

        if (key === 'd') {
          onDuplicateRef.current(item);
          return;
        }

        if (key === 'r') {
          onPlayRef.current(item);
          return;
        }

        if (key === 's') {
          onSyncRef.current(item);
          return;
        }

        if (key === 'delete') {
          onDeleteRef.current(item);
        }
      },
    });
  }, []);
}
