/**
 * Motor de cálculo de balance diario, semanal, banco y asignación de recuperación.
 * Funciones puras — sin efectos secundarios.
 */

import { getDailyTarget } from './schedule';
import type { TimeEntry } from '../types';

/**
 * Calcula el balance de un día: suma de duraciones no recuperables - target diario.
 * Positivo = horas extra, negativo = horas faltantes.
 * @param entries - entries del día (puede incluir entries de otros días — se filtran)
 * @param date - fecha a evaluar (YYYY-MM-DD)
 * @param scheduleFn - función para resolver el target (default: getDailyTarget)
 * @returns balance en segundos
 */
export function computeDailyBalance(
  entries: TimeEntry[],
  date: string,
  scheduleFn: (date: string) => number = getDailyTarget,
): number {
  const dayEntries = entries.filter(
    (e) => e.date === date && !e.recoverable,
  );
  const workedSeconds = dayEntries.reduce((sum, e) => sum + e.duration, 0);
  const targetSeconds = scheduleFn(date) * 3600;
  return workedSeconds - targetSeconds;
}

/**
 * Calcula el balance semanal: suma de balances diarios de lunes a domingo.
 * @param entries - entries de la semana completa
 * @param weekStart - fecha del lunes (YYYY-MM-DD)
 * @param scheduleFn - función para resolver el target diario
 * @returns balance total de la semana en segundos
 */
export function computeWeeklyBalance(
  entries: TimeEntry[],
  weekStart: string,
  scheduleFn: (date: string) => number = getDailyTarget,
): number {
  let total = 0;
  const monday = new Date(weekStart + 'T12:00:00');
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dateStr = day.toISOString().slice(0, 10);
    total += computeDailyBalance(entries, dateStr, scheduleFn);
  }
  return total;
}

/**
 * Calcula el banco acumulado: suma de todos los balances diarios de todas las entries.
 * @param allEntries - todas las entries históricas
 * @param scheduleFn - función para resolver el target diario
 * @returns banco acumulado en segundos
 */
export function computeBanco(
  allEntries: TimeEntry[],
  scheduleFn: (date: string) => number = getDailyTarget,
): number {
  const dates = [...new Set(allEntries.map((e) => e.date))].sort();
  return dates.reduce(
    (banco, date) => banco + computeDailyBalance(allEntries, date, scheduleFn),
    0,
  );
}

/**
 * Asigna el banco a permisos cronológicamente (más antiguo primero).
 * Permite asignación parcial.
 * @param bancoAmount - cantidad disponible en el banco (segundos, debe ser positivo)
 * @param permisos - lista de permisos ordenada por fecha ascendente (entries con recoverable=true)
 * @returns Map de ID del permiso a cantidad pendiente restante (segundos)
 */
export function allocateRecovery(
  bancoAmount: number,
  permisos: TimeEntry[],
): Map<string, number> {
  const result = new Map<string, number>();
  let remaining = Math.max(0, bancoAmount);

  for (const permiso of permisos) {
    const pending = permiso.duration;
    if (remaining <= 0) {
      result.set(permiso.id, pending);
    } else if (remaining >= pending) {
      result.set(permiso.id, 0);
      remaining -= pending;
    } else {
      result.set(permiso.id, pending - remaining);
      remaining = 0;
    }
  }

  return result;
}
