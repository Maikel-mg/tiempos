import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOfflineIndicator } from '../useOfflineIndicator';

const mockPost = vi.fn();
const mockDbGet = vi.fn();
const mockConnectivityGet = vi.fn();
const mockWizardGet = vi.fn();
const mockGetPending = vi.fn();
const mockGetLastUpdated = vi.fn();

let wizardSubscribeCb: ((v: unknown) => void) | null = null;
let connectivitySubscribeCb: (() => void) | null = null;

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: (...args: unknown[]) => mockPost(...args) },
}));

vi.mock('@/config/stores', () => ({
  dbConfig: { get: () => mockDbGet() },
  connectivityConfig: {
    get: () => mockConnectivityGet(),
    subscribe: (cb: () => void) => {
      connectivitySubscribeCb = cb;
      return () => { connectivitySubscribeCb = null; };
    },
  },
  wizardConfig: {
    get: () => mockWizardGet(),
    subscribe: (cb: (v: unknown) => void) => {
      wizardSubscribeCb = cb;
      return () => { wizardSubscribeCb = null; };
    },
  },
}));

vi.mock('@/features/time-tracker/services/ProcessOfflineService', () => ({
  processOfflineService: {
    getPendingProcesses: (...args: unknown[]) => mockGetPending(...args),
    getLastUpdated: (...args: unknown[]) => mockGetLastUpdated(...args),
  },
}));

describe('useOfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockDbGet.mockReturnValue({ server: 'srv', database: 'db', username: 'user', password: 'pass' });
    mockConnectivityGet.mockReturnValue({ pollingIntervalMinutes: 5, freshnessThresholdDays: 7 });
    mockWizardGet.mockReturnValue({ usuario: 'USER_A' });
    mockPost.mockResolvedValue({ success: true, data: { success: true, message: 'ok' } });
    mockGetPending.mockResolvedValue([{ id: -1, nombre: 'P1' }, { id: -2, nombre: 'P2' }]);
    mockGetLastUpdated.mockResolvedValue(Date.now());
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads pendingCount and lastUpdated on mount', async () => {
    const { result } = renderHook(() => useOfflineIndicator());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pendingCount).toBe(2);
    expect(result.current.lastUpdated).not.toBeNull();
    expect(mockGetPending).toHaveBeenCalledWith('USER_A');
  });

  it('shows 0 pending when no usuario configured', async () => {
    mockWizardGet.mockReturnValue({ usuario: '' });
    const { result } = renderHook(() => useOfflineIndicator());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.lastUpdated).toBeNull();
  });

  it('isStale true when cache older than threshold', async () => {
    const old = Date.now() - 10 * 24 * 60 * 60 * 1000;
    mockGetLastUpdated.mockResolvedValue(old);
    const { result } = renderHook(() => useOfflineIndicator());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isStale).toBe(true);
    expect(result.current.staleDays).toBeGreaterThanOrEqual(10);
  });

  it('isStale false when cache fresh', async () => {
    const recent = Date.now() - 2 * 24 * 60 * 60 * 1000;
    mockGetLastUpdated.mockResolvedValue(recent);
    const { result } = renderHook(() => useOfflineIndicator());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isStale).toBe(false);
  });

  it('isStale true when never synced (null)', async () => {
    mockGetLastUpdated.mockResolvedValue(null);
    const { result } = renderHook(() => useOfflineIndicator());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isStale).toBe(true);
  });

  it('refreshes when wizardConfig changes (usuario switch)', async () => {
    const { result } = renderHook(() => useOfflineIndicator());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.pendingCount).toBe(2));

    mockWizardGet.mockReturnValue({ usuario: 'USER_B' });
    mockGetPending.mockResolvedValueOnce([]);
    mockGetLastUpdated.mockResolvedValueOnce(null);

    await act(async () => { wizardSubscribeCb?.({ usuario: 'USER_B' }); await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    expect(mockGetPending).toHaveBeenLastCalledWith('USER_B');
  });

  it('exposes connectionStatus from useConnectionStatus', async () => {
    const { result } = renderHook(() => useOfflineIndicator());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.connectionStatus).toBe('connected'));
  });

  it('updates isStale when freshness threshold changes', async () => {
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    mockGetLastUpdated.mockResolvedValue(fiveDaysAgo);
    mockConnectivityGet.mockReturnValue({ pollingIntervalMinutes: 5, freshnessThresholdDays: 7 });
    const { result } = renderHook(() => useOfflineIndicator());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.isStale).toBe(false));

    mockConnectivityGet.mockReturnValue({ pollingIntervalMinutes: 5, freshnessThresholdDays: 3 });
    await act(async () => { connectivitySubscribeCb?.(); await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.isStale).toBe(true);
  });
});
