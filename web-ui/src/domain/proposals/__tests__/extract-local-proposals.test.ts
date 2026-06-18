import { describe, it, expect } from 'vitest';
import { extractProposalsFromLocal } from '../extract-local-proposals';
import type { TimeEntry } from '@/features/time-tracker/types';

// Helper para construir TimeEntry local con defaults
function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'test-id-' + Math.random(),
    taskId: 100,
    taskName: 'IPKWEB 2026-06. Errores',
    proceso: { proceso: 100, nombre: 'IPKWEB 2026-06. Errores' },
    date: '2026-06-15',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600, // 1 hora en segundos
    description: 'fix login bug',
    createdAt: '2026-06-15T09:00:00Z',
    updatedAt: '2026-06-15T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

describe('extractProposalsFromLocal', () => {
  it('happy path: entries above threshold produce a proposal', () => {
    const entries = [
      makeEntry({ id: 'e1', duration: 3 * 3600, description: 'fix login bug' }),
      makeEntry({ id: 'e2', duration: 4 * 3600, description: 'fix login bug' }),
      makeEntry({ id: 'e3', duration: 3 * 3600, description: 'fix login bug' }),
    ];
    const proposals = extractProposalsFromLocal(entries, 8);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].totalHours).toBe(10);
    expect(proposals[0].proposedName).toBe('IPKWEB 2026-06. fix login bug');
    expect(proposals[0].entryCount).toBe(3);
  });

  it('below threshold: entries summing under threshold produce no proposals', () => {
    const entries = [
      makeEntry({ id: 'e1', duration: 2 * 3600, description: 'fix login bug' }),
      makeEntry({ id: 'e2', duration: 1.5 * 3600, description: 'fix login bug' }),
      makeEntry({ id: 'e3', duration: 1.5 * 3600, description: 'fix login bug' }),
    ];
    const proposals = extractProposalsFromLocal(entries, 8);

    expect(proposals).toHaveLength(0);
  });

  it('non-generic task: entries against non-generic task produce no proposals', () => {
    const entries = [
      makeEntry({ id: 'e1', taskName: 'IPKWEB 2026-06. Implementación módulo X', duration: 10 * 3600 }),
      makeEntry({ id: 'e2', taskName: 'IPKWEB 2026-06. Implementación módulo X', duration: 10 * 3600 }),
    ];
    const proposals = extractProposalsFromLocal(entries, 8);

    expect(proposals).toHaveLength(0);
  });

  it('normalized descriptions: variations in case/spacing are grouped', () => {
    const entries = [
      makeEntry({ id: 'e1', duration: 4 * 3600, description: 'Fix login bug' }),
      makeEntry({ id: 'e2', duration: 3 * 3600, description: 'fix login bug ' }),
      makeEntry({ id: 'e3', duration: 3 * 3600, description: 'FIX LOGIN BUG' }),
    ];
    const proposals = extractProposalsFromLocal(entries, 8);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].entryCount).toBe(3);
    expect(proposals[0].totalHours).toBe(10);
  });

  it('different generic tasks: same description on General vs Errores produces 2 proposals', () => {
    const entries = [
      makeEntry({ id: 'e1', taskName: 'IPKWEB 2026-06. General', duration: 5 * 3600, description: 'fix login bug' }),
      makeEntry({ id: 'e2', taskName: 'IPKWEB 2026-06. General', duration: 5 * 3600, description: 'fix login bug' }),
      makeEntry({ id: 'e3', taskName: 'IPKWEB 2026-06. Errores', duration: 5 * 3600, description: 'fix login bug' }),
      makeEntry({ id: 'e4', taskName: 'IPKWEB 2026-06. Errores', duration: 5 * 3600, description: 'fix login bug' }),
    ];
    const proposals = extractProposalsFromLocal(entries, 8);

    expect(proposals).toHaveLength(2);
    const names = proposals.map(p => p.genericTask).sort();
    expect(names).toEqual(['IPKWEB 2026-06. Errores', 'IPKWEB 2026-06. General']);
  });

  it('different descriptions: same generic task with different descriptions produces 2 proposals', () => {
    const entries = [
      makeEntry({ id: 'e1', duration: 5 * 3600, description: 'fix login' }),
      makeEntry({ id: 'e2', duration: 5 * 3600, description: 'fix login' }),
      makeEntry({ id: 'e3', duration: 5 * 3600, description: 'fix logout' }),
      makeEntry({ id: 'e4', duration: 5 * 3600, description: 'fix logout' }),
    ];
    const proposals = extractProposalsFromLocal(entries, 8);

    expect(proposals).toHaveLength(2);
    const descs = proposals.map(p => p.description).sort();
    expect(descs).toEqual(['fix login', 'fix logout']);
  });

  it('custom threshold: lower threshold produces proposal for smaller groups', () => {
    const entries = [
      makeEntry({ id: 'e1', duration: 2 * 3600, description: 'fix login bug' }),
      makeEntry({ id: 'e2', duration: 3 * 3600, description: 'fix login bug' }),
    ];
    const proposals = extractProposalsFromLocal(entries, 4);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].totalHours).toBe(5);
  });
});
