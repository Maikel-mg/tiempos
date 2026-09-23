import type { TimeEntry } from '../types';

/**
 * Regla de negocio de "Dividir" un Registro de tiempo.
 *
 * Módulo puro: no toca almacenamiento, ni reloj, ni generación de identificadores
 * (se inyectan). Devuelve las dos mitades o el motivo por el que no se puede dividir,
 * que es lo que la interfaz usa para deshabilitar la acción con una explicación.
 *
 * La forma del segmento es la misma que usa el detector de cruce de medianoche
 * (fecha, hora de inicio, hora de fin, minutos) para no tener dos vocabularios
 * para lo mismo.
 */

/** Un Registro de menos de dos minutos no se puede dividir. */
export const MIN_SPLIT_MINUTES = 2;

export interface SplitSegment {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  startTime: string;
  /** HH:MM */
  endTime: string;
  /** Minutos completos del segmento */
  minutes: number;
}

export type SplitPlan =
  | { ok: true; segments: [SplitSegment, SplitSegment] }
  | { ok: false; reason: string };

export interface SplitHalves {
  first: TimeEntry;
  second: TimeEntry;
}

/** Lo mínimo que hace falta saber de un Registro —o del Timer activo— para dividirlo. */
export type SplitTarget = Pick<TimeEntry, 'date' | 'startTime' | 'endTime'>;

export interface SplitDeps {
  /** Identificador de la mitad nueva. */
  newId: string;
  /** Marca de tiempo para `createdAt`/`updatedAt` de las mitades. */
  now: string;
}

/** Se aceptan `HH:MM` y `HH:MM:SS`; lo que sobre de precisión se descarta. */
const HHMM = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

function toMinutes(time: string): number | null {
  const match = HHMM.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function toHHMM(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * Decide si un Registro se puede dividir por una hora concreta y, si puede,
 * devuelve la geometría de las dos mitades.
 *
 * Reglas: el corte cae estrictamente dentro del intervalo, la granularidad es el
 * minuto, un Registro de menos de dos minutos no se divide y no hay cortes que
 * crucen la medianoche (el modelo no representa un Registro a caballo entre dos días).
 *
 * Nota: no hace falta comprobar "un minuto a cada lado". Con el corte dentro del
 * intervalo y todo en minutos enteros, que la duración sea de dos minutos o más
 * ya lo garantiza. Si algún día se admite precisión de segundos, esta es la
 * comprobación que hay que añadir.
 */
export function planSplit(target: SplitTarget, cutTime: string): SplitPlan {
  const start = toMinutes(target.startTime);
  const end = toMinutes(target.endTime);

  if (start === null || end === null) {
    return { ok: false, reason: 'El Registro no tiene un horario válido' };
  }
  if (end <= start) {
    return {
      ok: false,
      reason: 'Un Registro que cruza la medianoche no se puede dividir a mano',
    };
  }
  if (end - start < MIN_SPLIT_MINUTES) {
    return {
      ok: false,
      reason: `Un Registro de menos de ${MIN_SPLIT_MINUTES} minutos no se puede dividir`,
    };
  }

  const cut = toMinutes(cutTime);
  if (cut === null) {
    return { ok: false, reason: 'Indica una hora de corte válida (HH:MM)' };
  }
  if (cut <= start || cut >= end) {
    return { ok: false, reason: 'El corte tiene que caer dentro del Registro' };
  }

  const cutHHMM = toHHMM(cut);
  return {
    ok: true,
    segments: [
      {
        date: target.date,
        startTime: toHHMM(start),
        endTime: cutHHMM,
        minutes: cut - start,
      },
      {
        date: target.date,
        startTime: cutHHMM,
        endTime: toHHMM(end),
        minutes: end - cut,
      },
    ],
  };
}

export type SplitAvailability =
  | { splittable: true }
  | { splittable: false; reason: string };

/**
 * ¿Existe algún corte posible en este intervalo? Solo mira la geometría, así que
 * sirve igual para un Registro guardado que para el Timer activo.
 */
export function splitAvailability(
  target: Pick<TimeEntry, 'startTime' | 'endTime'>,
): SplitAvailability {
  const start = toMinutes(target.startTime);
  const end = toMinutes(target.endTime);

  if (start === null || end === null) {
    return { splittable: false, reason: 'El Registro no tiene un horario válido' };
  }
  if (end <= start) {
    return {
      splittable: false,
      reason: 'Un Registro que cruza la medianoche no se puede dividir a mano',
    };
  }
  if (end - start < MIN_SPLIT_MINUTES) {
    return {
      splittable: false,
      reason: `Un Registro de menos de ${MIN_SPLIT_MINUTES} minutos no se puede dividir`,
    };
  }
  return { splittable: true };
}

export type SplitAffordance =
  | { visible: false }
  | { visible: true; enabled: true }
  | { visible: true; enabled: false; reason: string };

/**
 * Qué se puede ofrecer en la interfaz para un Registro concreto.
 *
 * En sincronizados y permisos la acción **ni se muestra** (no está en el alcance).
 * Cuando no hay ningún corte posible sí se muestra, deshabilitada, con el motivo,
 * para que el usuario entienda por qué en vez de encontrarse un fallo al confirmar.
 */
export function splitAffordance(
  entry: Pick<TimeEntry, 'synced' | 'recoverable' | 'startTime' | 'endTime'>,
): SplitAffordance {
  if (entry.synced || entry.recoverable) {
    return { visible: false };
  }

  const availability = splitAvailability(entry);
  return availability.splittable
    ? { visible: true, enabled: true }
    : { visible: true, enabled: false, reason: availability.reason };
}

/**
 * Construye las dos mitades a partir del plan.
 *
 * La primera conserva identidad (`id`, `createdAt`), la segunda es nueva. Las dos
 * se copian del Registro original **entero**, para no perder ningún campo de la
 * Tarea (Proceso) —el alta normal de Registros solo guarda identificador y nombre—,
 * y quedan pendientes de sincronizar y limpias de errores previos.
 */
export function buildSplitHalves(
  entry: TimeEntry,
  segments: [SplitSegment, SplitSegment],
  deps: SplitDeps,
): SplitHalves {
  const [firstSegment, secondSegment] = segments;

  const first: TimeEntry = {
    ...entry,
    startTime: firstSegment.startTime,
    endTime: firstSegment.endTime,
    duration: firstSegment.minutes * 60,
    proceso: { ...entry.proceso },
    updatedAt: deps.now,
    synced: false,
    syncedAt: undefined,
    syncError: undefined,
    serverId: undefined,
  };

  const second: TimeEntry = {
    ...first,
    id: deps.newId,
    startTime: secondSegment.startTime,
    endTime: secondSegment.endTime,
    duration: secondSegment.minutes * 60,
    createdAt: deps.now,
  };

  return { first, second };
}
