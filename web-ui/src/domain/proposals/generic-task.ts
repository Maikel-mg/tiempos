/** Patrón de nombrado de Procesos Genéricos: `IPKWEB AAAA-MM. General|Errores` */
export const GENERIC_TASK_PATTERN = /^(?:(\w+)\s+)?(\d{4}-\d{2})\.\s*(General|Errores)$/;

export function isGenericTask(taskName: string): boolean {
  return GENERIC_TASK_PATTERN.test(taskName);
}

export function parseGenericTask(taskName: string): { projectCode: string; period: string } {
  const match = taskName.match(GENERIC_TASK_PATTERN);
  if (!match) return { projectCode: '', period: '' };
  return {
    projectCode: match[1] ?? '',
    period: match[2] ?? '',
  };
}
