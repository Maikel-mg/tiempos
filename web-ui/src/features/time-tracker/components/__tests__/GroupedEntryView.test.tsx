import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
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
});
