import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeTrackingPage } from '../TimeTrackingPage';
import { useTimer } from '../../hooks/useTimer';
import { useTimeEntries } from '../../hooks/useTimeEntries';

vi.mock('../../hooks/useTimer');
vi.mock('../../hooks/useTimeEntries');
vi.mock('../../lib/timerCrossingDetector', () => ({
  detectCrossing: () => ({ crossed: false }),
}));
vi.mock('../../components/OverlapAlert', () => ({
  OverlapAlert: () => <div data-testid="overlap-alert" />,
}));
vi.mock('../../components/SyncPanel', () => ({
  SyncPanel: ({ selectedEntries, onSyncComplete }: { selectedEntries: { id: string }[]; onSyncComplete: (ids: string[]) => Promise<void> }) => (
    <div data-testid="sync-panel">
      <span>SyncPanel with {selectedEntries.length} entries</span>
      <button onClick={() => onSyncComplete(selectedEntries.map(e => e.id))}>Mock Sync</button>
    </div>
  ),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockMarkSynced = vi.fn().mockResolvedValue(undefined);

function setupMocks(entries: unknown[] = []) {
  vi.mocked(useTimer).mockReturnValue({
    timerState: null,
    isRunning: false,
    elapsed: 0,
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    updateStartTime: vi.fn(),
  });

  vi.mocked(useTimeEntries).mockReturnValue({
    entries,
    loading: false,
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    markSynced: mockMarkSynced,
    refresh: vi.fn(),
    getEntriesByDateRange: vi.fn(),
  });
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function makeEntry(id: string, synced = false, syncError?: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  const date = toLocalDateString(monday);

  return {
    id,
    taskId: 100,
    taskName: `Task ${id}`,
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date,
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: '',
    createdAt: `${date}T09:00:00Z`,
    updatedAt: `${date}T09:00:00Z`,
    synced,
    syncError,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TimeTrackingPage SyncPanel integration', () => {
  it('does not show sync button when all entries are synced', async () => {
    setupMocks([makeEntry('1', true), makeEntry('2', true)]);
    render(
      <QueryClientProvider client={queryClient}>
        <TimeTrackingPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/sincronizar \d+ registros?/i)).not.toBeInTheDocument();
    });
  });

  it('shows sync button when there are pending entries', async () => {
    setupMocks([makeEntry('1', false), makeEntry('2', true)]);
    render(
      <QueryClientProvider client={queryClient}>
        <TimeTrackingPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Sync \(1\)/i)).toBeInTheDocument();
    });
  });

  it('toggles sync panel open and closed', async () => {
    const user = userEvent.setup();
    setupMocks([makeEntry('1', false), makeEntry('2', false)]);
    render(
      <QueryClientProvider client={queryClient}>
        <TimeTrackingPage />
      </QueryClientProvider>
    );

    const syncBtn = await screen.findByText(/Sync \(2\)/i);
    await user.click(syncBtn);

    await waitFor(() => {
      expect(screen.getByTestId('sync-panel')).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Sync \(2\)/i));

    await waitFor(() => {
      expect(screen.queryByTestId('sync-panel')).not.toBeInTheDocument();
    });
  });

  it('does not show sync panel when zero pending entries', async () => {
    setupMocks([makeEntry('1', true)]);
    render(
      <QueryClientProvider client={queryClient}>
        <TimeTrackingPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/sincronizar \d+ registros?/i)).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('sync-panel')).not.toBeInTheDocument();
  });

  it('passes pending entries to SyncPanel and calls markSynced on sync', async () => {
    const user = userEvent.setup();
    setupMocks([makeEntry('e1', false), makeEntry('e2', false)]);
    render(
      <QueryClientProvider client={queryClient}>
        <TimeTrackingPage />
      </QueryClientProvider>
    );

    // Open sync panel
    const syncBtn = await screen.findByText(/Sync \(2\)/i);
    await user.click(syncBtn);

    await waitFor(() => {
      expect(screen.getByTestId('sync-panel')).toBeInTheDocument();
    });

    expect(screen.getByText('SyncPanel with 2 entries')).toBeInTheDocument();

    // Click mock sync button — this calls onSyncComplete which is markSynced
    await user.click(screen.getByText('Mock Sync'));

    await waitFor(() => {
      expect(mockMarkSynced).toHaveBeenCalledWith(['e1', 'e2']);
    });
  });
});
