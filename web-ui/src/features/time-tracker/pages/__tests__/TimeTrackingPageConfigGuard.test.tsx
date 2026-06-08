import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeTrackingPage } from '../TimeTrackingPage';
import { useTimer } from '../../hooks/useTimer';
import { useTimeEntries } from '../../hooks/useTimeEntries';

vi.mock('../../hooks/useTimer');
vi.mock('../../hooks/useTimeEntries');
vi.mock('../../lib/timerCrossingDetector', () => ({
  detectCrossing: () => ({ crossed: false }),
}));

// Mock config/stores with INCOMPLETE dbConfig
const mockDbConfigGet = vi.fn(() => ({
  server: '',
  database: '',
  username: '',
  password: '',
}));

vi.mock('@/config/stores', () => ({
  dbConfig: {
    get: (...args: unknown[]) => mockDbConfigGet(...args),
    subscribe: vi.fn(() => vi.fn()),
  },
  wizardConfig: {
    get: () => ({ usuario: 'MG01', fase: '1', tipoHora: '11' }),
  },
}));

vi.mock('@/lib/task-mapping-storage', () => ({
  loadMappings: () => ({}),
}));

// Mock SyncPanel's dependency — syncTimeEntries
vi.mock('../../services/timeEntrySyncService', () => ({
  syncTimeEntries: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

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
    markSynced: vi.fn(),
    refresh: vi.fn(),
    getEntriesByDateRange: vi.fn(),
  });
}

function makeEntry(id: string, synced = false) {
  return {
    id,
    taskId: 100,
    taskName: `Task ${id}`,
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date: '2026-01-15',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: '',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
    synced,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TimeTrackingPage — config guard integration', () => {
  it('shows guard panel instead of execute button when dbConfig is incomplete', async () => {
    const user = userEvent.setup();
    setupMocks([makeEntry('e1', false)]);

    render(
      <MemoryRouter initialEntries={['/time-tracker']}>
        <QueryClientProvider client={queryClient}>
          <TimeTrackingPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    // Open the records tab
    await user.click(screen.getByRole('button', { name: /mis registros/i }));

    // Open the sync panel
    const syncBtn = await screen.findByText(/sincronizar 1 registros?/i);
    await user.click(syncBtn);

    // The guard panel should be visible
    await waitFor(() => {
      expect(screen.getByText(/configuración de base de datos/i)).toBeInTheDocument();
    });

    // The execute button should NOT be present
    expect(screen.queryByRole('button', { name: /ejecutar en bbdd/i })).not.toBeInTheDocument();

    // The "Ir a Settings" CTA should be present
    expect(screen.getByRole('button', { name: /ir a settings/i })).toBeInTheDocument();
  });

  it('page loads normally even with empty dbConfig — no redirect on mount', async () => {
    setupMocks([makeEntry('e1', false)]);

    render(
      <MemoryRouter initialEntries={['/time-tracker']}>
        <QueryClientProvider client={queryClient}>
          <TimeTrackingPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    // Page should render without redirect — timer widget and tabs should be visible
    expect(screen.getByRole('button', { name: /nuevo registro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mis registros/i })).toBeInTheDocument();
  });
});
