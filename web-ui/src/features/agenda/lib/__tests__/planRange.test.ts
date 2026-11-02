import { describe, it, expect } from 'vitest';
import {
  addDays,
  endOfDay,
  gapsOf,
  hourBounds,
  isWeekend,
  nextWorkday,
  taskLanes,
  toWorkday,
  totalSeconds,
  visibleDays,
  weekDayKeys,
} from '../planRange';
import type { TimeEntry } from '@/features/time-tracker/types';

function entry(id: string, date: string, startTime: string, endTime: string, taskName = 'Tarea'): TimeEntry {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const duration = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) * 60;
  return {
    id,
    taskId: 1,
    taskName,
    proceso: { proceso: 1, nombre: taskName },
    date,
    startTime,
    endTime,
    duration,
    synced: false,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

describe('rango del plan', () => {
  it('suma días cruzando meses', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('reconoce el fin de semana', () => {
    expect(isWeekend('2026-06-13')).toBe(true); // sábado
    expect(isWeekend('2026-06-14')).toBe(true); // domingo
    expect(isWeekend('2026-06-12')).toBe(false); // viernes
  });

  it('salta el fin de semana en los dos sentidos', () => {
    expect(nextWorkday('2026-06-12', 1)).toBe('2026-06-15'); // viernes → lunes
    expect(nextWorkday('2026-06-15', -1)).toBe('2026-06-12'); // lunes → viernes
  });

  it('resuelve sábado y domingo al viernes', () => {
    expect(toWorkday('2026-06-13')).toBe('2026-06-12');
    expect(toWorkday('2026-06-14')).toBe('2026-06-12');
    expect(toWorkday('2026-06-16')).toBe('2026-06-16');
  });

  it('la semana visible es de lunes a viernes', () => {
    const days = weekDayKeys('2026-06-10');
    expect(days).toHaveLength(5);
    expect(days[0]).toBe('2026-06-08');
    expect(days[4]).toBe('2026-06-12');
  });

  it('días visibles según el modo', () => {
    expect(visibleDays('day', '2026-06-10')).toEqual(['2026-06-10']);
    expect(visibleDays('week', '2026-06-10')).toHaveLength(5);
  });

  it('el eje arranca en la hora de entrada configurada', () => {
    expect(hourBounds([entry('a', '2026-06-10', '09:30', '11:00')], 9 * 60).from).toBe(9 * 60);
  });

  it('el eje se estira si hay un registro anterior a la hora de entrada', () => {
    expect(hourBounds([entry('a', '2026-06-10', '07:30', '11:00')], 9 * 60).from).toBe(7 * 60);
  });

  it('sin hora de entrada mantiene una hora de margen', () => {
    expect(hourBounds([entry('a', '2026-06-10', '07:30', '11:00')]).from).toBe(6 * 60);
  });

  it('un día vacío tiene eje aunque no haya registros', () => {
    expect(hourBounds([], 9 * 60)).toEqual({ from: 9 * 60, to: 17 * 60 });
  });

  it('suma el total y la hora de fin del día', () => {
    const entries = [entry('a', '2026-06-10', '09:00', '10:00'), entry('b', '2026-06-10', '10:30', '12:00')];
    expect(totalSeconds(entries)).toBe(2.5 * 3600);
    expect(endOfDay(entries)).toBe('12:00');
  });

  it('calcula los huecos y no inventa uno entre registros solapados', () => {
    const entries = [
      entry('a', '2026-06-10', '09:00', '10:00'),
      entry('b', '2026-06-10', '10:30', '11:00'),
      entry('c', '2026-06-10', '10:45', '12:00'),
    ];
    const gaps = gapsOf(entries);
    expect(gaps.get('b')).toBe(30);
    expect(gaps.has('c')).toBe(false);
  });

  it('agrupa por Tarea de mayor a menor tiempo', () => {
    const lanes = taskLanes([
      entry('a', '2026-06-10', '09:00', '10:00', 'Corta'),
      entry('b', '2026-06-10', '10:00', '13:00', 'Larga'),
    ]);
    expect(lanes.map((lane) => lane.taskName)).toEqual(['Larga', 'Corta']);
    expect(lanes[0].byDay.get('2026-06-10')).toHaveLength(1);
  });
});
