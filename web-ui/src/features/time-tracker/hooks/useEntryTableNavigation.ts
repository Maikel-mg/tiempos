import { useEffect, type RefObject } from 'react';
import {
  useTableKeyboardNavigation,
  type UseTableKeyboardNavigationReturn,
} from '@/hooks/useTableKeyboardNavigation';
import { useTableRowShortcuts } from '@/hooks/useTableRowShortcuts';
import type { TimeTrackerBarHandle } from '../components/TimeTrackerBar';
import type { EntryViewTab, TimeEntry } from '../types';

export interface UseEntryTableNavigationParams {
  /** Contenedor de la tabla; lo aporta `useEntrySelection`. */
  tableRef: RefObject<HTMLTableElement>;
  /** Registros visibles (los del período), en el orden de la tabla. */
  items: TimeEntry[];
  /** Pestaña activa: la navegación sólo opera en la vista de tabla. */
  activeTab: EntryViewTab;
  /** Registro en edición: mientras el editor está abierto no se navega. */
  editingEntry: TimeEntry | null;
  /** Barra del timer: sus atajos no aplican mientras se edita la hora de inicio. */
  trackerBarRef: RefObject<TimeTrackerBarHandle>;
  onEdit: (entry: TimeEntry) => void;
  onDuplicate: (entry: TimeEntry) => void;
  onPlay: (entry: TimeEntry) => void;
  onSync: (entry: TimeEntry) => void;
  /** Elimina el Registro activo; el hook pide confirmación antes. */
  onDelete: (id: string) => void;
}

export interface UseEntryTableNavigationReturn {
  getRowProps: UseTableKeyboardNavigationReturn<TimeEntry>['getRowProps'];
  focusFirst: () => void;
  activeItem: TimeEntry | null;
}

/**
 * Navegación por teclado de la tabla de Registros: la fila activa, los atajos de
 * fila (editar, duplicar, reproducir, sincronizar, borrar) y el auto-foco de la
 * primera fila al montar.
 *
 * Compone los hooks de teclado existentes (`useTableKeyboardNavigation`,
 * `useTableRowShortcuts`); el comportamiento es el mismo que tenía la página.
 */
export function useEntryTableNavigation({
  tableRef,
  items,
  activeTab,
  editingEntry,
  trackerBarRef,
  onEdit,
  onDuplicate,
  onPlay,
  onSync,
  onDelete,
}: UseEntryTableNavigationParams): UseEntryTableNavigationReturn {
  const { getRowProps, focusFirst, activeItem } = useTableKeyboardNavigation({
    containerRef: tableRef,
    items,
    getRowId: (entry) => entry.id,
    isEnabled: activeTab === 'table' && !editingEntry,
  });

  useTableRowShortcuts({
    activeItem,
    onEdit,
    onDuplicate,
    onPlay,
    onSync,
    onDelete: (entry) => {
      if (window.confirm(`¿Eliminar "${entry.taskName}"?`)) {
        onDelete(entry.id);
      }
    },
    isEnabled: () => activeTab === 'table' && !editingEntry && !trackerBarRef.current?.isEditingStartTime,
  });

  // Auto-foco de la primera fila al montar (sólo en la vista de tabla).
  useEffect(() => {
    if (activeTab !== 'table') return;
    if (items.length === 0) return;
    if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'TEXTAREA' ||
      document.activeElement.tagName === 'SELECT' ||
      document.activeElement.getAttribute('contenteditable') === 'true'
    )) return;
    if (document.querySelector('[role="dialog"][data-state="open"]')) return;
    if (document.querySelector('[cmdk-dialog]')) return;
    focusFirst();
  }, [activeTab, items.length, focusFirst]);

  return { getRowProps, focusFirst, activeItem };
}
