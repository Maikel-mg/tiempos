import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncPanel } from '../SyncPanel';
import type { TimeEntry } from '../../types';
import type { SyncOutcome } from '../../services/timeEntrySyncService';

vi.mock('../../services/timeEntrySyncService', () => ({
  syncTimeEntries: vi.fn(),
}));

vi.mock('@/config/stores', () => ({
  wizardConfig: {
    get: () => ({ usuario: 'MG01', fase: '1', tipoHora: '11' }),
  },
  dbConfig: {
    get: () => ({
      server: 'localhost',
      database: 'testdb',
      username: 'sa',
      password: 'pass',
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
        onSyncComplete={onSyncComplete}
      />
    );

    await user.click(screen.getByRole('button', { name: /ejecutar en bbdd/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });

    expect(onSyncComplete).not.toHaveBeenCalled();
  });
});
