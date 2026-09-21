/**
 * Reglas de los dos recordatorios de trabajo. Funciones puras: reciben el
 * estado como datos y devuelven una decisión, sin relojes ni efectos propios.
 *
 * Son dos avisos distintos y con umbral propio:
 *
 * - `running`: el timer lleva N minutos corriendo. Es un control periódico de
 *   que el registro sigue siendo cierto, no una detección de ausencia: la app
 *   suele estar de fondo, y ahí "no hubo actividad" y "estoy trabajando en otra
 *   ventana" son indistinguibles.
 * - `no-timer`: es día laborable, ya pasaron N minutos de la hora de entrada y
 *   no hay ningún timer corriendo. Cubre tanto no haberlo arrancado nunca como
 *   haberlo parado y no reiniciado.
 */

import { formatDurationShort, formatHHMM } from '@/lib/format';

export type ReminderKind = 'running' | 'no-timer';

/** Todo lo que las reglas necesitan saber. Datos planos: el evaluador es puro. */
export interface ReminderContext {
  /** `Date.now()` del momento de evaluar. */
  now: number;
  isRunning: boolean;
  /** Nombre de la tarea del timer corriendo (vacío si no corre). */
  taskName: string;
  /** Segundos que lleva corriendo el timer. 0 si está parado. */
  elapsedSeconds: number;
  /** Hora de entrada en minutos desde medianoche, o null si hoy no es laborable. */
  workdayStartMinutes: number | null;
  /** Segundos ya registrados hoy (excluye recuperables). */
  todayWorkedSeconds: number;
  /** Objetivo del día en segundos. */
  todayTargetSeconds: number;
}

export interface ReminderSettings {
  runningAlertEnabled: boolean;
  runningAlertMinutes: number;
  noTimerAlertEnabled: boolean;
  noTimerAlertMinutes: number;
}

/**
 * Cuánto avanzó cada regla, medido en múltiplos enteros de su propio umbral.
 *
 * `0` significa que la regla no aplica ahora mismo. `1`, `2`, `3`… significan
 * que se alcanzó el N-ésimo múltiplo. El llamador avisa **sólo cuando el paso
 * crece**, y se apoya en esto para repetir el recordatorio cada N minutos en
 * lugar de dispararlo una vez y callarse.
 */
export interface ReminderProgress {
  runningStep: number;
  noTimerStep: number;
}

export const NO_PROGRESS: ReminderProgress = { runningStep: 0, noTimerStep: 0 };

export interface ReminderMessage {
  kind: ReminderKind;
  title: string;
  body: string;
  /** Identifica el aviso: uno repetido reemplaza al anterior en el sistema. */
  tag: string;
}

function stepFor(measured: number, threshold: number): number {
  if (threshold <= 0 || measured <= 0) return 0;
  return Math.floor(measured / threshold);
}

function secondsSinceMidnight(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

function evaluateRunning(
  context: ReminderContext,
  settings: ReminderSettings,
): number {
  if (!settings.runningAlertEnabled) return 0;
  if (!context.isRunning) return 0;
  return stepFor(context.elapsedSeconds, settings.runningAlertMinutes * 60);
}

function evaluateNoTimer(
  context: ReminderContext,
  settings: ReminderSettings,
): number {
  if (!settings.noTimerAlertEnabled) return 0;
  // Un timer corriendo es justamente lo contrario de lo que este aviso busca.
  if (context.isRunning) return 0;

  const startMinutes = context.workdayStartMinutes;
  if (startMinutes === null) return 0;

  // Ya se cumplió el objetivo del día: no hay nada que reclamar.
  if (
    context.todayTargetSeconds > 0 &&
    context.todayWorkedSeconds >= context.todayTargetSeconds
  ) {
    return 0;
  }

  // Antes de la hora de entrada el transcurso es negativo, así que no avanza.
  const sinceStart =
    secondsSinceMidnight(context.now) - startMinutes * 60;

  return stepFor(sinceStart, settings.noTimerAlertMinutes * 60);
}

/** Evalúa las dos reglas y devuelve en qué múltiplo está cada una. */
export function evaluateReminders(
  context: ReminderContext,
  settings: ReminderSettings,
): ReminderProgress {
  return {
    runningStep: evaluateRunning(context, settings),
    noTimerStep: evaluateNoTimer(context, settings),
  };
}

export interface FiredState {
  fire: boolean;
  /** Contador con el que queda la regla, listo para la próxima evaluación. */
  fired: number;
}

/**
 * Decide si corresponde avisar y con qué contador queda la regla.
 *
 * `step` es el múltiplo alcanzado (0 = la regla no aplica). Cuando la regla
 * deja de aplicar el contador vuelve a cero, y eso resuelve dos reinicios que,
 * de faltar, romperían el aviso en silencio: el de un timer nuevo después de
 * parar, y el del cambio de día.
 */
export function advanceFired(fired: number, step: number): FiredState {
  if (step <= 0) return { fire: false, fired: 0 };
  if (step <= fired) return { fire: false, fired };
  return { fire: true, fired: step };
}

/** Texto del recordatorio, para el toast o la notificación del sistema. */
export function buildReminderMessage(
  kind: ReminderKind,
  context: ReminderContext,
): ReminderMessage {
  if (kind === 'no-timer') {
    const start = context.workdayStartMinutes;
    const from = start === null ? '' : ` desde las ${formatHHMM(start)}`;
    return {
      kind,
      title: 'No arrancaste el timer',
      body: `No hay ningún timer corriendo${from}.`,
      tag: 'timer-not-started',
    };
  }

  return {
    kind,
    title: '¿Sigue en curso el timer?',
    body: `«${context.taskName}» lleva ${formatDurationShort(context.elapsedSeconds)} corriendo.`,
    tag: 'timer-running',
  };
}
