import { describe, test, expect } from 'vitest';
import { parseAmbiguousDate } from './date-parser';

describe('parseAmbiguousDate', () => {
  test('parses YYYY-MM-DD format', () => {
    const result = parseAmbiguousDate('2024-01-15');
    expect(result).toEqual({ year: '2024', month: '01', day: '15', yyyymmdd: '20240115' });
  });

  test('parses DD/MM/YYYY format', () => {
    const result = parseAmbiguousDate('15/01/2024');
    expect(result).toEqual({ year: '2024', month: '01', day: '15', yyyymmdd: '20240115' });
  });

  test('parses YYYY/MM/DD format', () => {
    const result = parseAmbiguousDate('2024/01/15');
    expect(result).toEqual({ year: '2024', month: '01', day: '15', yyyymmdd: '20240115' });
  });

  test('handles MM-DD-YYYY when second part > 12 (DDMMYYYY heuristic)', () => {
    const result = parseAmbiguousDate('01-15-2024');
    expect(result).toEqual({ year: '2024', month: '01', day: '15', yyyymmdd: '20240115' });
  });

  test('returns null for empty input', () => {
    expect(parseAmbiguousDate('')).toBeNull();
  });

  test('returns null for single-part string', () => {
    expect(parseAmbiguousDate('20240115')).toBeNull();
  });

  test('pads month and day in yyyymmdd', () => {
    const result = parseAmbiguousDate('2024-03-05');
    expect(result).toEqual({ year: '2024', month: '03', day: '05', yyyymmdd: '20240305' });
  });
});
