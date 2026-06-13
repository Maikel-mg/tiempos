import { describe, test, expect } from 'vitest';
import { classifyEntries, type TimeEntry } from './entry-classifier';

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: '1',
    taskId: 1,
    taskName: 'Dev',
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '10:00',
    duration: 60,
    synced: false,
    ...overrides,
  };
}

describe('classifyEntries', () => {
  test('classifies matching entries as alreadyExists', () => {
    const entries = [makeEntry({ taskId: 1 })];
    const dbRows = [{ Fecha: '2024-01-15', Desde: '09:00', Hasta: '10:00', IdProceso: 1 }];

    const result = classifyEntries(entries, dbRows);
    expect(result.alreadyExists).toHaveLength(1);
    expect(result.willInsert).toHaveLength(0);
  });

  test('classifies non-matching entries as willInsert', () => {
    const entries = [makeEntry({ taskId: 1 })];
    const dbRows = [{ Fecha: '2024-01-15', Desde: '09:00', Hasta: '10:00', IdProceso: 99 }];

    const result = classifyEntries(entries, dbRows);
    expect(result.willInsert).toHaveLength(1);
    expect(result.alreadyExists).toHaveLength(0);
  });

  test('handles empty entries array', () => {
    const result = classifyEntries([], []);
    expect(result.willInsert).toHaveLength(0);
    expect(result.alreadyExists).toHaveLength(0);
  });

  test('matches by Proceso when IdProceso is undefined', () => {
    const entries = [makeEntry({ taskId: 5 })];
    const dbRows = [{ Fecha: '2024-01-15', Desde: '09:00', Hasta: '10:00', Proceso: 5 }];

    const result = classifyEntries(entries, dbRows);
    expect(result.alreadyExists).toHaveLength(1);
  });

  test('truncates HH:MM:SS to HH:MM for comparison', () => {
    const entries = [makeEntry({ startTime: '09:00:00', endTime: '10:00:00' })];
    const dbRows = [{ Fecha: '2024-01-15', Desde: '09:00:30', Hasta: '10:00:15', IdProceso: 1 }];

    const result = classifyEntries(entries, dbRows);
    expect(result.alreadyExists).toHaveLength(1);
  });

  test('classifies date mismatch as willInsert', () => {
    const entries = [makeEntry({ date: '2024-01-15' })];
    const dbRows = [{ Fecha: '2024-01-16', Desde: '09:00', Hasta: '10:00', IdProceso: 1 }];

    const result = classifyEntries(entries, dbRows);
    expect(result.willInsert).toHaveLength(1);
  });
});
