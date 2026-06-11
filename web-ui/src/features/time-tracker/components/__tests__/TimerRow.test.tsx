import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { TimerRow } from '../TimerRow';

function renderTimerRow(props: {
  taskName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  description?: string;
} = {}) {
  const defaults = {
    taskName: 'Diseño API',
    date: '2026-06-11',
    startTime: '10:30',
    endTime: '11:12',
    duration: 2557,
    description: 'Revisión de endpoints',
  };
  return render(
    <table>
      <tbody>
        <TimerRow {...defaults} {...props} />
      </tbody>
    </table>
  );
}

describe('TimerRow', () => {
  it('renders task name', () => {
    renderTimerRow();
    expect(screen.getByText('Diseño API')).toBeInTheDocument();
  });

  it('renders formatted date as DD/MM/YYYY', () => {
    renderTimerRow();
    expect(screen.getByText('11/06/2026')).toBeInTheDocument();
  });

  it('renders start time', () => {
    renderTimerRow();
    expect(screen.getByText('10:30')).toBeInTheDocument();
  });

  it('renders end time in italic', () => {
    renderTimerRow({ endTime: '11:12' });
    const endTimeCell = screen.getByText('11:12');
    expect(endTimeCell).toHaveClass('italic');
  });

  it('renders duration in bold monospace', () => {
    renderTimerRow({ duration: 2557 });
    // formatDuration(2557) = "42m" (2557s = 42min, no hours)
    const durationCell = screen.getByText('42m');
    expect(durationCell).toHaveClass('font-bold');
    expect(durationCell).toHaveClass('font-mono');
  });

  it('renders description', () => {
    renderTimerRow();
    expect(screen.getByText('Revisión de endpoints')).toBeInTheDocument();
  });

  it('renders dash when description is empty', () => {
    renderTimerRow({ description: '' });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('has blue background styling', () => {
    const { container } = renderTimerRow();
    const row = container.querySelector('tr');
    expect(row).toHaveClass('bg-blue-50');
  });

  it('has blue left border', () => {
    const { container } = renderTimerRow();
    const row = container.querySelector('tr');
    expect(row).toHaveClass('border-l-2');
    expect(row).toHaveClass('border-l-blue-500');
  });

  it('renders green dot indicator', () => {
    renderTimerRow();
    const dot = screen.getByTestId('timer-dot');
    expect(dot).toHaveClass('bg-green-500');
  });

  it('does not render action buttons', () => {
    renderTimerRow();
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });

  it('does not render checkbox', () => {
    renderTimerRow();
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes).toHaveLength(0);
  });

  it('does not render sync status badge', () => {
    renderTimerRow();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Sincronizado')).not.toBeInTheDocument();
    expect(screen.queryByText('Fallido')).not.toBeInTheDocument();
  });

  it('renders "En curso" label', () => {
    renderTimerRow();
    expect(screen.getByText('En curso')).toBeInTheDocument();
  });
});
