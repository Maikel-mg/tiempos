import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OverlapAlert } from '../OverlapAlert';
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

describe('OverlapAlert', () => {
  it('renders nothing when there are no overlaps', () => {
    const { container } = render(
      <OverlapAlert entries={[makeEntry({ startTime: '09:00', endTime: '10:00' })]} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('lists the overlapping pair with both task names', () => {
    render(
      <OverlapAlert
        entries={[
          makeEntry({ id: 'a', taskName: 'Desarrollo', startTime: '09:00', endTime: '10:00' }),
          makeEntry({ id: 'b', taskName: 'Reunión', startTime: '09:30', endTime: '11:00' }),
        ]}
      />
    );

    expect(screen.getByText(/Registros solapados detectados/)).toBeInTheDocument();
    expect(screen.getByText(/Desarrollo/)).toBeInTheDocument();
    expect(screen.getByText(/Reunión/)).toBeInTheDocument();
  });

  it('stays read-only when no fix handler is provided', () => {
    render(
      <OverlapAlert
        entries={[
          makeEntry({ id: 'a', startTime: '09:00', endTime: '10:00' }),
          makeEntry({ id: 'b', startTime: '09:30', endTime: '11:00' }),
        ]}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers the suggested fixes and reports the chosen one', () => {
    const onApplyFix = vi.fn();

    render(
      <OverlapAlert
        entries={[
          makeEntry({ id: 'a', startTime: '09:00', endTime: '10:00' }),
          makeEntry({ id: 'b', startTime: '09:30', endTime: '11:00' }),
        ]}
        onApplyFix={onApplyFix}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Terminar a las 09:30' }));

    expect(onApplyFix).toHaveBeenCalledWith({
      kind: 'shorten-previous',
      entryId: 'a',
      patch: { endTime: '09:30' },
      label: 'Terminar a las 09:30',
    });
  });

  it('shows only the move fix on an exact duplicate', () => {
    render(
      <OverlapAlert
        entries={[
          makeEntry({ id: 'a', startTime: '09:00', endTime: '10:00' }),
          makeEntry({ id: 'b', startTime: '09:00', endTime: '10:00' }),
        ]}
        onApplyFix={vi.fn()}
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Mover a 10:00-11:00' })).toBeInTheDocument();
  });
});
