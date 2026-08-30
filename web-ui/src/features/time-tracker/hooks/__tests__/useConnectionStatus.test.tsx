import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConnectionStatus } from '../useConnectionStatus';

const mockPost = vi.fn();
const mockDbGet = vi.fn();
const mockConnectivityGet = vi.fn();
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
}));

describe('useConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockDbGet.mockReturnValue({ server: 'srv', database: 'db', username: 'user', password: 'pass' });
    mockConnectivityGet.mockReturnValue({ pollingIntervalMinutes: 5, freshnessThresholdDays: 7 });
    mockPost.mockResolvedValue({ success: true, data: { success: true, message: 'ok' } });
    // jsdom visibilityState is read-only; define it writable
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true, configurable: true });
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('starts as checking then becomes connected on success', async () => {
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.status).toBe('checking');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(result.current.lastCheckedAt).not.toBeNull();
    expect(mockPost).toHaveBeenCalledWith('/test-connection', expect.objectContaining({ server: 'srv' }));
  });

  it('becomes disconnected when test-connection returns success false', async () => {
    mockPost.mockResolvedValue({ success: false, message: 'fail' });

    const { result } = renderHook(() => useConnectionStatus());

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.status).toBe('disconnected'));
  });

  it('becomes disconnected when test-connection throws', async () => {
    mockPost.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useConnectionStatus());

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.status).toBe('disconnected'));
  });

  it('becomes disconnected immediately without API call when db config incomplete', async () => {
    mockDbGet.mockReturnValue({ server: '', database: '', username: '', password: '' });

    const { result } = renderHook(() => useConnectionStatus());

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.status).toBe('disconnected'));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('polls at configured interval only when visible', async () => {
    mockConnectivityGet.mockReturnValue({ pollingIntervalMinutes: 1, freshnessThresholdDays: 7 });
    const { result } = renderHook(() => useConnectionStatus());

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Advance 1 min -> second poll
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(mockPost).toHaveBeenCalledTimes(2);

    // Hide tab -> polling paused
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true, configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    // Should not have polled while hidden
    expect(mockPost).toHaveBeenCalledTimes(2);

    // Back to visible -> immediate check
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true, configurable: true });
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mockPost).toHaveBeenCalledTimes(3);
  });

  it('restarts polling when connectivityConfig changes interval', async () => {
    mockConnectivityGet.mockReturnValue({ pollingIntervalMinutes: 5, freshnessThresholdDays: 7 });
    renderHook(() => useConnectionStatus());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Simulate config change to 1 min
    mockConnectivityGet.mockReturnValue({ pollingIntervalMinutes: 1, freshnessThresholdDays: 7 });
    act(() => { connectivitySubscribeCb?.(); });

    // Now 1 min interval should trigger faster
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('refresh function triggers immediate check and sets checking', async () => {
    mockPost.mockResolvedValue({ success: true, data: { success: true, message: 'ok' } });
    const { result } = renderHook(() => useConnectionStatus());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await waitFor(() => expect(result.current.status).toBe('connected'));

    mockPost.mockResolvedValueOnce({ success: false, message: 'fail' });
    await act(async () => { await result.current.refresh(); });
    expect(result.current.status).toBe('disconnected');
  });

  it('clamps polling interval to 1-30 range (uses 30 when configured 100)', async () => {
    mockConnectivityGet.mockReturnValue({ pollingIntervalMinutes: 100, freshnessThresholdDays: 7 });
    renderHook(() => useConnectionStatus());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Should have scheduled next poll at 30 min, not 100
    await act(async () => { await vi.advanceTimersByTimeAsync(29 * 60_000); });
    expect(mockPost).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(mockPost).toHaveBeenCalledTimes(2);
  });
});
