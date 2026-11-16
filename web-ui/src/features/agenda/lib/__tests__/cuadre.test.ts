import { describe, expect, it } from 'vitest';
import { cuadrarDia, franjasOf, isDiaFichadoValido } from '../cuadre';
import type { TimeEntry } from '@/features/time-tracker/types';

const HOY = '2026-11-05';

function entry(id: string, date: string, startTime: string, endTime: string): TimeEntry {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return {
    id,
    taskId: 10,
    taskName: 'Clasificador',
    proceso: { proceso: 10, nombre: 'Clasificador' },
    date,
    startTime,
    endTime,
    duration: (eh * 60 + em - (sh * 60 + sm)) * 60,
    synced: false,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

describe('franjasOf', () => {
  it('empareja los Marcajes por posición, no por dirección', () => {
    expect(franjasOf(['15:15', '06:35', '16:13', '13:30'])).toEqual([
      { start: '06:35', end: '13:30' },
      { start: '15:15', end: '16:13' },
    ]);
  });

  it('un Marcaje impar no forma franja', () => {
    expect(franjasOf(['06:35', '13:30', '15:15'])).toEqual([{ start: '06:35', end: '13:30' }]);
  });
});

describe('isDiaFichadoValido', () => {
  it('pide un número par de Marcajes y al menos dos', () => {
    expect(isDiaFichadoValido([])).toBe(false);
    expect(isDiaFichadoValido(['06:35'])).toBe(false);
    expect(isDiaFichadoValido(['06:35', '13:30'])).toBe(true);
    expect(isDiaFichadoValido(['06:35', '13:30', '15:15'])).toBe(false);
    expect(isDiaFichadoValido(['06:35', '13:30', '15:15', '16:13'])).toBe(true);
  });
});

describe('cuadrarDia — estado del día', () => {
  const dia = (times: string[], entries: TimeEntry[] = [], extra: { today?: string; ignored?: boolean } = {}) =>
    cuadrarDia({ day: '2026-11-04', today: extra.today ?? HOY, times, ignored: extra.ignored, entries });

  it('hoy queda siempre fuera del cuadre, tenga los marcajes que tenga', () => {
    expect(dia(['06:35', '13:30'], [], { today: '2026-11-04' }).status).toBe('hoy');
  });

  it('sin marcajes no es descuadrado: es que no hay información', () => {
    expect(dia([], [entry('a', '2026-11-04', '09:00', '10:00')]).status).toBe('sin-marcajes');
  });

  it('con menos de dos marcajes o número impar, el día no tiene franjas fiables', () => {
    expect(dia(['06:35']).status).toBe('sin-marcajes-validos');
    expect(dia(['06:35', '13:30', '15:15']).status).toBe('sin-marcajes-validos');
  });

  it('un día ignorado no se evalúa aunque sus marcajes sean válidos', () => {
    const cuadre = dia(['06:35', '13:30'], [entry('a', '2026-11-04', '09:00', '10:00')], { ignored: true });

    expect(cuadre.status).toBe('ignorado');
    expect(cuadre.desajustes).toEqual([]);
  });

  it('cuadra cuando el Registro cabe entero en la franja', () => {
    expect(dia(['06:35', '14:17'], [entry('a', '2026-11-04', '06:35', '14:17')]).status).toBe('cuadra');
  });

  it('se descuadra con un solo minuto de diferencia fuera de la franja', () => {
    expect(dia(['06:35', '14:17'], [entry('a', '2026-11-04', '06:36', '14:17')]).status).toBe('descuadrado');
  });

  it('un día sin marcajes válidos no inventa desajustes', () => {
    const cuadre = dia(['06:35', '13:30', '15:15'], [entry('a', '2026-11-04', '09:00', '10:00')]);

    expect(cuadre.desajustes).toEqual([]);
    expect(cuadre.franjas).toHaveLength(1);
  });
});
