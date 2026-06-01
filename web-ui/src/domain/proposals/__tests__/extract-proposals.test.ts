import { describe, it, expect } from 'vitest';
import { extractProposals } from '../extract-proposals';
import type { TimeEntry } from '../../../lib/types';

function makeEntry(overrides: Partial<TimeEntry> & { description: string }): TimeEntry {
  return {
    id: overrides.id ?? 'entry-1',
    taskName: overrides.taskName ?? '2026-05. General',
    description: overrides.description,
    timeInterval: overrides.timeInterval ?? {
      start: '2026-05-01T09:00:00Z',
      end: '2026-05-01T12:00:00Z',
      duration: 10800, // 3 hours in seconds
    },
    ...overrides,
  };
}

describe('extractProposals', () => {
  describe('grouping by description', () => {
    it('groups entries with the same description in the same generic task', () => {
      const entries = [
        makeEntry({ id: 'e1', description: 'Fix login timeout' }),
        makeEntry({ id: 'e2', description: 'Fix login timeout' }),
        makeEntry({ id: 'e3', description: 'Update navbar styles' }),
      ];

      const proposals = extractProposals(entries, 0);

      expect(proposals).toHaveLength(2);

      const loginProposal = proposals.find(p => p.description === 'Fix login timeout');
      expect(loginProposal).toBeDefined();
      expect(loginProposal!.entryCount).toBe(2);
      expect(loginProposal!.entryIds).toEqual(['e1', 'e2']);

      const navbarProposal = proposals.find(p => p.description === 'Update navbar styles');
      expect(navbarProposal).toBeDefined();
      expect(navbarProposal!.entryCount).toBe(1);
      expect(navbarProposal!.entryIds).toEqual(['e3']);
    });

    it('does NOT group entries with different descriptions even in same generic task', () => {
      const entries = [
        makeEntry({ id: 'e1', description: 'Fix A' }),
        makeEntry({ id: 'e2', description: 'Fix B' }),
      ];

      const proposals = extractProposals(entries, 0);

      expect(proposals).toHaveLength(2);
    });

    it('does NOT group entries from different generic tasks even with same description', () => {
      const entries = [
        makeEntry({ id: 'e1', description: 'Fix login', taskName: '2026-05. General' }),
        makeEntry({ id: 'e2', description: 'Fix login', taskName: '2026-05. Errores' }),
      ];

      const proposals = extractProposals(entries, 0);

      expect(proposals).toHaveLength(2);

      const general = proposals.find(p => p.genericTask === '2026-05. General');
      const errores = proposals.find(p => p.genericTask === '2026-05. Errores');
      expect(general).toBeDefined();
      expect(errores).toBeDefined();
      expect(general!.entryIds).toEqual(['e1']);
      expect(errores!.entryIds).toEqual(['e2']);
    });
  });

  describe('hour aggregation', () => {
    it('sums duration when it is a number (seconds)', () => {
      const entries = [
        makeEntry({
          id: 'e1',
          description: 'Fix A',
          timeInterval: { start: '2026-05-01T09:00:00Z', end: '2026-05-01T12:00:00Z', duration: 10800 },
        }),
        makeEntry({
          id: 'e2',
          description: 'Fix A',
          timeInterval: { start: '2026-05-02T09:00:00Z', end: '2026-05-02T11:00:00Z', duration: 7200 },
        }),
      ];

      const proposals = extractProposals(entries, 0);
      const proposal = proposals.find(p => p.description === 'Fix A');

      // 10800 + 7200 = 18000 seconds = 5 hours
      expect(proposal!.totalHours).toBe(5);
    });

    it('parses ISO 8601 duration strings', () => {
      const entries = [
        makeEntry({
          id: 'e1',
          description: 'Fix B',
          timeInterval: { start: '2026-05-01T09:00:00Z', end: '2026-05-01T11:30:00Z', duration: 'PT2H30M' },
        }),
        makeEntry({
          id: 'e2',
          description: 'Fix B',
          timeInterval: { start: '2026-05-02T14:00:00Z', end: '2026-05-02T16:00:00Z', duration: 'PT2H' },
        }),
      ];

      const proposals = extractProposals(entries, 0);
      const proposal = proposals.find(p => p.description === 'Fix B');

      // 2.5 + 2 = 4.5 hours
      expect(proposal!.totalHours).toBe(4.5);
    });
  });

  describe('proposed name generation', () => {
    it('generates name as {PROYECTO} {YYYY-MM}. {description} from generic task name', () => {
      const entries = [
        makeEntry({
          id: 'e1',
          taskName: 'IPKWEB 2026-05. General',
          description: 'Fix login timeout',
          projectId: 'abc123',
        }),
      ];

      const proposals = extractProposals(entries, 0);
      const proposal = proposals.find(p => p.description === 'Fix login timeout');

      expect(proposal!.proposedName).toBe('IPKWEB 2026-05. Fix login timeout');
      expect(proposal!.projectCode).toBe('IPKWEB');
      expect(proposal!.period).toBe('2026-05');
    });

    it('extracts project code from entries when generic task has no project prefix', () => {
      const entries = [
        makeEntry({
          id: 'e1',
          taskName: '2026-05. General',
          description: 'Fix login timeout',
          project: { name: 'IPKWEB - Intranet' },
        }),
      ];

      const proposals = extractProposals(entries, 0);
      const proposal = proposals.find(p => p.description === 'Fix login timeout');

      expect(proposal!.projectCode).toBe('IPKWEB');
      expect(proposal!.proposedName).toBe('IPKWEB 2026-05. Fix login timeout');
    });

    it('uses period from generic task name', () => {
      const entries = [
        makeEntry({
          id: 'e1',
          taskName: 'MODAT 2026-03. Errores',
          description: 'Fix validation',
        }),
      ];

      const proposals = extractProposals(entries, 0);
      const proposal = proposals.find(p => p.description === 'Fix validation');

      expect(proposal!.period).toBe('2026-03');
      expect(proposal!.proposedName).toBe('MODAT 2026-03. Fix validation');
    });
  });

  describe('threshold filtering', () => {
    it('excludes groups where total hours do not exceed threshold', () => {
      // 3h + 2h = 5h — below default 8h threshold
      const entries = [
        makeEntry({
          id: 'e1',
          description: 'Small task',
          timeInterval: { start: '2026-05-01T09:00:00Z', end: '2026-05-01T12:00:00Z', duration: 10800 },
        }),
        makeEntry({
          id: 'e2',
          description: 'Small task',
          timeInterval: { start: '2026-05-02T09:00:00Z', end: '2026-05-02T11:00:00Z', duration: 7200 },
        }),
      ];

      const proposals = extractProposals(entries);

      expect(proposals).toHaveLength(0);
    });

    it('includes groups where total hours exceed threshold', () => {
      // 5h + 4h = 9h — above default 8h threshold
      const entries = [
        makeEntry({
          id: 'e1',
          description: 'Big task',
          timeInterval: { start: '2026-05-01T09:00:00Z', end: '2026-05-01T14:00:00Z', duration: 18000 },
        }),
        makeEntry({
          id: 'e2',
          description: 'Big task',
          timeInterval: { start: '2026-05-02T09:00:00Z', end: '2026-05-02T13:00:00Z', duration: 14400 },
        }),
      ];

      const proposals = extractProposals(entries);

      expect(proposals).toHaveLength(1);
      expect(proposals[0].totalHours).toBe(9);
    });

    it('respects custom threshold parameter', () => {
      // 3h + 2h = 5h — above 4h threshold but below 8h
      const entries = [
        makeEntry({
          id: 'e1',
          description: 'Medium task',
          timeInterval: { start: '2026-05-01T09:00:00Z', end: '2026-05-01T12:00:00Z', duration: 10800 },
        }),
        makeEntry({
          id: 'e2',
          description: 'Medium task',
          timeInterval: { start: '2026-05-02T09:00:00Z', end: '2026-05-02T11:00:00Z', duration: 7200 },
        }),
      ];

      const proposals = extractProposals(entries, 4);

      expect(proposals).toHaveLength(1);
      expect(proposals[0].totalHours).toBe(5);
    });

    it('excludes groups at exactly the threshold (must exceed, not equal)', () => {
      // Exactly 8h — should be excluded (> not >=)
      const entries = [
        makeEntry({
          id: 'e1',
          description: 'Exact threshold',
          timeInterval: { start: '2026-05-01T09:00:00Z', end: '2026-05-01T17:00:00Z', duration: 28800 },
        }),
      ];

      const proposals = extractProposals(entries);

      expect(proposals).toHaveLength(0);
    });
  });

  describe('date range', () => {
    it('sets fechaInicio to earliest start and fechaFin to latest end across grouped entries', () => {
      const entries = [
        makeEntry({
          id: 'e1',
          description: 'Fix dates',
          timeInterval: { start: '2026-05-10T09:00:00Z', end: '2026-05-10T12:00:00Z', duration: 10800 },
        }),
        makeEntry({
          id: 'e2',
          description: 'Fix dates',
          timeInterval: { start: '2026-05-05T14:00:00Z', end: '2026-05-15T18:00:00Z', duration: 14400 },
        }),
      ];

      const proposals = extractProposals(entries, 0);
      const proposal = proposals.find(p => p.description === 'Fix dates');

      expect(proposal!.fechaInicio).toBe('2026-05-05T14:00:00Z');
      expect(proposal!.fechaFin).toBe('2026-05-15T18:00:00Z');
    });
  });

  describe('empty input', () => {
    it('returns empty array when no entries are provided', () => {
      expect(extractProposals([])).toEqual([]);
    });

    it('returns empty array when no entries match generic patterns', () => {
      const entries = [
        makeEntry({ id: 'e1', description: 'Fix', taskName: 'IPKWEB Login page' }),
      ];

      expect(extractProposals(entries)).toEqual([]);
    });
  });

  describe('mixed duration formats', () => {
    it('correctly aggregates entries with mixed number and ISO 8601 durations', () => {
      const entries = [
        makeEntry({
          id: 'e1',
          description: 'Mixed task',
          timeInterval: { start: '2026-05-01T09:00:00Z', end: '2026-05-01T12:00:00Z', duration: 10800 },
        }),
        makeEntry({
          id: 'e2',
          description: 'Mixed task',
          timeInterval: { start: '2026-05-02T09:00:00Z', end: '2026-05-02T11:30:00Z', duration: 'PT2H30M' },
        }),
      ];

      const proposals = extractProposals(entries, 0);
      const proposal = proposals.find(p => p.description === 'Mixed task');

      // 3h + 2.5h = 5.5h
      expect(proposal!.totalHours).toBe(5.5);
    });
  });
});
