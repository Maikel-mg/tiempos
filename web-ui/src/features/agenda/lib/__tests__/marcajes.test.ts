import { describe, expect, it } from 'vitest';
import { formatMarcajesDelta, groupMarcajesByDay, type Marcaje } from '../marcajes';

const marcaje = (date: string, time: string): Marcaje => ({ date, time, origen: 'MAIL' });

describe('groupMarcajesByDay', () => {
  it('agrupa por día y suma los pares entrada→salida', () => {
    const result = groupMarcajesByDay([
      marcaje('2026-11-02', '06:43'),
      marcaje('2026-11-02', '14:17'),
      marcaje('2026-11-02', '15:15'),
      marcaje('2026-11-02', '16:13'),
    ]);

    expect(result).toEqual([
      { day: '2026-11-02', times: ['06:43', '14:17', '15:15', '16:13'], coveredMinutes: 7 * 60 + 34 + 58 },
    ]);
  });

  it('no suma un marcaje impar: sin salida no se sabe cuánto duró', () => {
    const result = groupMarcajesByDay([
      marcaje('2026-11-02', '06:43'),
      marcaje('2026-11-02', '14:17'),
      marcaje('2026-11-02', '15:15'),
    ]);

    expect(result[0].coveredMinutes).toBe(7 * 60 + 34);
  });

  it('ordena los días y las horas aunque lleguen desordenados', () => {
    const result = groupMarcajesByDay([
      marcaje('2026-11-03', '07:00'),
      marcaje('2026-11-02', '14:17'),
      marcaje('2026-11-02', '06:43'),
    ]);

    expect(result.map((day) => day.day)).toEqual(['2026-11-02', '2026-11-03']);
    expect(result[0].times).toEqual(['06:43', '14:17']);
  });

  it('sin marcajes no hay días', () => {
    expect(groupMarcajesByDay([])).toEqual([]);
  });
});

describe('formatMarcajesDelta', () => {
  it('dice "cuadra" cuando la diferencia es cero', () => {
    expect(formatMarcajesDelta(0)).toBe('cuadra');
  });

  it('marca con signo lo que falta por registrar o lo que sobra', () => {
    expect(formatMarcajesDelta(28 * 60)).toBe('+28m');
    expect(formatMarcajesDelta(-(60 + 20) * 60)).toBe('−1h 20m');
  });
});
