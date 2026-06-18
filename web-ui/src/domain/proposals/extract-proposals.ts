import type { TimeEntry } from '../../lib/types';
import { GENERIC_TASK_PATTERN, isGenericTask, parseGenericTask } from './generic-task';

export interface TaskProposal {
  description: string;
  genericTask: string;
  totalHours: number;
  proposedName: string;
  projectCode: string;
  period: string;
  fechaInicio: string;
  fechaFin: string;
  entryCount: number;
  entryIds: string[];
  entries: { id: string; start: string }[];
  clockifyProjectId: string;
}

export { GENERIC_TASK_PATTERN, isGenericTask, parseGenericTask };

function extractProjectCode(entry: TimeEntry): string {
  const projectName = entry.project?.name ?? '';
  const match = projectName.match(/^(\w+)/);
  return match ? match[1] : '';
}

function parseISO8601Duration(iso: string): number {
  const timeMatch = iso.match(/T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!timeMatch) return 0;
  const hours = parseInt(timeMatch[1] ?? '0', 10);
  const minutes = parseInt(timeMatch[2] ?? '0', 10);
  const seconds = parseFloat(timeMatch[3] ?? '0');
  return hours + minutes / 60 + seconds / 3600;
}

function parseDuration(duration: number | string): number {
  if (typeof duration === 'number') {
    return duration / 3600;
  }
  return parseISO8601Duration(duration);
}

function getTaskName(entry: TimeEntry): string {
  return entry.taskName ?? entry.task?.name ?? '';
}

function computeDateRange(entries: TimeEntry[]): { fechaInicio: string; fechaFin: string } {
  const starts = entries.map(e => e.timeInterval.start).sort();
  const ends = entries.map(e => e.timeInterval.end).sort();
  return {
    fechaInicio: starts[0] ?? '',
    fechaFin: ends[ends.length - 1] ?? '',
  };
}

export function extractProposals(
  entries: TimeEntry[],
  thresholdHours: number = 8
): TaskProposal[] {
  const genericEntries = entries.filter(e => isGenericTask(getTaskName(e)));

  const groups = new Map<string, TimeEntry[]>();
  for (const entry of genericEntries) {
    const taskName = getTaskName(entry);
    const key = `${taskName}|||${entry.description}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  const proposals: TaskProposal[] = [];
  for (const [key, groupEntries] of groups) {
    const [genericTask] = key.split('|||');
    const description = groupEntries[0].description;

    const totalHours = groupEntries.reduce(
      (sum, e) => sum + parseDuration(e.timeInterval.duration),
      0
    );

    if (totalHours <= thresholdHours) continue;

    const { projectCode: genericProjectCode, period } = parseGenericTask(genericTask);
    const projectCode = genericProjectCode || extractProjectCode(groupEntries[0]);
    const clockifyProjectId = groupEntries[0].projectId ?? '';
    const { fechaInicio, fechaFin } = computeDateRange(groupEntries);

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
      entryIds: groupEntries.map(e => e._id ?? e.id ?? ''),
      entries: groupEntries.map(e => ({
        id: e._id ?? e.id ?? '',
        start: e.timeInterval.start,
        end: e.timeInterval.end,
        projectId: e.projectId ?? '',
      })),
      clockifyProjectId,
    });
  }

  return proposals;
}
