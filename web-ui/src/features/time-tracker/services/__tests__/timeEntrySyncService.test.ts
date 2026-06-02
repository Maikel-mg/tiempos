import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncTimeEntries } from '../timeEntrySyncService';
import type { TimeEntry } from '../types';
import type { DbConfig } from '@/lib/types';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api/client';

const mockPost = vi.mocked(apiClient.post);

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

const DB_CONFIG: DbConfig = {
  server: 'localhost',
  database: 'testdb',
  username: 'sa',
  password: 'pass',
};

const USUARIO = 'MG01';

describe('syncTimeEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with results when all entries sync', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: {
        success: true,
        results: [
          { entryId: 'e1', success: true, serverId: 1 },
          { entryId: 'e2', success: true, serverId: 2 },
        ],
      },
    });

    const entries = [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })];
    const result = await syncTimeEntries(entries, DB_CONFIG, USUARIO);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({ entryId: 'e1', success: true, serverId: 1 });
    expect(result.results[1]).toEqual({ entryId: 'e2', success: true, serverId: 2 });
  });

  it('returns mixed results on partial failure', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: {
        success: true,
        results: [
          { entryId: 'e1', success: true, serverId: 1 },
          { entryId: 'e2', success: false, error: 'Duplicate key' },
        ],
      },
    });

    const entries = [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })];
    const result = await syncTimeEntries(entries, DB_CONFIG, USUARIO);

    expect(result.success).toBe(true);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);
    expect(result.results[1].error).toBe('Duplicate key');
  });

  it('returns all errors when every entry fails', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: {
        success: true,
        results: [
          { entryId: 'e1', success: false, error: 'SP error' },
          { entryId: 'e2', success: false, error: 'SP error' },
        ],
      },
    });

    const entries = [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })];
    const result = await syncTimeEntries(entries, DB_CONFIG, USUARIO);

    expect(result.success).toBe(true);
    expect(result.results.every((r) => r.success === false)).toBe(true);
  });

  it('returns error result on network error, never throws', async () => {
    mockPost.mockRejectedValue(new Error('Network timeout'));

    const entries = [makeEntry({ id: 'e1' })];
    const result = await syncTimeEntries(entries, DB_CONFIG, USUARIO);

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
  });

  it('returns empty results for empty entries list', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { success: true, results: [] },
    });

    const result = await syncTimeEntries([], DB_CONFIG, USUARIO);

    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
  });

  it('passes correct parameters to apiClient.post', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { success: true, results: [] },
    });

    const entries = [makeEntry({ id: 'e1' })];
    await syncTimeEntries(entries, DB_CONFIG, USUARIO);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/execute-time-entries', {
      server: 'localhost',
      database: 'testdb',
      username: 'sa',
      password: 'pass',
      entries: [
        {
          entryId: 'e1',
          Usured: 'MG01',
          Fecha: '20260115',
          HoraDesde: '09:00',
          HoraHasta: '10:00',
          Minutos: 3600,
          Proceso: 100,
          pTipoHora: 11,
        },
      ],
    });
  });
});
