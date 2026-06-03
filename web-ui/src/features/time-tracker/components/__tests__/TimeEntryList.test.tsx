import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeEntryList } from '../TimeEntryList';
import type { TimeEntry } from '../../types';

function makeEntry(id: string, synced = false, syncError?: string): TimeEntry {
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
    syncError,
  };
}

const ENTRIES: TimeEntry[] = [
  makeEntry('1', false),           // Pendiente
  makeEntry('2', true),            // Sincronizado
  makeEntry('3', false, 'Error'),  // Fallido
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TimeEntryList sync status filter', () => {
  it('shows all entries by default (Todos)', () => {
    render(
      <TimeEntryList
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });

  it('filters to Pendiente entries', async () => {
    const user = userEvent.setup();
    render(
      <TimeEntryList
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const selects = screen.getAllByRole('combobox');
    const syncFilter = selects[1]; // Second select is sync status
    await user.selectOptions(syncFilter, 'pending');

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Task 3')).not.toBeInTheDocument();
  });

  it('filters to Sincronizado entries', async () => {
    const user = userEvent.setup();
    render(
      <TimeEntryList
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const selects = screen.getAllByRole('combobox');
    const syncFilter = selects[1];
    await user.selectOptions(syncFilter, 'synced');

    expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.queryByText('Task 3')).not.toBeInTheDocument();
  });

  it('filters to Fallido entries', async () => {
    const user = userEvent.setup();
    render(
      <TimeEntryList
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const selects = screen.getAllByRole('combobox');
    const syncFilter = selects[1];
    await user.selectOptions(syncFilter, 'failed');

    expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });
});
