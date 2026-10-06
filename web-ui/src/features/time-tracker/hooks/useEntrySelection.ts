import { useCallback, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';

export interface UseEntrySelectionReturn {
  /** Ids de los Registros seleccionados en la lista. */
  selectedIds: Set<string>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  /** Contenedor de la tabla; lo consume la navegación por teclado. */
  tableRef: RefObject<HTMLTableElement>;
  /** Quita de la selección un Registro eliminado. */
  handleEntryDeleted: (id: string) => void;
}

/**
 * Selección de filas del time tracker: los ids seleccionados, el contenedor de la
 * tabla y la limpieza de la selección cuando se elimina un Registro.
 *
 * Sólo es estado + una limpieza; la navegación por teclado no vive aquí sino en
 * `useEntryTableNavigation`. El comportamiento es el mismo que tenía la página.
 */
export function useEntrySelection(): UseEntrySelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const tableRef = useRef<HTMLTableElement>(null);

  /** Limpia de la selección el Registro eliminado. */
  const handleEntryDeleted = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  return { selectedIds, setSelectedIds, tableRef, handleEntryDeleted };
}
