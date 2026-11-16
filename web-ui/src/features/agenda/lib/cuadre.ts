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
}

/** Un día con marca es un día evaluable: el resto se pinta como siempre. */
export function hasMark(cuadre: DayCuadre): boolean {
  return cuadre.status === 'cuadra' || cuadre.status === 'descuadrado' || cuadre.status === 'sin-marcajes-validos' || cuadre.status === 'ignorado';
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
