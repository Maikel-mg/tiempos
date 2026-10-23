import { describe, it, expect } from 'vitest';
import { computeTaskHours } from '../computeTaskHours';
import type { TimeEntry } from '../../types';

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: '1',
    taskId: 1,
    taskName: 'Test',
    proceso: { proceso: 1, nombre: 'Test' },
    date: '2026-06-11',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    createdAt: '2026-06-11T09:00:00Z',
    updatedAt: '2026-06-11T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

describe('computeTaskHours', () => {
  it('devuelve vacío para array vacío', () => {
    const result = computeTaskHours([]);
    expect(result.sorted).toEqual([]);
    expect(result.byTaskId.size).toBe(0);
    expect(result.grandTotalSeconds).toBe(0);
  });

  it('una entrada única produce un grupo con entryCount 1', () => {
    const result = computeTaskHours([makeEntry({ duration: 1800 })]);
    const group = result.byTaskId.get(1)!;
    expect(group.entryCount).toBe(1);
    expect(group.totalSeconds).toBe(1800);
    expect(group.entries).toHaveLength(1);
    expect(group.taskName).toBe('Test');
    expect(result.grandTotalSeconds).toBe(1800);
  });

  it('suma entradas del mismo taskId y conserva todas', () => {
    const result = computeTaskHours([
      makeEntry({ id: 'a', duration: 600 }),
      makeEntry({ id: 'b', duration: 900 }),
    ]);
    const group = result.byTaskId.get(1)!;
    expect(group.totalSeconds).toBe(1500);
    expect(group.entryCount).toBe(2);
    expect(group.entries.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('separa taskIds distintos y ordena descendente', () => {
    const result = computeTaskHours([
      makeEntry({ id: 'a', taskId: 1, taskName: 'Corta', duration: 600 }),
      makeEntry({ id: 'b', taskId: 2, taskName: 'Larga', duration: 5400 }),
    ]);
    expect(result.byTaskId.size).toBe(2);
    expect(result.sorted.map((g) => g.taskId)).toEqual([2, 1]);
    expect(result.grandTotalSeconds).toBe(6000);
  });

  it('desempata por taskId ascendente para ser determinista', () => {
    const result = computeTaskHours([
      makeEntry({ id: 'a', taskId: 9, duration: 600 }),
      makeEntry({ id: 'b', taskId: 3, duration: 600 }),
    ]);
    expect(result.sorted.map((g) => g.taskId)).toEqual([3, 9]);
  });

  it('toma taskName de la primera entrada del grupo', () => {
    const result = computeTaskHours([
      makeEntry({ id: 'a', taskName: 'Primera' }),
      makeEntry({ id: 'b', taskName: 'Segunda' }),
    ]);
    expect(result.byTaskId.get(1)!.taskName).toBe('Primera');
  });
});
