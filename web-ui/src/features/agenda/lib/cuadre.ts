import { parseHHMM } from '@/lib/format';
import type { TimeEntry } from '@/features/time-tracker/types';

/**
 * Cuadre de los Registros de tiempo contra la Franja fichada del día.
 *
 * Un día solo es cuadrable si tiene un número par de Marcajes y al menos dos: con
 * un fichaje perdido no hay franjas fiables. Hoy queda siempre fuera, porque la
 * intranet aún no ha volcado sus marcajes. La comparación es exacta: la intranet
 * no admite márgenes de minutos.
 */

/** Franja fichada: tramo entre un Marcaje de entrada y el siguiente de salida. */
export interface FranjaFichada {
  /** HH:MM */
  start: string;
  /** HH:MM */
  end: string;
}

export type MarcajeFixKind =
  | 'ampliar-inicio'
  | 'ampliar-fin'
  | 'recortar-inicio'
  | 'recortar-fin'
  | 'cruza-franja';

/** Corrección propuesta sobre un Registro. El servicio recalcula `duration`. */
export interface MarcajeFix {
  entryId: string;
  kind: MarcajeFixKind;
  /** Horarios a escribir. */
  patch: { startTime?: string; endTime?: string };
  /** Texto del botón: 'Ampliar inicio a 06:35'. */
  label: string;
  /** El Registro cruza dos franjas: se ofrece además Dividir. */
  dividir?: boolean;
}

/** Desajuste de un Registro concreto frente a su Franja fichada. */
export interface RegistroDescuadre {
  entryId: string;
  kind: MarcajeFixKind;
  /** Minutos del Registro que caen dentro del fichaje. */
  minutosFichados: number;
  /** Minutos del Registro que caen fuera del fichaje. */
  minutosNoFichados: number;
  fixes: MarcajeFix[];
}

export type DayCuadreStatus =
  /** Día en curso: nunca se evalúa. */
  | 'hoy'
  /** Sin Marcajes: no hay información, no es lo mismo que estar mal. */
  | 'sin-marcajes'
  /** Marcajes impares o insuficientes: no hay franjas fiables. */
  | 'sin-marcajes-validos'
  | 'cuadra'
  | 'descuadrado'
  /** El usuario excluyó el día del cuadre. */
  | 'ignorado';

/** Lo que las tres vistas del período necesitan saber de un día. */
export interface DayCuadre {
  day: string;
  status: DayCuadreStatus;
  franjas: FranjaFichada[];
  desajustes: RegistroDescuadre[];
  /** Lo pintado viene de una lectura de hace más de un día. */
  stale?: boolean;
}

/**
 * Franjas fichadas del día: los Marcajes ordenados se emparejan por posición
 * `[1→2] [3→4] …`. La dirección no viaja en el dato, no se deduce.
 */
export function franjasOf(times: string[]): FranjaFichada[] {
  const sorted = [...times].sort();
  const franjas: FranjaFichada[] = [];
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    franjas.push({ start: sorted[i], end: sorted[i + 1] });
  }
  return franjas;
}

/**
 * Un día es cuadrable con un número par de Marcajes y al menos dos: cada hora
 * repetida cuenta por separado, así que un manual duplicado deja el día impar.
 */
export function isDiaFichadoValido(times: string[]): boolean {
  return times.length >= 2 && times.length % 2 === 0;
}

export interface CuadrarDiaInput {
  day: string;
  /** Hoy, en YYYY-MM-DD: el día en curso queda siempre fuera del cuadre. */
  today: string;
  /** Horas fichadas del día. */
  times: string[];
  /** El usuario excluyó el día del cuadre. */
  ignored?: boolean;
  /** Registros de tiempo del día, sin el Timer activo. */
  entries: TimeEntry[];
}

/**
 * Estado del cuadre de un día. No aplica nada: solo dice qué pasa y qué
 * Registros no caben en su Franja fichada.
 */
export function cuadrarDia({ day, today, times, ignored, entries }: CuadrarDiaInput): DayCuadre {
  const franjas = franjasOf(times);
  const base = { day, franjas, desajustes: [] as RegistroDescuadre[] };

  if (day === today) return { ...base, status: 'hoy' };
  if (ignored) return { ...base, status: 'ignorado' };
  if (times.length === 0) return { ...base, status: 'sin-marcajes' };
  if (!isDiaFichadoValido(times)) return { ...base, status: 'sin-marcajes-validos' };

  const desajustes = desajustesOf(entries, franjas);
  return { ...base, desajustes, status: desajustes.length > 0 ? 'descuadrado' : 'cuadra' };
}

