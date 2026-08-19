import { describe, it, expect } from 'vitest';
import { findEntriesByPendingProcess, propagateRename } from '../pending-process-links';
import type { TimeEntry } from '../../types';

function makeEntry(id: string, taskId: number, taskName: string, synced = false): TimeEntry {
  return {
    id,
    taskId,
    taskName,
    proceso: { proceso: taskId, nombre: taskName },
    date: '2026-06-01',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: `desc ${id}`,
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-06-01T09:00:00Z',
    synced,
  };
}

describe('findEntriesByPendingProcess', () => {
  it('returns the entries whose taskId matches the pending process id', () => {
    const entries = [
      makeEntry('a', -1, 'Pendiente Uno'),
      makeEntry('b', -1, 'Pendiente Uno'),
      makeEntry('c', 42, 'Proceso Real'),
      makeEntry('d', -2, 'Otro Pendiente'),
    ];

    expect(findEntriesByPendingProcess(entries, -1)).toEqual([entries[0], entries[1]]);
  });

  it('returns an empty list when no entry references the pending process', () => {
    const entries = [makeEntry('a', 42, 'Proceso Real')];

    expect(findEntriesByPendingProcess(entries, -1)).toEqual([]);
  });

  it('includes synced entries too (all local copies share the pending id)', () => {
    const entries = [
      makeEntry('a', -1, 'Pendiente', false),
      makeEntry('b', -1, 'Pendiente', true),
    ];

    expect(findEntriesByPendingProcess(entries, -1)).toHaveLength(2);
  });
});

describe('propagateRename', () => {
  it('returns the affected entries with the new taskName without mutating inputs', () => {
    const original = makeEntry('a', -1, 'Viejo Nombre');
    const entries = [original];

    const affected = propagateRename(entries, -1, 'Nuevo Nombre');

    expect(affected).toHaveLength(1);
    expect(affected[0].taskName).toBe('Nuevo Nombre');
    expect(affected[0].id).toBe('a');
    expect(original.taskName).toBe('Viejo Nombre');
  });

  it('propagates the rename to every local entry of the pending process', () => {
    const entries = [
      makeEntry('a', -1, 'Viejo', false),
      makeEntry('b', -1, 'Viejo', true),
      makeEntry('c', 42, 'Real', false),
    ];

    const affected = propagateRename(entries, -1, 'Renombrado');

    expect(affected).toHaveLength(2);
    expect(affected.map((e) => e.taskName)).toEqual(['Renombrado', 'Renombrado']);
  });

  it('does not touch entries of other pending or real processes', () => {
    const entries = [
      makeEntry('a', -1, 'Uno', false),
      makeEntry('b', -2, 'Dos', false),
    ];

    const affected = propagateRename(entries, -1, 'Renombrado');

    expect(affected).toHaveLength(1);
    expect(entries[1].taskName).toBe('Dos');
  });

  it('returns an empty list when there are no linked entries', () => {
    const entries = [makeEntry('a', 42, 'Real', false)];

    expect(propagateRename(entries, -1, 'Renombrado')).toEqual([]);
  });
});
