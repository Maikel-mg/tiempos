import { useEffect, useRef } from 'react';
import { shouldInterceptTableKeys } from '@/lib/keyboard-utils';

interface UseTableRowShortcutsOptions<T> {
  activeItem: T | null;
  onEdit: (item: T) => void;
  onDuplicate: (item: T) => void;
  onPlay: (item: T) => void;
  onSync: (item: T) => void;
  onDelete: (item: T) => void;
  isEnabled?: boolean | (() => boolean);
}

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
    const handleKeyDown = (e: KeyboardEvent) => {
      const enabled = typeof isEnabledRef.current === 'function'
        ? isEnabledRef.current()
        : isEnabledRef.current;
      if (!enabled) return;

      const item = activeItemRef.current;
      if (!item) return;
      if (!shouldInterceptTableKeys()) return;

      const key = e.key;

      if (key === 'Enter' || key === 'e' || key === 'E') {
        e.preventDefault();
        onEditRef.current(item);
        return;
      }

      if (key === 'd' || key === 'D') {
        e.preventDefault();
        onDuplicateRef.current(item);
        return;
      }

      if (key === 'r' || key === 'R') {
        e.preventDefault();
        onPlayRef.current(item);
        return;
      }

      if (key === 's' || key === 'S') {
        e.preventDefault();
        onSyncRef.current(item);
        return;
      }

      if (key === 'Delete') {
        e.preventDefault();
        onDeleteRef.current(item);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
