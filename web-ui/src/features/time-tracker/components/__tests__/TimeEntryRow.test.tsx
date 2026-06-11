import { describe, it, expect, vi } from 'vitest';
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

function renderRow(entry: TimeEntry, props: Partial<{ onEdit: () => void; onDelete: () => void; onToggle: () => void; selected: boolean; recoveryInfo: { recovered: number; total: number } }> = {}) {
  return render(
    <table>
      <tbody>
        <TimeEntryRow
          entry={entry}
          selected={props.selected ?? false}
          onToggle={props.onToggle ?? vi.fn()}
          onDelete={props.onDelete ?? vi.fn()}
          onEdit={props.onEdit}
          recoveryInfo={props.recoveryInfo}
        />
      </tbody>
    </table>
  );
}

describe('TimeEntryRow sync badges', () => {
  it('shows "Pendiente" badge when synced=false and no syncError', () => {
    renderRow(makeEntry({ synced: false }));

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.queryByText('Sincronizado')).not.toBeInTheDocument();
    expect(screen.queryByText('Fallido')).not.toBeInTheDocument();
  });

  it('shows "Sincronizado" badge when synced=true', () => {
    renderRow(makeEntry({ synced: true }));

    expect(screen.getByText('Sincronizado')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Fallido')).not.toBeInTheDocument();
  });

  it('shows "Fallido" badge when synced=false and syncError is set', () => {
    renderRow(makeEntry({ synced: false, syncError: 'Duplicate key violation' }));

    expect(screen.getByText('Fallido')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Sincronizado')).not.toBeInTheDocument();
  });

  it('shows error message in tooltip when failed', () => {
    renderRow(makeEntry({ synced: false, syncError: 'Timeout connecting to server' }));

    const badge = screen.getByText('Fallido');
    expect(badge).toHaveAttribute('title', 'Timeout connecting to server');
  });
});

describe('TimeEntryRow edit button', () => {
  it('renders edit button for pending entries when onEdit is provided', () => {
    const onEdit = vi.fn();
    renderRow(makeEntry({ synced: false }), { onEdit });

    const editButtons = screen.getAllByRole('button');
    // edit button should be present (one of the buttons)
    expect(editButtons.length).toBeGreaterThan(1);
  });

  it('does not render edit button when onEdit is not provided', () => {
    renderRow(makeEntry({ synced: false }));

    const buttons = screen.getAllByRole('button');
    // only checkbox + delete = 2 buttons
    expect(buttons.length).toBe(2);
  });

  it('hides trash icon for synced entries', () => {
    renderRow(makeEntry({ synced: true }));

    // No delete button visible — synced rows hide actions
    const buttons = screen.getAllByRole('button');
    // synced row only has disabled edit button, no delete
    const deleteBtn = screen.queryByRole('button', { name: /trash/i });
    expect(deleteBtn).not.toBeInTheDocument();
  });

  it('shows edit button for synced entries but it is disabled', () => {
    renderRow(makeEntry({ synced: true }));

    // The edit button exists but is disabled
    const editButtons = screen.getAllByRole('button');
    const disabledBtn = editButtons.find(btn => btn.hasAttribute('disabled'));
    expect(disabledBtn).toBeDefined();
  });

  it('calls onEdit when edit button is clicked on pending entry', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const onEdit = vi.fn();
    renderRow(makeEntry({ synced: false }), { onEdit });

    // buttons: checkbox + edit + delete = 3
    const allButtons = screen.getAllByRole('button');
    const pencilBtn = allButtons[1]; // edit button
    await userEvent.click(pencilBtn);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

describe('TimeEntryRow recoverable indicators', () => {
  it('shows "Permiso" badge for recoverable entries', () => {
    renderRow(makeEntry({ recoverable: true }));

    expect(screen.getByText('Permiso')).toBeInTheDocument();
  });

  it('does not show "Permiso" badge for non-recoverable entries', () => {
    renderRow(makeEntry({ recoverable: false }));

    expect(screen.queryByText('Permiso')).not.toBeInTheDocument();
  });

  it('does not show "Permiso" badge when recoverable is undefined', () => {
    renderRow(makeEntry({}));

    expect(screen.queryByText('Permiso')).not.toBeInTheDocument();
  });

  it('applies amber background to recoverable entries', () => {
    const { container } = renderRow(makeEntry({ recoverable: true }));

    const row = container.querySelector('tr');
    expect(row?.className).toContain('bg-amber-50');
  });

  it('does not apply amber background to non-recoverable entries', () => {
    const { container } = renderRow(makeEntry({ recoverable: false }));

    const row = container.querySelector('tr');
    expect(row?.className).not.toContain('bg-amber');
  });

  it('shows recovery progress text when recoveryInfo is provided', () => {
    renderRow(
      makeEntry({ recoverable: true, duration: 14400 }),
      { recoveryInfo: { recovered: 5400, total: 14400 } },
    );

    expect(screen.getByText('1:30 / 4:00')).toBeInTheDocument();
  });

  it('shows zero progress when nothing recovered yet', () => {
    renderRow(
      makeEntry({ recoverable: true, duration: 7200 }),
      { recoveryInfo: { recovered: 0, total: 7200 } },
    );

    expect(screen.getByText('0:00 / 2:00')).toBeInTheDocument();
  });

  it('does not show progress text when recoveryInfo is not provided', () => {
    renderRow(makeEntry({ recoverable: true }));

    expect(screen.queryByText(/\d+:\d+ \/ \d+:\d+/)).not.toBeInTheDocument();
  });
});
