import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeEntryViewSwitcher } from '../TimeEntryViewSwitcher';
import type { TimeEntry } from '../../types';

// Mock pointer capture for Radix UI Select in jsdom
Element.prototype.hasPointerCapture = vi.fn(() => false);

function makeEntry(id: string, taskName: string, date: string, synced = false, syncError?: string): TimeEntry {
  return {
    id,
    taskId: 100,
    taskName,
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date,
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
  makeEntry('1', 'Frontend Task', '2026-06-01', false),
  makeEntry('2', 'Backend Task', '2026-06-02', true),
  makeEntry('3', 'Frontend Bug', '2026-06-01', false, 'Error'),
  makeEntry('4', 'Backend Feature', '2026-06-03', true),
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TimeEntryViewSwitcher', () => {
  it('defaults to "Tabla" tab', () => {
    render(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
      />
    );

    const tableTab = screen.getByRole('tab', { name: /tabla/i });
    expect(tableTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders flat table when "Tabla" tab is active', () => {
    render(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
      />
    );

    // Should show table headers (check for multiple elements with text)
    const fechaElements = screen.getAllByText('Fecha');
    expect(fechaElements.length).toBeGreaterThan(0);

    const tareaElements = screen.getAllByText('Tarea');
    expect(tareaElements.length).toBeGreaterThan(0);

    // Should show entries
    expect(screen.getByText('Frontend Task')).toBeInTheDocument();
    expect(screen.getByText('Backend Task')).toBeInTheDocument();
    expect(screen.getByText('Frontend Bug')).toBeInTheDocument();
    expect(screen.getByText('Backend Feature')).toBeInTheDocument();
  });

  it('renders GroupedEntryView when "Agrupado" tab is active', async () => {
    const user = userEvent.setup();
    render(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
      />
    );

    const groupedTab = screen.getByRole('tab', { name: /agrupado/i });
    await user.click(groupedTab);

    // Should show week groups (grouped view structure)
    expect(screen.getByText(/Jun/)).toBeInTheDocument();
  });

  it('applying task filter in table view and switching to grouped view shows same filtered entries', async () => {
    const user = userEvent.setup();
    render(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
      />
    );

    // Type in task filter
    const taskFilter = screen.getByPlaceholderText('Buscar tarea...');
    await user.type(taskFilter, 'Frontend');

    // Should show only frontend entries in table
    expect(screen.getByText('Frontend Task')).toBeInTheDocument();
    expect(screen.getByText('Frontend Bug')).toBeInTheDocument();
    expect(screen.queryByText('Backend Task')).not.toBeInTheDocument();
    expect(screen.queryByText('Backend Feature')).not.toBeInTheDocument();

    // Switch to grouped view
    const groupedTab = screen.getByRole('tab', { name: /agrupado/i });
    await user.click(groupedTab);

    // The grouped view should have filtered entries (week group shows "2:00" for 2 frontend entries)
    // Backend entries should not be visible
    expect(screen.queryByText('Backend Task')).not.toBeInTheDocument();
    expect(screen.queryByText('Backend Feature')).not.toBeInTheDocument();
  });

  it('filters persist across tab switches', async () => {
    const user = userEvent.setup();
    render(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
      />
    );

    // Apply date filter (2026-06-01)
    const dateFilter = screen.getByLabelText('Filtrar por fecha');
    await user.type(dateFilter, '2026-06-01');

    // Should show only entries from 2026-06-01
    expect(screen.getByText('Frontend Task')).toBeInTheDocument();
    expect(screen.getByText('Frontend Bug')).toBeInTheDocument();
    expect(screen.queryByText('Backend Task')).not.toBeInTheDocument();
    expect(screen.queryByText('Backend Feature')).not.toBeInTheDocument();

    // Switch to grouped
    const groupedTab = screen.getByRole('tab', { name: /agrupado/i });
    await user.click(groupedTab);

    // Switch back to table
    const tableTab = screen.getByRole('tab', { name: /tabla/i });
    await user.click(tableTab);

    // Filter should still be applied
    expect(screen.getByText('Frontend Task')).toBeInTheDocument();
    expect(screen.getByText('Frontend Bug')).toBeInTheDocument();
    expect(screen.queryByText('Backend Task')).not.toBeInTheDocument();
    expect(screen.queryByText('Backend Feature')).not.toBeInTheDocument();
  });

  it('sort control only appears in table view', async () => {
    const user = userEvent.setup();
    render(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
      />
    );

    // Sort control should be visible in table view (check for the select with "Fecha" option)
    const sortSelect = screen.getAllByRole('combobox')[0]; // First select is sort
    expect(sortSelect).toBeInTheDocument();

    // Switch to grouped
    const groupedTab = screen.getByRole('tab', { name: /agrupado/i });
    await user.click(groupedTab);

    // Sort control should NOT be visible in grouped view (there should be only 1 select now)
    const selectsAfterSwitch = screen.getAllByRole('combobox');
    expect(selectsAfterSwitch.length).toBe(1); // Only sync filter should remain
  });

  it('shows record count', () => {
    render(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
      />
    );

    // Should show total count
    expect(screen.getByText('4 registros')).toBeInTheDocument();
  });

  describe('selection controls', () => {
    it('"Seleccionar sin sincronizar" selects all unsynced entries', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(
        <TimeEntryViewSwitcher
          entries={ENTRIES}
          selectedIds={new Set()}
          onSelect={onSelect}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />
      );

      const selectBtn = screen.getByText(/Seleccionar sin sincronizar/);
      await user.click(selectBtn);

      // 2 unsynced entries: '1' (Frontend Task) and '3' (Frontend Bug)
      expect(onSelect).toHaveBeenCalledWith(new Set(['1', '3']));
    });

    it('"Deseleccionar" clears all selections', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(
        <TimeEntryViewSwitcher
          entries={ENTRIES}
          selectedIds={new Set(['1', '3'])}
          onSelect={onSelect}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />
      );

      const deselectBtn = screen.getByText('Deseleccionar');
      await user.click(deselectBtn);

      expect(onSelect).toHaveBeenCalledWith(new Set());
    });

    it('shows selected count when entries are selected', () => {
      render(
        <TimeEntryViewSwitcher
          entries={ENTRIES}
          selectedIds={new Set(['1', '3'])}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />
      );

      expect(screen.getByText('2 seleccionados')).toBeInTheDocument();
    });

    it('does not show selected count when no entries are selected', () => {
      render(
        <TimeEntryViewSwitcher
          entries={ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />
      );

      expect(screen.queryByText('seleccionados')).not.toBeInTheDocument();
    });
  });
});