/** Un día con marca es un día evaluable: el resto se pinta como siempre. */
export function hasMark(cuadre: DayCuadre): boolean {
  return (
    cuadre.status === 'cuadra' ||
    cuadre.status === 'descuadrado' ||
    cuadre.status === 'sin-marcajes-validos' ||
    cuadre.status === 'ignorado'
  );
}

/** Etiqueta corta de la marca, para el indicador y su texto accesible. */
export const DAY_CUADRE_LABEL: Record<DayCuadreStatus, string> = {
  hoy: 'hoy queda fuera del cuadre',
  'sin-marcajes': 'sin marcajes',
  'sin-marcajes-validos': 'sin marcajes válidos',
  cuadra: 'cuadra con marcajes',
  descuadrado: 'descuadrado con marcajes',
  ignorado: 'marcajes ignorados',
};

const startOf = (entry: TimeEntry) => parseHHMM(entry.startTime);
const endOf = (entry: TimeEntry) => parseHHMM(entry.endTime);
const startOfFranja = (franja: FranjaFichada) => parseHHMM(franja.start);
const endOfFranja = (franja: FranjaFichada) => parseHHMM(franja.end);

/** Minutos que dos tramos comparten; 0 si solo se tocan o no se cruzan. */
function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/**
 * Compara los Registros del día con sus Franjas fichadas, con tolerancia 0: un
 * minuto de diferencia ya es desajuste.
 *
 * Cada franja se cubre entre todos sus Registros: lo que se queda corto en un
 * borde se amplía, lo que se sale por un borde se recorta. Un Registro que cruza
 * el hueco entre dos franjas se señala aparte, con el recorte al borde donde
 * empieza y un enlace a Dividir: la app nunca parte un Registro por su cuenta.
 *
 * Un Registro enteramente fuera de todo fichaje no aparece aquí: no hay borde
 * del que tirar. Lo delata la diferencia entre marcadas y registradas.
 */
export function desajustesOf(entries: TimeEntry[], franjas: FranjaFichada[]): RegistroDescuadre[] {
  const porRegistro = new Map<string, RegistroDescuadre>();

  const minutosDelRegistro = (entry: TimeEntry) =>
    franjas.reduce(
      (sum, franja) =>
        sum + overlapMinutes(startOf(entry), endOf(entry), startOfFranja(franja), endOfFranja(franja)),
      0,
    );

  const addFix = (entry: TimeEntry, fix: MarcajeFix) => {
    const minutes = minutosDelRegistro(entry);
    const existing = porRegistro.get(entry.id);
    if (existing) {
      existing.fixes.push(fix);
      return;
    }
    porRegistro.set(entry.id, {
      entryId: entry.id,
      kind: fix.kind,
      minutosFichados: minutes,
      minutosNoFichados: endOf(entry) - startOf(entry) - minutes,
      fixes: [fix],
    });
  };

  const franjasQueCruza = (entry: TimeEntry) =>
    franjas.filter(
      (franja) =>
        overlapMinutes(startOf(entry), endOf(entry), startOfFranja(franja), endOfFranja(franja)) > 0,
    );

  // Cruces: el Registro no cabe en ninguna franja y se mete en el hueco entre
  // dos. Nunca se parte solo: se ofrece el recorte y, aparte, Dividir.
  const cruzan = new Set<string>();
  for (const entry of entries) {
    if (endOf(entry) <= startOf(entry)) continue;
    const cruzadas = franjasQueCruza(entry);
    const primera = cruzadas[0];
    if (!primera) continue;
    if (cruzadas.length < 2 && !seMeteEnElHueco(entry, primera, franjas)) continue;

    const fix = cruzaFranjaFix(entry, primera);
    if (!fix) continue;
    cruzan.add(entry.id);
    addFix(entry, fix);
  }

  // Cobertura de cada franja por los Registros que no cruzan a otra.
  for (const franja of franjas) {
    const dentro = entries.filter(
      (entry) =>
        !cruzan.has(entry.id) &&
        endOf(entry) > startOf(entry) &&
        overlapMinutes(startOf(entry), endOf(entry), startOfFranja(franja), endOfFranja(franja)) > 0,
    );
    if (dentro.length === 0) continue;

    const primero = dentro.reduce((a, b) => (startOf(a) <= startOf(b) ? a : b));
    const ultimo = dentro.reduce((a, b) => (endOf(a) >= endOf(b) ? a : b));

    if (startOf(primero) > startOfFranja(franja)) {
      addFix(primero, {
        entryId: primero.id,
        kind: 'ampliar-inicio',
        patch: { startTime: franja.start },
        label: `Ampliar inicio a ${franja.start}`,
      });
    } else if (startOf(primero) < startOfFranja(franja)) {
      addFix(primero, {
        entryId: primero.id,
        kind: 'recortar-inicio',
        patch: { startTime: franja.start },
        label: `Recortar inicio a ${franja.start}`,
      });
    }

    if (endOf(ultimo) < endOfFranja(franja)) {
      addFix(ultimo, {
        entryId: ultimo.id,
        kind: 'ampliar-fin',
        patch: { endTime: franja.end },
        label: `Ampliar fin a ${franja.end}`,
      });
    } else if (endOf(ultimo) > endOfFranja(franja)) {
      addFix(ultimo, {
        entryId: ultimo.id,
        kind: 'recortar-fin',
        patch: { endTime: franja.end },
        label: `Recortar fin a ${franja.end}`,
      });
    }
  }

  return [...porRegistro.values()];
}

