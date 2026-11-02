import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncDayButton } from '../SyncDayButton';
import type { TimeEntry } from '@/features/time-tracker/types';

function entry(id: string, taskId: number, synced = false): TimeEntry {
  return {
    id,
    taskId,
    taskName: `Tarea ${id}`,
    proceso: { proceso: taskId, nombre: `Tarea ${id}` },
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    synced,
  } as TimeEntry;
}

describe('SyncDayButton', () => {
  it('no se pinta si no hay pendientes', () => {
    const { container } = render(<SyncDayButton entries={[entry('a', 1, true)]} onSyncDay={vi.fn()} />);
    expect(container.textContent).toBe('');
  });

  it('cuenta todos los pendientes y sincroniza solo los de Tarea existente', async () => {
    const onSyncDay = vi.fn();
    render(<SyncDayButton entries={[entry('a', 1), entry('b', -5), entry('c', 2, true)]} onSyncDay={onSyncDay} />);

    const button = screen.getByRole('button');
    expect(button.textContent).toContain('(2)');
    expect(button.getAttribute('title')).toContain('1 con Tarea local');

    await userEvent.click(button);
    expect(onSyncDay).toHaveBeenCalledWith(['a']);
  });
});
