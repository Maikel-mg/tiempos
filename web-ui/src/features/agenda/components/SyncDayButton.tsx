import { Database } from 'lucide-react';
import type { TimeEntry } from '@/features/time-tracker/types';

interface SyncDayButtonProps {
  entries: TimeEntry[];
  onSyncDay: (ids: string[]) => void;
  label?: string;
}

/**
 * Sincroniza en bloque lo pendiente del día o del período: selecciona los
 * Registros de tiempo con Tarea existente en la base de datos y abre el panel de
 * sincronización. Los de Tarea local quedan fuera y se reportan como bloqueados.
 */
export function SyncDayButton({ entries, onSyncDay, label = 'Sincronizar día' }: SyncDayButtonProps) {
  const pending = entries.filter((entry) => !entry.synced);
  if (pending.length === 0) return null;

  const syncable = pending.filter((entry) => entry.taskId > 0);
  const blocked = pending.length - syncable.length;

  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onSyncDay(syncable.map((entry) => entry.id));
      }}
      title={
        blocked > 0
          ? `${syncable.length} para sincronizar · ${blocked} con Tarea local (bloqueado)`
          : `${pending.length} pendiente(s)`
      }
      className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <Database className="h-3 w-3" />
      {label} ({pending.length})
    </button>
  );
}
