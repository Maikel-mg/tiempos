/**
 * Lectura de un fichero de Registros para recuperar historial (por ejemplo, tras
 * perder la base de datos). El fichero no lleva tarea: la elige quien importa.
 */

export interface ImportedEntryInput {
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export type ParsedImport =
  | { ok: true; entries: ImportedEntryInput[]; totalMinutes: number }
  | { ok: false; reason: string };

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Valida y ordena el JSON importado. Acepta un array o `{ entries: [...] }`. */
export function parseImportJson(raw: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'El fichero no es JSON válido' };
  }

  const list = Array.isArray(data) ? data : (data as { entries?: unknown })?.entries;
  if (!Array.isArray(list)) {
    return { ok: false, reason: 'El JSON debe ser un array de registros o { "entries": [ ... ] }' };
  }
  if (list.length === 0) {
    return { ok: false, reason: 'El fichero no tiene registros' };
  }

  const entries: ImportedEntryInput[] = [];
  let totalMinutes = 0;

  for (let i = 0; i < list.length; i++) {
    const item = (list[i] ?? {}) as Record<string, unknown>;
    const n = i + 1;

    if (typeof item.date !== 'string' || !YMD.test(item.date)) {
      return { ok: false, reason: `Registro ${n}: fecha inválida (se espera YYYY-MM-DD)` };
    }
    if (typeof item.startTime !== 'string' || !HHMM.test(item.startTime)) {
      return { ok: false, reason: `Registro ${n}: hora de inicio inválida (se espera HH:MM)` };
    }
    if (typeof item.endTime !== 'string' || !HHMM.test(item.endTime)) {
      return { ok: false, reason: `Registro ${n}: hora de fin inválida (se espera HH:MM)` };
    }

    const minutes = minutesOf(item.endTime) - minutesOf(item.startTime);
    if (minutes <= 0) {
      return { ok: false, reason: `Registro ${n}: la hora de fin debe ser posterior a la de inicio` };
    }

    totalMinutes += minutes;
    entries.push({
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      description:
        typeof item.description === 'string' && item.description.trim()
          ? item.description.trim()
          : undefined,
    });
  }

  entries.sort((a, b) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
  );

  return { ok: true, entries, totalMinutes };
}
