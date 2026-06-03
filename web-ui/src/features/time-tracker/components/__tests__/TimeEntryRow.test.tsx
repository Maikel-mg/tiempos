import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { TimeEntryRow } from '../TimeEntryRow';
import type { TimeEntry } from '../../types';

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

describe('TimeEntryRow sync badges', () => {
  it('shows "Pendiente" badge when synced=false and no syncError', () => {
    render(
      <table>
        <tbody>
          <TimeEntryRow
            entry={makeEntry({ synced: false })}
            selected={false}
            onToggle={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.queryByText('Sincronizado')).not.toBeInTheDocument();
    expect(screen.queryByText('Fallido')).not.toBeInTheDocument();
  });

  it('shows "Sincronizado" badge when synced=true', () => {
    render(
      <table>
        <tbody>
          <TimeEntryRow
            entry={makeEntry({ synced: true })}
            selected={false}
            onToggle={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('Sincronizado')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Fallido')).not.toBeInTheDocument();
  });

  it('shows "Fallido" badge when synced=false and syncError is set', () => {
    render(
      <table>
        <tbody>
          <TimeEntryRow
            entry={makeEntry({ synced: false, syncError: 'Duplicate key violation' })}
            selected={false}
            onToggle={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('Fallido')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Sincronizado')).not.toBeInTheDocument();
  });

  it('shows error message in tooltip when failed', () => {
    render(
      <table>
        <tbody>
          <TimeEntryRow
            entry={makeEntry({ synced: false, syncError: 'Timeout connecting to server' })}
            selected={false}
            onToggle={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );

    const badge = screen.getByText('Fallido');
    expect(badge).toHaveAttribute('title', 'Timeout connecting to server');
  });
});
