import { fechaToYMD, toHHMM } from '../shared/date-helpers';

export interface TimeEntry {
  id: string;
  taskId: number;
  taskName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  description?: string;
  synced: boolean;
}

export interface ClassificationResult {
  willInsert: TimeEntry[];
  alreadyExists: TimeEntry[];
}

export function classifyEntries(
  entries: TimeEntry[],
  dbRows: Array<{ Fecha: string; Desde: string; Hasta: string; IdProceso?: number; Proceso?: number }>
): ClassificationResult {
  const alreadyExists: TimeEntry[] = [];
  const willInsert: TimeEntry[] = [];

  for (const entry of entries) {
    const entryDate = entry.date;
    const entryStart = toHHMM(entry.startTime);
    const entryEnd = toHHMM(entry.endTime);

    const matched = dbRows.some((row) => {
      const rowDate = fechaToYMD(row.Fecha);
      const rowStart = toHHMM(String(row.Desde));
      const rowEnd = toHHMM(String(row.Hasta));
      const rowProcess = row.IdProceso ?? row.Proceso;

      return (
        rowDate === entryDate &&
        rowStart === entryStart &&
        rowEnd === entryEnd &&
        rowProcess === entry.taskId
      );
    });

    if (matched) {
      alreadyExists.push(entry);
    } else {
      willInsert.push(entry);
    }
  }

  return { willInsert, alreadyExists };
}
