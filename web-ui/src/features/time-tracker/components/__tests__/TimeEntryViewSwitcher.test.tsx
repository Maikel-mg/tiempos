import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeEntryViewSwitcher } from '../TimeEntryViewSwitcher';
import type { TimeEntry } from '../../types';

// Mock pointer capture for Radix UI Select in jsdom
Element.prototype.hasPointerCapture = vi.fn(() => false);
// Mock scrollIntoView for Radix UI Select in jsdom
Element.prototype.scrollIntoView = vi.fn(() => {});

function makeEntry(id: string, taskName: string, date: string, synced = false, syncError?: string, recoverable?: boolean): TimeEntry {
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
    recoverable,
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
    synced,
    syncError,
  };
}

const ENTRIES: TimeEntry[] = [
  makeEntry('1', 'Frontend Task', '2026-06-01', false, undefined, false),
  makeEntry('2', 'Backend Task', '2026-06-02', true, undefined, true),
  makeEntry('3', 'Frontend Bug', '2026-06-01', false, 'Error', false),
  makeEntry('4', 'Backend Feature', '2026-06-03', true, undefined, true),
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
        activeTab="table"
      />
    );

    // Table view should be rendered (check for table rows)
    expect(screen.getByText('Frontend Task')).toBeInTheDocument();
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
        activeTab="table"
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

  it('renders GroupedEntryView when activeTab is "grouped"', () => {
    render(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
        activeTab="grouped"
      />
    );

    // Should show week groups (grouped view structure)
    expect(screen.getByText(/Jun/)).toBeInTheDocument();
  });

  it('applying task filter in table view and switching to grouped view shows same filtered entries', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
        activeTab="table"
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

    // Switch to grouped view by re-rendering with activeTab="grouped"
    rerender(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
        activeTab="grouped"
      />
    );

    // The grouped view should have filtered entries (week group shows "2:00" for 2 frontend entries)
    // Backend entries should not be visible
    expect(screen.queryByText('Backend Task')).not.toBeInTheDocument();
    expect(screen.queryByText('Backend Feature')).not.toBeInTheDocument();
  });

  it('sort control only appears in table view', () => {
    const { rerender } = render(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
        activeTab="table"
      />
    );

    // Sort control should be visible in table view (check for the select with "Fecha" option)
    const sortSelect = screen.getAllByRole('combobox')[0]; // First select is sort
    expect(sortSelect).toBeInTheDocument();

    // Switch to grouped by re-rendering
    rerender(
      <TimeEntryViewSwitcher
        entries={ENTRIES}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPlay={vi.fn()}
        activeTab="grouped"
      />
    );

    // Sort control should NOT be visible in grouped view (there should be 2 selects now: sync + tipo)
    const selectsAfterSwitch = screen.getAllByRole('combobox');
    expect(selectsAfterSwitch.length).toBe(2); // sync filter + tipo filter
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
        activeTab="table"
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
          activeTab="table"
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
          activeTab="table"
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
          activeTab="table"
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
        activeTab="table"
      />
    );

    expect(screen.queryByText('seleccionados')).not.toBeInTheDocument();
  });

  describe('Tipo filter (recoverable)', () => {
    it('renders Tipo filter with three options: Todos, Normal, Permiso', async () => {
      const user = userEvent.setup();
      render(
        <TimeEntryViewSwitcher
          entries={ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
          activeTab="table"
        />
      );

      // Find the Tipo filter by label
      const tipoLabel = screen.getByText('Tipo');
      expect(tipoLabel).toBeInTheDocument();

      // The select trigger should be next to the label
      const tipoSelect = tipoLabel.closest('div')?.querySelector('[role="combobox"]') as HTMLElement;
      expect(tipoSelect).toBeInTheDocument();

      // Open the dropdown
      await user.click(tipoSelect);

      // Should show all three options
      expect(screen.getByRole('option', { name: 'Todos' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Normal' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Permiso' })).toBeInTheDocument();
    });

    it('defaults to "Todos" showing all entries', () => {
      render(
        <TimeEntryViewSwitcher
          entries={ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
          activeTab="table"
        />
      );

      // All entries should be visible
      expect(screen.getByText('Frontend Task')).toBeInTheDocument();
      expect(screen.getByText('Backend Task')).toBeInTheDocument();
      expect(screen.getByText('Frontend Bug')).toBeInTheDocument();
      expect(screen.getByText('Backend Feature')).toBeInTheDocument();

      // Count should show all 4
      expect(screen.getByText('4 registros')).toBeInTheDocument();
    });

    it('filtering by "Normal" hides recoverable entries', async () => {
      const user = userEvent.setup();
      render(
        <TimeEntryViewSwitcher
          entries={ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
          activeTab="table"
        />
      );

      // Find and click the Tipo filter
      const tipoLabel = screen.getByText('Tipo');
      const tipoSelect = tipoLabel.closest('div')?.querySelector('[role="combobox"]') as HTMLElement;
      await user.click(tipoSelect);

      // Select "Normal"
      await user.click(screen.getByRole('option', { name: 'Normal' }));

      // Should show only non-recoverable entries (recoverable !== true)
      expect(screen.getByText('Frontend Task')).toBeInTheDocument();
      expect(screen.getByText('Frontend Bug')).toBeInTheDocument();

      // Should hide recoverable entries (recoverable === true)
      expect(screen.queryByText('Backend Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Backend Feature')).not.toBeInTheDocument();

      // Count should show 2 of 4
      expect(screen.getByText('4 registros')).toBeInTheDocument();
      expect(screen.getByText('(2 mostrados)')).toBeInTheDocument();
    });

    it('filtering by "Permiso" shows only recoverable entries', async () => {
      const user = userEvent.setup();
      render(
        <TimeEntryViewSwitcher
          entries={ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
          activeTab="table"
        />
      );

      // Find and click the Tipo filter
      const tipoLabel = screen.getByText('Tipo');
      const tipoSelect = tipoLabel.closest('div')?.querySelector('[role="combobox"]') as HTMLElement;
      await user.click(tipoSelect);

      // Select "Permiso"
      await user.click(screen.getByRole('option', { name: 'Permiso' }));

      // Should show only recoverable entries (recoverable === true)
      expect(screen.getByText('Backend Task')).toBeInTheDocument();
      expect(screen.getByText('Backend Feature')).toBeInTheDocument();

      // Should hide non-recoverable entries
      expect(screen.queryByText('Frontend Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Frontend Bug')).not.toBeInTheDocument();

      // Count should show 2 of 4
      expect(screen.getByText('4 registros')).toBeInTheDocument();
      expect(screen.getByText('(2 mostrados)')).toBeInTheDocument();
    });

    it('count updates correctly when filtering by Tipo', async () => {
      const user = userEvent.setup();
      render(
        <TimeEntryViewSwitcher
          entries={ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
          activeTab="table"
        />
      );

      // Initial count should show all 4
      expect(screen.getByText('4 registros')).toBeInTheDocument();

      // Find and click the Tipo filter
      const tipoLabel = screen.getByText('Tipo');
      const tipoSelect = tipoLabel.closest('div')?.querySelector('[role="combobox"]') as HTMLElement;
      await user.click(tipoSelect);

      // Select "Normal" (2 entries)
      await user.click(screen.getByRole('option', { name: 'Normal' }));

      // Count should show (2 mostrados)
      expect(screen.getByText('(2 mostrados)')).toBeInTheDocument();

      // Open dropdown again and select "Permiso" (also 2 entries)
      await user.click(tipoSelect);
      await user.click(screen.getByRole('option', { name: 'Permiso' }));

      // Count should still show (2 mostrados)
      expect(screen.getByText('(2 mostrados)')).toBeInTheDocument();

      // Select "Todos" to show all again
      await user.click(tipoSelect);
      await user.click(screen.getByRole('option', { name: 'Todos' }));

      // Count should show all 4 without the "(X mostrados)" suffix
      expect(screen.getByText('4 registros')).toBeInTheDocument();
      expect(screen.queryByText('mostrados')).not.toBeInTheDocument();
    });
  });
});
});
