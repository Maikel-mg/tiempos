import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { entryToNewEntryInput } from '../lib/newEntryInput';
import type { TimeEntryFormData } from '../components/TimeEntryEditorDialog';
import type { NewEntryInput, TimeEntry } from '../types';

export interface UseEntryEditorParams {
  /** Registros actuales; se usan para resolver el que se elimina. */
  entries: TimeEntry[];
  createEntry: (data: NewEntryInput) => Promise<TimeEntry>;
  updateEntry: (id: string, data: Partial<TimeEntry>) => Promise<TimeEntry | null>;
  deleteEntry: (id: string) => Promise<void>;
  /** Notifica el borrado para que la página limpie su propia selección. */
  onEntryDeleted?: (id: string) => void;
}

/**
 * Editor de registros y CRUD de Registros de tiempo: estado de apertura, Registro
 * en edición, crear/editar/duplicar/borrar, submit del editor y deshacer el borrado.
 *
 * Deliberadamente **no** conoce el Timer activo (ADR 0002): abrir, guardar o
 * cancelar el editor no detiene, reemplaza ni modifica el timer. La selección de
 * filas tampoco vive aquí; el borrado la limpia a través de `onEntryDeleted`.
 */
export function useEntryEditor({
  entries,
  createEntry,
  updateEntry,
  deleteEntry,
  onEntryDeleted,
}: UseEntryEditorParams) {
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  /** Abre el editor para modificar un Registro existente. */
  const openEdit = useCallback((entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditorOpen(true);
  }, []);

  /** Abre el editor vacío para crear un Registro manual. */
  const openCreate = useCallback(() => {
    setEditingEntry(null);
    setEditorOpen(true);
  }, []);

  /** Cierra el editor y descarta el Registro en edición. */
  const close = useCallback(() => {
    setEditorOpen(false);
    setEditingEntry(null);
  }, []);

  /** Gestiona el ciclo abierto/cerrado que emite el diálogo (Escape, X, submit). */
  const handleOpenChange = useCallback((open: boolean) => {
    setEditorOpen(open);
    if (!open) setEditingEntry(null);
  }, []);

  /** Crea o actualiza según haya Registro en edición, y cierra el editor. */
  const submit = useCallback(
    async (data: TimeEntryFormData) => {
      if (editingEntry) {
        await updateEntry(editingEntry.id, data);
      } else {
        await createEntry(data);
      }
      setEditingEntry(null);
    },
    [editingEntry, updateEntry, createEntry],
  );

  /** Da de alta un Registro sin pasar por el editor (barra del timer). */
  const create = useCallback(
    async (data: TimeEntryFormData) => {
      await createEntry(data);
    },
    [createEntry],
  );

  /** Duplica un Registro: crea una copia editable con los mismos datos. */
  const duplicate = useCallback(
    async (entry: TimeEntry) => {
      await createEntry(entryToNewEntryInput(entry));
      toast.success('Entrada duplicada');
    },
    [createEntry],
  );

  /** Elimina un Registro con opción de deshacer. */
  const remove = useCallback(
    async (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;

      await deleteEntry(id);
      onEntryDeleted?.(id);

      if (editingEntry?.id === id) {
        setEditingEntry(null);
      }

      toast('Entrada eliminada', {
        action: {
          label: 'Deshacer',
          onClick: async () => {
            await createEntry(entryToNewEntryInput(entry));
            toast.success('Entrada restaurada');
          },
        },
      });
    },
    [entries, deleteEntry, onEntryDeleted, editingEntry, createEntry],
  );

  return {
    isEditorOpen,
    editingEntry,
    openEdit,
    openCreate,
    close,
    handleOpenChange,
    submit,
    create,
    duplicate,
    remove,
  };
}
