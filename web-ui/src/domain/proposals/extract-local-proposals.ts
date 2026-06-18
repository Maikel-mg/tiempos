import type { TimeEntry } from '@/features/time-tracker/types';
import type { TaskProposal } from './extract-proposals';
import { isGenericTask, parseGenericTask } from './generic-task';
import { normalizeForMatch } from '@/lib/normalize';

/**
 * Extrae Propuestas de Tarea desde entradas locales del time-tracker.
 *
 * Hermana de `extractProposals` (que opera sobre entradas de Clockify).
 * Esta función opera sobre entradas locales (IndexedDB), donde:
 * - `taskName` es el nombre del Proceso (ej: "IPKWEB 2026-06. Errores")
 * - `description` es texto libre del usuario
 * - `duration` está en SEGUNDOS (no ISO 8601)
 *
 * Agrupa por `proceso genérico + descripción normalizada`, suma horas,
 * y devuelve propuestas para grupos que superan el umbral.
 */
export function extractProposalsFromLocal(
  entries: TimeEntry[],
  thresholdHours: number = 8
): TaskProposal[] {
  // Solo entradas contra Procesos Genéricos
  const genericEntries = entries.filter(e => isGenericTask(e.taskName));

  // Agrupar por proceso genérico + descripción normalizada
  const groups = new Map<string, TimeEntry[]>();
  for (const entry of genericEntries) {
    const key = `${entry.taskName}|||${normalizeForMatch(entry.description ?? '')}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  const proposals: TaskProposal[] = [];
  for (const [key, groupEntries] of groups) {
    const [genericTask] = key.split('|||');
    const description = groupEntries[0].description ?? '';

    // duration local está en segundos → convertir a horas
    const totalHours = groupEntries.reduce(
      (sum, e) => sum + (e.duration / 3600),
      0
    );

    if (totalHours <= thresholdHours) continue;

    const { projectCode, period } = parseGenericTask(genericTask);

    // Rango de fechas desde las entries del grupo
    const dates = groupEntries.map(e => e.date).sort();
    const fechaInicio = dates[0] ?? '';
    const fechaFin = dates[dates.length - 1] ?? '';

    proposals.push({
      description,
      genericTask,
      totalHours,
      proposedName: `${projectCode} ${period}. ${description}`,
      projectCode,
      period,
      fechaInicio,
      fechaFin,
      entryCount: groupEntries.length,
      entryIds: groupEntries.map(e => e.id),
      entries: groupEntries.map(e => ({
        id: e.id,
        start: e.date + 'T' + e.startTime,
        end: e.date + 'T' + e.endTime,
        projectId: '',
      })),
      clockifyProjectId: '', // no aplica para entradas locales
    });
  }

  return proposals;
}