/**
 * ¿El Registro se sale de esta franja hacia un hueco interno del día? Un hueco
 * entre la franja anterior o la siguiente, no el borde de la jornada.
 */
function seMeteEnElHueco(entry: TimeEntry, franja: FranjaFichada, franjas: FranjaFichada[]): boolean {
  const index = franjas.indexOf(franja);
  if (index < 0) return false;
  const siguiente = franjas[index + 1];
  const anterior = franjas[index - 1];

  if (
    endOf(entry) > endOfFranja(franja) &&
    siguiente &&
    endOf(entry) <= startOfFranja(siguiente)
  ) {
    return true;
  }

  return Boolean(
    startOf(entry) < startOfFranja(franja) && anterior && startOf(entry) >= endOfFranja(anterior),
  );
}

/** Recorte al borde de la franja donde el Registro empieza, con enlace a Dividir. */
function cruzaFranjaFix(entry: TimeEntry, franja: FranjaFichada): MarcajeFix | null {
  const start = startOf(entry);
  const fStart = startOfFranja(franja);

  // Arranca antes del fichaje: se recorta el borde por el que empieza.
  if (start < fStart) {
    const soloInicio = endOf(entry) <= endOfFranja(franja);
    return {
      entryId: entry.id,
      kind: 'cruza-franja',
      patch: soloInicio ? { startTime: franja.start } : { startTime: franja.start, endTime: franja.end },
      label: soloInicio ? `Recortar inicio a ${franja.start}` : `Recortar a ${franja.start}–${franja.end}`,
      dividir: true,
    };
  }

  if (endOf(entry) <= endOfFranja(franja)) return null;

  return {
    entryId: entry.id,
    kind: 'cruza-franja',
    patch: { endTime: franja.end },
    label: `Recortar fin a ${franja.end}`,
    dividir: true,
  };
}

/**
 * Aplica la corrección a un Registro, recalculando su duración igual que el
 * servicio, para previsualizar sin tocar la base de datos.
 */
export function patchEntry(entry: TimeEntry, fix: MarcajeFix): TimeEntry {
  const startTime = fix.patch.startTime ?? entry.startTime;
  const endTime = fix.patch.endTime ?? entry.endTime;
  return {
    ...entry,
    startTime,
    endTime,
    duration: (parseHHMM(endTime) - parseHHMM(startTime)) * 60,
  };
}

/**
 * Registro con el que chocaría esta corrección, o `null` si no hay solape. Se
 * comprueba antes de escribir para no mover horas encima de otro Registro.
 */
export function conflictOf(entries: TimeEntry[], fix: MarcajeFix): TimeEntry | null {
  const target = entries.find((entry) => entry.id === fix.entryId);
  if (!target) return null;

  const patched = patchEntry(target, fix);
  const start = parseHHMM(patched.startTime);
  const end = parseHHMM(patched.endTime);

  return (
    entries.find(
      (entry) =>
        entry.id !== target.id &&
        entry.date === target.date &&
        overlapMinutes(start, end, parseHHMM(entry.startTime), parseHHMM(entry.endTime)) > 0,
    ) ?? null
  );
}

/** Previsualización de una corrección: qué Registro y con qué horario queda. */
export function fixPreview(entry: TimeEntry, fix: MarcajeFix): { taskName: string; range: string } {
  const patched = patchEntry(entry, fix);
  return { taskName: entry.taskName, range: `${patched.startTime}–${patched.endTime}` };
}

/** Correcciones simples que puede aplicar `Ajustar el día`: sin cruces de franja. */
export function fixesAjustables(desajustes: RegistroDescuadre[]): MarcajeFix[] {
  return desajustes
    .filter((desajuste) => desajuste.kind !== 'cruza-franja')
    .flatMap((desajuste) => desajuste.fixes.filter((fix) => !fix.dividir));
}
