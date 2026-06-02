import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSync } from '../index';
import type { SyncValidationRequest, SyncValidationResult } from '../types';
import type { TimeEntry } from '@/lib/types';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api/client';

const mockPost = vi.mocked(apiClient.post);

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    description: 'Dev work',
    timeInterval: {
      start: '2024-01-15T09:00:00Z',
      end: '2024-01-15T12:00:00Z',
      duration: 10800,
    },
    ...overrides,
  };
}

const baseRequest: SyncValidationRequest = {
  dbConfig: {
    server: 'localhost',
    database: 'testdb',
    username: 'sa',
    password: 'pass',
  },
  entries: [makeEntry()],
  usuario: 'testuser',
};

describe('validateSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns typed result on success', async () => {
    const willInsert = [makeEntry({ description: 'New entry' })];
    const alreadyExists = [makeEntry({ description: 'Existing entry' })];

    mockPost.mockResolvedValue({
      success: true,
      data: { success: true, willInsert, alreadyExists },
    });

    const result = await validateSync(baseRequest);

    expect(result).toEqual({ success: true, willInsert, alreadyExists });
    expect(result.success).toBe(true);
  });

  it('returns error object on API failure', async () => {
    mockPost.mockResolvedValue({
      success: false,
      message: 'Connection refused',
    });

    const result = await validateSync(baseRequest);

    expect(result).toEqual({ success: false, message: 'Connection refused' });
    expect(result.success).toBe(false);
  });

  it('returns error object on network error', async () => {
    mockPost.mockRejectedValue(new Error('Network timeout'));

    const result = await validateSync(baseRequest);

    expect(result).toEqual({ success: false, message: 'Network timeout' });
    expect(result.success).toBe(false);
  });

  it('handles empty entries list', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { success: true, willInsert: [], alreadyExists: [] },
    });

    const result = await validateSync({
      ...baseRequest,
      entries: [],
    });

    expect(result).toEqual({ success: true, willInsert: [], alreadyExists: [] });
    expect(mockPost).toHaveBeenCalledWith(
      '/sync-time-entries',
      expect.objectContaining({ entries: [] }),
    );
  });

  it('passes correct parameters to apiClient.post', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { success: true, willInsert: [], alreadyExists: [] },
    });

    await validateSync(baseRequest);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/sync-time-entries', {
      server: 'localhost',
      database: 'testdb',
      username: 'sa',
      password: 'pass',
      entries: baseRequest.entries,
      usuario: 'testuser',
    });
  });
});
