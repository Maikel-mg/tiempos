/**
 * Salida estimada del día: lo que falta del objetivo, contado desde ahora.
 *
 * Función pura — el reloj se pasa como dato para poder probarla. Devuelve `null`
 * cuando no hay objetivo o ya está cumplido: sin hora que estimar no se muestra nada.
 */
export interface ExitEstimate {
  /** Lo que falta para el objetivo, redondeado hacia arriba al minuto. */
  remainingMinutes: number;
  /** Hora de salida estimada, en minutos desde medianoche (puede pasar de 1440). */
  exitMinutes: number;
}

export function estimateExit(
  targetSeconds: number,
  workedSeconds: number,
  now: Date,
): ExitEstimate | null {
  if (targetSeconds <= 0) return null;
  const remainingSeconds = targetSeconds - workedSeconds;
  if (remainingSeconds <= 0) return null;

  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return { remainingMinutes, exitMinutes: nowMinutes + remainingMinutes };
}
