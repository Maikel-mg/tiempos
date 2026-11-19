import { describe, it, expect } from 'vitest';
import { parseImportJson } from '../parseImportEntries';

describe('parseImportJson', () => {
  it('lee un array de registros y suma los minutos', () => {
    const result = parseImportJson(
      JSON.stringify([
        { date: '2026-11-02', startTime: '07:00', endTime: '08:00', description: 'Hola' },
        { date: '2026-11-02', startTime: '08:00', endTime: '12:00' },
      ])
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(2);
    expect(result.totalMinutes).toBe(300);
    expect(result.entries[0].description).toBe('Hola');
    expect(result.entries[1].description).toBeUndefined();
  });

  it('acepta el envoltorio { entries } y ordena por fecha y hora', () => {
    const result = parseImportJson(
      JSON.stringify({
        entries: [
          { date: '2026-11-03', startTime: '08:00', endTime: '09:00' },
          { date: '2026-11-02', startTime: '09:00', endTime: '10:00' },
          { date: '2026-11-02', startTime: '07:00', endTime: '08:00' },
        ],
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries.map((e) => `${e.date} ${e.startTime}`)).toEqual([
      '2026-11-02 07:00',
      '2026-11-02 09:00',
      '2026-11-03 08:00',
    ]);
  });

  it.each([
    ['no es JSON', 'nope', 'JSON válido'],
    ['no es lista', '{"foo":1}', 'array de registros'],
    ['lista vacía', '[]', 'no tiene registros'],
    ['fecha mal', '[{"date":"02/11/2026","startTime":"07:00","endTime":"08:00"}]', 'fecha inválida'],
    ['hora mal', '[{"date":"2026-11-02","startTime":"7:00","endTime":"08:00"}]', 'hora de inicio inválida'],
    ['fin antes', '[{"date":"2026-11-02","startTime":"08:00","endTime":"08:00"}]', 'posterior'],
  ])('rechaza %s', (_caso, raw, fragmento) => {
    const result = parseImportJson(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain(fragmento);
  });
});
