import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
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

describe('TimeEntryList', () => {
  it('shows all entries when pre-filtered list is provided', () => {
    render(
      <TimeEntryList
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });

  it('shows empty message when no entries', () => {
    render(
      <TimeEntryList
        entries={[]}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('No hay registros que coincidan con los filtros')).toBeInTheDocument();
  });

  it('shows table headers', () => {
    render(
      <TimeEntryList
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Tarea')).toBeInTheDocument();
    expect(screen.getByText('Descripción')).toBeInTheDocument();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Fin')).toBeInTheDocument();
    expect(screen.getByText('Duración')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
  });

  it('shows only provided entries (pre-filtered)', () => {
    const filteredEntries = [makeEntry('1', false), makeEntry('3', false, 'Error')];
    render(
      <TimeEntryList
        entries={filteredEntries}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });
});
