import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SyncPanel } from '../SyncPanel';
import type { TimeEntry } from '../../types';
import type { SyncOutcome } from '../../services/timeEntrySyncService';

vi.mock('../../services/timeEntrySyncService', () => ({
  syncTimeEntries: vi.fn(),
}));

const mockDbConfigGet = vi.fn(() => ({
  server: 'localhost',
  database: 'testdb',
  username: 'sa',
  password: 'pass',
}));

vi.mock('@/config/stores', () => ({
  wizardConfig: {
    get: () => ({ usuario: 'MG01', fase: '1', tipoHora: '11' }),
  },
  dbConfig: {
    get: (...args: unknown[]) => mockDbConfigGet(...args),
    subscribe: vi.fn(() => vi.fn()),
  },
  scheduleConfig: {
    get: () => ({
      defaultHours: { mon: 8.25, tue: 8.25, wed: 8.25, thu: 8.25, fri: 7, sat: 0, sun: 0 },
      exceptions: [],
    }),
  },
}));

vi.mock('@/lib/task-mapping-storage', () => ({
  loadMappings: () => ({}),
}));

import { syncTimeEntries } from '../../services/timeEntrySyncService';

const mockSyncTimeEntries = vi.mocked(syncTimeEntries);

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

describe('SyncPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders panel with entry count', () => {
    render(
      <SyncPanel
        selectedEntries={[makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })]}
        totalPendingCount={2}
        onSyncComplete={vi.fn()}
      />
    );

    expect(screen.getByText(/Sincronizar 2 registros/)).toBeInTheDocument();
  });

  it('calls syncTimeEntries and onSyncComplete on successful sync', async () => {
    const user = userEvent.setup();
    const onSyncComplete = vi.fn().mockResolvedValue(undefined);

    const outcome: SyncOutcome = {
      success: true,
      results: [
        { entryId: 'e1', success: true, serverId: 1 },
        { entryId: 'e2', success: true, serverId: 2 },
      ],
    };
    mockSyncTimeEntries.mockResolvedValue(outcome);

    render(
      <SyncPanel
        selectedEntries={[makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })]}
        totalPendingCount={2}
        onSyncComplete={onSyncComplete}
      />
    );

    await user.click(screen.getByRole('button', { name: /ejecutar en bbdd/i }));

    await waitFor(() => {
      expect(mockSyncTimeEntries).toHaveBeenCalledTimes(1);
    });

    expect(onSyncComplete).toHaveBeenCalledWith(['e1', 'e2']);
  });

  it('shows per-entry results with success and failure', async () => {
    const user = userEvent.setup();
    const onSyncComplete = vi.fn().mockResolvedValue(undefined);

    const outcome: SyncOutcome = {
      success: true,
      results: [
        { entryId: 'e1', success: true, serverId: 1 },
        { entryId: 'e2', success: false, error: 'Duplicate key' },
      ],
    };
    mockSyncTimeEntries.mockResolvedValue(outcome);

    render(
      <SyncPanel
        selectedEntries={[makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })]}
        totalPendingCount={2}
        onSyncComplete={onSyncComplete}
      />
    );

    await user.click(screen.getByRole('button', { name: /ejecutar en bbdd/i }));

    await waitFor(() => {
      expect(screen.getByText(/Sincronización exitosa/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Duplicate key/)).toBeInTheDocument();
  });

  it('calls onSyncComplete only with succeeded entry IDs', async () => {
    const user = userEvent.setup();
    const onSyncComplete = vi.fn().mockResolvedValue(undefined);

    const outcome: SyncOutcome = {
      success: true,
      results: [
        { entryId: 'e1', success: true, serverId: 1 },
        { entryId: 'e2', success: false, error: 'FK violation' },
      ],
    };
    mockSyncTimeEntries.mockResolvedValue(outcome);

    render(
      <SyncPanel
        selectedEntries={[makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })]}
        totalPendingCount={2}
        onSyncComplete={onSyncComplete}
      />
    );

    await user.click(screen.getByRole('button', { name: /ejecutar en bbdd/i }));

    await waitFor(() => {
      expect(onSyncComplete).toHaveBeenCalledWith(['e1']);
    });
  });

  it('shows error when syncTimeEntries returns failure outcome', async () => {
    const user = userEvent.setup();
    const onSyncComplete = vi.fn().mockResolvedValue(undefined);

    mockSyncTimeEntries.mockResolvedValue({ success: false, results: [] });

    render(
      <SyncPanel
        selectedEntries={[makeEntry({ id: 'e1' })]}
        totalPendingCount={1}
        onSyncComplete={onSyncComplete}
      />
    );

    await user.click(screen.getByRole('button', { name: /ejecutar en bbdd/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });

    expect(onSyncComplete).not.toHaveBeenCalled();
  });

  describe('Config guard — missing dbConfig', () => {
    beforeEach(() => {
      mockDbConfigGet.mockReturnValue({
        server: '',
        database: '',
        username: '',
        password: '',
      });
    });

    it('replaces execute button with warning panel when config is incomplete', () => {
      render(
        <MemoryRouter>
          <SyncPanel
            selectedEntries={[makeEntry({ id: 'e1' })]}
            totalPendingCount={1}
            onSyncComplete={vi.fn()}
          />
        </MemoryRouter>
      );

      expect(screen.queryByRole('button', { name: /ejecutar en bbdd/i })).not.toBeInTheDocument();
      expect(screen.getByText(/configuración de base de datos/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ir a settings/i })).toBeInTheDocument();
    });

    it('does not call syncTimeEntries when config is incomplete', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <SyncPanel
            selectedEntries={[makeEntry({ id: 'e1' })]}
            totalPendingCount={1}
            onSyncComplete={vi.fn()}
          />
        </MemoryRouter>
      );

      // The execute button should not be present
      expect(screen.queryByRole('button', { name: /ejecutar en bbdd/i })).not.toBeInTheDocument();

      // syncTimeEntries should never have been called
      expect(mockSyncTimeEntries).not.toHaveBeenCalled();
    });
  });
});
