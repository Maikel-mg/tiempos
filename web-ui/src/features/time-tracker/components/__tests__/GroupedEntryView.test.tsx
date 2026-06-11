import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupedEntryView } from '../GroupedEntryView';
import type { TimeEntry } from '../../types';

function makeEntry(
  id: string,
  overrides: Partial<TimeEntry> & { date: string } = { date: '2026-06-09' },
): TimeEntry {
  return {
    id,
    taskId: 100 + Number(id),
    taskName: `Task ${id}`,
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: '',
    createdAt: '2026-06-09T09:00:00Z',
    updatedAt: '2026-06-09T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

// Week 24 (current week): Jun 8-14, 2026
const WEEK24_ENTRIES: TimeEntry[] = [
  makeEntry('1', { date: '2026-06-09', startTime: '09:00', endTime: '10:00', duration: 3600, description: 'Morning work' }),
  makeEntry('2', { date: '2026-06-09', startTime: '10:00', endTime: '10:30', duration: 1800, description: 'Short task' }),
  makeEntry('3', { date: '2026-06-10', startTime: '08:00', endTime: '09:00', duration: 3600, description: '' }),
];

// Week 23: Jun 1-7, 2026
const WEEK23_ENTRIES: TimeEntry[] = [
  makeEntry('4', { date: '2026-06-01', startTime: '14:00', endTime: '15:30', duration: 5400, description: 'Afternoon task' }),
];

const ALL_ENTRIES = [...WEEK24_ENTRIES, ...WEEK23_ENTRIES];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GroupedEntryView', () => {
  describe('empty state', () => {
    it('renders empty state when no entries', () => {
      render(
        <GroupedEntryView
          entries={[]}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      expect(screen.getByText('No hay registros de tiempo')).toBeInTheDocument();
    });
  });

  describe('week grouping', () => {
    it('renders week groups correctly', () => {
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Week 24 header (current week)
      expect(screen.getByText('8 - 14 Jun')).toBeInTheDocument();
      // Week 23 header (previous week)
      expect(screen.getByText('1 - 7 Jun')).toBeInTheDocument();
    });

    it('shows day count and total hours per week', () => {
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Week 24: 2 days, 5400 seconds = 1:30
      expect(screen.getByText('2 días')).toBeInTheDocument();
      expect(screen.getAllByText('1:30').length).toBeGreaterThanOrEqual(1);

      // Week 23: 1 day, 5400 seconds = 1:30
      expect(screen.getByText('1 día')).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('current week is expanded by default', () => {
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Current week's days should be visible
      expect(screen.getByText('Mar 9')).toBeInTheDocument();
      expect(screen.getByText('Mié 10')).toBeInTheDocument();
    });

    it('clicking week header toggles expand/collapse', async () => {
      const user = userEvent.setup();
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Week 23 is collapsed by default — its days are not visible
      expect(screen.queryByText('Lun 1')).not.toBeInTheDocument();

      // Click week 23 header to expand
      const week23Header = screen.getByText('1 - 7 Jun');
      await user.click(week23Header);

      // Now its day should be visible
      expect(screen.getByText('Lun 1')).toBeInTheDocument();

      // Click again to collapse
      await user.click(week23Header);
      expect(screen.queryByText('Lun 1')).not.toBeInTheDocument();
    });

    it('clicking day header toggles expand/collapse', async () => {
      const user = userEvent.setup();
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Current week expanded, day entries should be visible by default
      expect(screen.getByText('Task 1')).toBeInTheDocument();

      // Click day header to collapse
      const dayHeader = screen.getByText('Mar 9');
      await user.click(dayHeader);

      // Entries for that day should be hidden
      expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Task 2')).not.toBeInTheDocument();

      // Click again to expand
      await user.click(dayHeader);
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
  });

  describe('entry details', () => {
    it('shows task name, time range, and duration when day is expanded', () => {
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Task names
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();

      // Time ranges
      expect(screen.getByText('09:00 – 10:00')).toBeInTheDocument();
      expect(screen.getByText('10:00 – 10:30')).toBeInTheDocument();

      // Durations: 3600s = 1:00, 1800s = 0:30
      expect(screen.getAllByText('1:00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('0:30')).toBeInTheDocument();
    });

    it('shows description when present', () => {
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      expect(screen.getByText('Morning work')).toBeInTheDocument();
      expect(screen.getByText('Short task')).toBeInTheDocument();
    });
  });

  describe('kebab menu', () => {
    it('renders kebab menu for each entry when day is expanded', () => {
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Each visible entry should have a kebab menu (Week 23 collapsed, so only 3 entries visible)
      const kebabButtons = screen.getAllByRole('button', { name: /acciones/i });
      expect(kebabButtons.length).toBe(3);
    });

    it('opens dropdown with Play, Editar, Eliminar options when kebab icon is clicked', async () => {
      const user = userEvent.setup();
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Click first kebab menu
      const kebabButtons = screen.getAllByRole('button', { name: /acciones/i });
      await user.click(kebabButtons[0]);

      // Dropdown should show Play, Editar, Eliminar
      expect(screen.getByText('Play')).toBeInTheDocument();
      expect(screen.getByText('Editar')).toBeInTheDocument();
      expect(screen.getByText('Eliminar')).toBeInTheDocument();
    });

    it('calls onPlay with the correct entry when Play is clicked', async () => {
      const onPlay = vi.fn();
      const user = userEvent.setup();
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={onPlay}
        />,
      );

      // Open first kebab menu
      const kebabButtons = screen.getAllByRole('button', { name: /acciones/i });
      await user.click(kebabButtons[0]);

      // Click Play
      await user.click(screen.getByText('Play'));

      // Should call onPlay with the first entry
      expect(onPlay).toHaveBeenCalledWith(WEEK24_ENTRIES[0]);
    });

    it('calls onEdit with the correct entry when Editar is clicked', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup();
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={onEdit}
          onPlay={vi.fn()}
        />,
      );

      // Open first kebab menu
      const kebabButtons = screen.getAllByRole('button', { name: /acciones/i });
      await user.click(kebabButtons[0]);

      // Click Editar
      await user.click(screen.getByText('Editar'));

      // Should call onEdit with the first entry
      expect(onEdit).toHaveBeenCalledWith(WEEK24_ENTRIES[0]);
    });

    it('calls onDelete with the correct entry id when Eliminar is clicked', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={onDelete}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Open first kebab menu
      const kebabButtons = screen.getAllByRole('button', { name: /acciones/i });
      await user.click(kebabButtons[0]);

      // Click Eliminar
      await user.click(screen.getByText('Eliminar'));

      // Should call onDelete with the entry id
      expect(onDelete).toHaveBeenCalledWith(WEEK24_ENTRIES[0].id);
    });

    it('disables Editar option for synced entries', async () => {
      const user = userEvent.setup();
      const syncedEntries = [
        makeEntry('5', { date: '2026-06-09', synced: true }),
        makeEntry('6', { date: '2026-06-09', synced: false }),
      ];

      render(
        <GroupedEntryView
          entries={syncedEntries}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Open kebab menu for synced entry (first one)
      const kebabButtons = screen.getAllByRole('button', { name: /acciones/i });
      await user.click(kebabButtons[0]);

      // Editar should be disabled
      const editItem = screen.getByText('Editar');
      expect(editItem).toHaveAttribute('data-disabled');
    });
  });

  describe('selection', () => {
    it('renders checkbox for each entry when day is expanded', () => {
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Week 23 collapsed, only 3 entries visible from current week
      const checkboxes = screen.getAllByRole('button').filter(
        (btn) => btn.querySelector('svg') && (btn.className.includes('w-11') || btn.className.includes('min-w-'))
      );
      expect(checkboxes.length).toBe(3);
    });

    it('clicking checkbox calls onSelect with correct ids', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set()}
          onSelect={onSelect}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // Find all circle buttons (selection checkboxes)
      const entryRows = screen.getAllByText(/Task \d/);
      // Click the checkbox button next to Task 1
      const checkboxButtons = document.querySelectorAll('button.rounded-md.hover\\:bg-accent');
      await user.click(checkboxButtons[0]);

      expect(onSelect).toHaveBeenCalledWith(new Set([WEEK24_ENTRIES[0].id]));
    });

    it('selected entries show green highlight', () => {
      render(
        <GroupedEntryView
          entries={ALL_ENTRIES}
          selectedIds={new Set([WEEK24_ENTRIES[0].id])}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      // The entry row container for Task 1 should have bg-green-50
      const entryContainers = document.querySelectorAll('.divide-y > div');
      const selectedContainer = Array.from(entryContainers).find((el) =>
        el.className.includes('bg-green-50')
      );
      expect(selectedContainer).toBeTruthy();
      expect(within(selectedContainer as HTMLElement).getByText('Task 1')).toBeInTheDocument();
    });
  });

  describe('recoverable indicators', () => {
    it('shows "Permiso" badge for recoverable entries', () => {
      const entries = [
        makeEntry('1', { date: '2026-06-09', recoverable: true }),
        makeEntry('2', { date: '2026-06-09', recoverable: false }),
      ];

      render(
        <GroupedEntryView
          entries={entries}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      const permisoBadges = screen.getAllByText('Permiso');
      expect(permisoBadges.length).toBe(1);
    });

    it('applies amber background to recoverable entries', () => {
      const entries = [
        makeEntry('1', { date: '2026-06-09', recoverable: true }),
      ];

      render(
        <GroupedEntryView
          entries={entries}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      const entryContainers = document.querySelectorAll('.divide-y > div');
      const amberContainer = Array.from(entryContainers).find((el) =>
        el.className.includes('bg-amber')
      );
      expect(amberContainer).toBeTruthy();
      expect(within(amberContainer as HTMLElement).getByText('Task 1')).toBeInTheDocument();
    });

    it('does not show "Permiso" badge for non-recoverable entries', () => {
      const entries = [
        makeEntry('1', { date: '2026-06-09', recoverable: false }),
      ];

      render(
        <GroupedEntryView
          entries={entries}
          selectedIds={new Set()}
          onSelect={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onPlay={vi.fn()}
        />,
      );

      expect(screen.queryByText('Permiso')).not.toBeInTheDocument();
    });
  });
});
