import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConfigGuard } from '../useConfigGuard';

// Mock config/stores — we control what dbConfig.get() returns
vi.mock('@/config/stores', () => ({
  dbConfig: {
    get: vi.fn(),
    subscribe: vi.fn(() => vi.fn()), // returns unsubscribe
  },
  scheduleConfig: {
    get: () => ({
      defaultHours: { mon: 8.25, tue: 8.25, wed: 8.25, thu: 8.25, fri: 7, sat: 0, sun: 0 },
      exceptions: [],
    }),
  },
}));

import { dbConfig } from '@/config/stores';

const mockGet = vi.mocked(dbConfig.get);
const mockSubscribe = vi.mocked(dbConfig.subscribe);

describe('useConfigGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isReady=false when server is missing', () => {
    mockGet.mockReturnValue({
      server: '',
      database: 'mydb',
      username: 'sa',
      password: 'pass',
    });

    const { result } = renderHook(() => useConfigGuard());

    expect(result.current.isReady).toBe(false);
  });

  it('returns isReady=false when database is missing', () => {
    mockGet.mockReturnValue({
      server: 'localhost',
      database: '',
      username: 'sa',
      password: 'pass',
    });

    const { result } = renderHook(() => useConfigGuard());

    expect(result.current.isReady).toBe(false);
  });

  it('returns isReady=true when both server and database are present', () => {
    mockGet.mockReturnValue({
      server: 'localhost',
      database: 'mydb',
      username: 'sa',
      password: 'pass',
    });

    const { result } = renderHook(() => useConfigGuard());

    expect(result.current.isReady).toBe(true);
  });

  it('subscribes to dbConfig changes', () => {
    mockGet.mockReturnValue({
      server: '',
      database: '',
      username: '',
      password: '',
    });

    renderHook(() => useConfigGuard());

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });
});
