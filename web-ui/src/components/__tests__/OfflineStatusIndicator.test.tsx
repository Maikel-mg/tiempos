import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OfflineStatusIndicator } from '../OfflineStatusIndicator';

const mockUseOfflineIndicator = vi.fn();

vi.mock('@/features/time-tracker/hooks/useOfflineIndicator', () => ({
  useOfflineIndicator: () => mockUseOfflineIndicator(),
}));

function renderIndicator(collapsed = false) {
  return render(
    <MemoryRouter>
      <OfflineStatusIndicator collapsed={collapsed} />
    </MemoryRouter>
  );
}

describe('OfflineStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows pending count', () => {
    mockUseOfflineIndicator.mockReturnValue({
      pendingCount: 3,
      lastUpdated: Date.now(),
      connectionStatus: 'connected',
      lastCheckedAt: Date.now(),
      isStale: false,
      staleDays: 1,
      loading: false,
      refreshConnection: vi.fn(),
      refresh: vi.fn(),
    });
    renderIndicator(false);
    expect(screen.getByTestId('offline-pending-count').textContent).toBe('3');
  });

  it('shows 0 when no pending', () => {
    mockUseOfflineIndicator.mockReturnValue({
      pendingCount: 0,
      lastUpdated: Date.now(),
      connectionStatus: 'connected',
      lastCheckedAt: Date.now(),
      isStale: false,
      staleDays: 0,
      loading: false,
      refreshConnection: vi.fn(),
      refresh: vi.fn(),
    });
    renderIndicator(false);
    expect(screen.getByTestId('offline-pending-count').textContent).toBe('0');
  });

  it('shows lastUpdated formatted and connection status', () => {
    const ts = Date.now();
    mockUseOfflineIndicator.mockReturnValue({
      pendingCount: 1,
      lastUpdated: ts,
      connectionStatus: 'connected',
      lastCheckedAt: ts,
      isStale: false,
      staleDays: 0,
      loading: false,
      refreshConnection: vi.fn(),
      refresh: vi.fn(),
    });
    renderIndicator(false);
    expect(screen.getByTestId('offline-last-updated')).toBeDefined();
    expect(screen.getByTestId('offline-connection-status').textContent).toContain('Conectado');
  });

  it('shows Sin conexión when disconnected', () => {
    mockUseOfflineIndicator.mockReturnValue({
      pendingCount: 0,
      lastUpdated: null,
      connectionStatus: 'disconnected',
      lastCheckedAt: Date.now(),
      isStale: true,
      staleDays: null,
      loading: false,
      refreshConnection: vi.fn(),
      refresh: vi.fn(),
    });
    renderIndicator(false);
    expect(screen.getByTestId('offline-connection-status').textContent).toContain('Sin conexión');
  });

  it('shows Comprobando when checking', () => {
    mockUseOfflineIndicator.mockReturnValue({
      pendingCount: 0,
      lastUpdated: null,
      connectionStatus: 'checking',
      lastCheckedAt: null,
      isStale: true,
      staleDays: null,
      loading: true,
      refreshConnection: vi.fn(),
      refresh: vi.fn(),
    });
    renderIndicator(false);
    expect(screen.getByTestId('offline-connection-status').textContent).toContain('Comprobando');
  });

  it('shows amber warning when stale', () => {
    mockUseOfflineIndicator.mockReturnValue({
      pendingCount: 2,
      lastUpdated: Date.now() - 10 * 24 * 60 * 60 * 1000,
      connectionStatus: 'disconnected',
      lastCheckedAt: Date.now(),
      isStale: true,
      staleDays: 10,
      loading: false,
      refreshConnection: vi.fn(),
      refresh: vi.fn(),
    });
    renderIndicator(false);
    const warning = screen.getByTestId('offline-stale-warning');
    expect(warning).toBeDefined();
    expect(warning.textContent).toContain('10 días');
    expect(warning.textContent).toContain('conecta para refrescar');
    expect(screen.getByTestId('offline-stale-link')).toBeDefined();
  });

  it('does not show amber warning when fresh (never blocks)', () => {
    mockUseOfflineIndicator.mockReturnValue({
      pendingCount: 5,
      lastUpdated: Date.now(),
      connectionStatus: 'disconnected',
      lastCheckedAt: Date.now(),
      isStale: false,
      staleDays: 0,
      loading: false,
      refreshConnection: vi.fn(),
      refresh: vi.fn(),
    });
    renderIndicator(false);
    expect(screen.queryByTestId('offline-stale-warning')).toBeNull();
    // Still shows pending count (work not blocked)
    expect(screen.getByTestId('offline-pending-count').textContent).toBe('5');
  });

  it('collapsed mode shows pending badge and connection icon', () => {
    mockUseOfflineIndicator.mockReturnValue({
      pendingCount: 4,
      lastUpdated: Date.now(),
      connectionStatus: 'connected',
      lastCheckedAt: Date.now(),
      isStale: false,
      staleDays: 0,
      loading: false,
      refreshConnection: vi.fn(),
      refresh: vi.fn(),
    });
    renderIndicator(true);
    expect(screen.getByTestId('offline-indicator-collapsed')).toBeDefined();
    expect(screen.getByTestId('offline-pending-badge').textContent).toBe('4');
    expect(screen.getByTestId('offline-connection-icon')).toBeDefined();
  });

  it('collapsed shows stale icon when stale', () => {
    mockUseOfflineIndicator.mockReturnValue({
      pendingCount: 0,
      lastUpdated: Date.now() - 20 * 24 * 60 * 60 * 1000,
      connectionStatus: 'disconnected',
      lastCheckedAt: Date.now(),
      isStale: true,
      staleDays: 20,
      loading: false,
      refreshConnection: vi.fn(),
      refresh: vi.fn(),
    });
    renderIndicator(true);
    expect(screen.getByTestId('offline-stale-icon')).toBeDefined();
  });
});
