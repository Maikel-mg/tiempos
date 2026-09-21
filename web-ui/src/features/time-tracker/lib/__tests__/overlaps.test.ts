import { describe, it, expect } from 'vitest';
import { buildOverlapFixes, findOverlaps } from '../overlaps';
import type { TimeEntry } from '../../types';

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'entry-1',
    taskId: 100,
    taskName: 'Desarrollo',
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date: '2026-01-15',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: 'Test entry',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

describe('findOverlaps', () => {
  it('returns nothing without entries', () => {
    expect(findOverlaps([])).toEqual([]);
  });

  it('ignores entries on different days', () => {
    const entries = [
      makeEntry({ id: 'a', date: '2026-01-15', startTime: '09:00', endTime: '10:00' }),
      makeEntry({ id: 'b', date: '2026-01-16', startTime: '09:00', endTime: '10:00' }),
    ];

    expect(findOverlaps(entries)).toEqual([]);
  });

  it('does not treat touching entries as an overlap', () => {
    const entries = [
      makeEntry({ id: 'a', startTime: '09:00', endTime: '10:00' }),
      makeEntry({ id: 'b', startTime: '10:00', endTime: '11:00' }),
    ];

    expect(findOverlaps(entries)).toEqual([]);
  });

  it('detects a partial overlap and orders the pair by start time', () => {
    const later = makeEntry({ id: 'later', startTime: '09:30', endTime: '11:00' });
    const earlier = makeEntry({ id: 'earlier', startTime: '09:00', endTime: '10:00' });

    const pairs = findOverlaps([later, earlier]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].earlier.id).toBe('earlier');
    expect(pairs[0].later.id).toBe('later');
  });

  it('detects an exact duplicate', () => {
    const entries = [
      makeEntry({ id: 'original', startTime: '09:00', endTime: '10:00' }),
      makeEntry({ id: 'copia', startTime: '09:00', endTime: '10:00' }),
    ];

    expect(findOverlaps(entries)).toHaveLength(1);
  });

  it('detects an entry contained inside another', () => {
    const entries = [
      makeEntry({ id: 'largo', startTime: '09:00', endTime: '12:00' }),
      makeEntry({ id: 'corto', startTime: '10:00', endTime: '11:00' }),
    ];

    const pairs = findOverlaps(entries);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].earlier.id).toBe('largo');
    expect(pairs[0].later.id).toBe('corto');
  });

  it('reports every overlapping pair when three entries collide', () => {
    const entries = [
      makeEntry({ id: 'a', startTime: '09:00', endTime: '10:00' }),
      makeEntry({ id: 'b', startTime: '09:30', endTime: '10:30' }),
      makeEntry({ id: 'c', startTime: '10:00', endTime: '11:00' }),
    ];

    const pairs = findOverlaps(entries);

    expect(pairs).toHaveLength(2);
    expect(pairs.map((p) => `${p.earlier.id}-${p.later.id}`)).toEqual(['a-b', 'b-c']);
  });
});

describe('buildOverlapFixes', () => {
  it('only offers to move the copy when the overlap is an exact duplicate', () => {
    const [pair] = findOverlaps([
      makeEntry({ id: 'original', startTime: '09:00', endTime: '10:00', duration: 3600 }),
      makeEntry({ id: 'copia', startTime: '09:00', endTime: '10:00', duration: 3600 }),
    ]);

    const fixes = buildOverlapFixes(pair);

    expect(fixes).toHaveLength(1);
    expect(fixes[0].kind).toBe('move-after');
    expect(fixes[0].entryId).toBe('copia');
    expect(fixes[0].patch).toEqual({ startTime: '10:00', endTime: '11:00' });
  });

  it('offers both fixes on a partial overlap', () => {
    const [pair] = findOverlaps([
      makeEntry({ id: 'a', startTime: '09:00', endTime: '10:00' }),
      makeEntry({ id: 'b', startTime: '09:30', endTime: '11:00' }),
    ]);

    const fixes = buildOverlapFixes(pair);

    expect(fixes).toEqual([
      {
        kind: 'shorten-previous',
        entryId: 'a',
        patch: { endTime: '09:30' },
        label: 'Terminar a las 09:30',
      },
      {
        kind: 'move-after',
        entryId: 'b',
        patch: { startTime: '10:00', endTime: '11:30' },
        label: 'Mover a 10:00-11:30',
      },
    ]);
  });

  it('keeps the later entry duration when moving it after', () => {
    const [pair] = findOverlaps([
      makeEntry({ id: 'a', startTime: '09:00', endTime: '10:00' }),
      makeEntry({ id: 'b', startTime: '09:45', endTime: '10:15' }),
    ]);

    const [, moveFix] = buildOverlapFixes(pair);

    expect(moveFix.patch).toEqual({ startTime: '10:00', endTime: '10:30' });
  });

  it('does not suggest moving past midnight', () => {
    const [pair] = findOverlaps([
      makeEntry({ id: 'a', startTime: '23:00', endTime: '23:30' }),
      makeEntry({ id: 'b', startTime: '23:15', endTime: '23:45' }),
    ]);

    const fixes = buildOverlapFixes(pair);

    expect(fixes.map((f) => f.kind)).toEqual(['shorten-previous']);
  });

  it('pads single-digit minutes in the suggested times', () => {
    const [pair] = findOverlaps([
      makeEntry({ id: 'a', startTime: '09:05', endTime: '09:55' }),
      makeEntry({ id: 'b', startTime: '09:30', endTime: '09:40' }),
    ]);

    const fixes = buildOverlapFixes(pair);

    expect(fixes[0].patch).toEqual({ endTime: '09:30' });
    expect(fixes[1].patch).toEqual({ startTime: '09:55', endTime: '10:05' });
  });
});
