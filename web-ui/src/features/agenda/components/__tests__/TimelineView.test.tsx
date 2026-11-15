import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { TimelineView } from '../TimelineView';
import { scheduleConfig } from '@/config/stores';
import type { TimeEntry } from '@/features/time-tracker/types';
import type { PlanMode } from '../../lib/planRange';

function entry(id: string, date: string, startTime: string, endTime: string, recoverable = false): TimeEntry {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return {
    id,
    taskId: 10,
    taskName: 'Clasificador',
    proceso: { proceso: 10, nombre: 'Clasificador' },
    date,
    startTime,
    endTime,
    duration: ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) * 60,
    recoverable,
    synced: false,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  } as TimeEntry;
}

function renderTotals(entries: TimeEntry[], days: string[], mode: PlanMode) {
  return render(<TimelineView entries={entries} days={days} mode={mode} workdayStart={540} />);
}

describe('TimelineView — fila de totales', () => {
  beforeEach(() => {
    // Horario por defecto: jueves 8h 15m, viernes 7h, sábado 0.
    scheduleConfig.set({
      defaultHours: { mon: 8.25, tue: 8.25, wed: 8.25, thu: 8.25, fri: 7, sat: 0, sun: 0 },
      exceptions: [],
    });
  });

  it('muestra el balance negativo bajo el objetivo del día', () => {
    // Viernes: objetivo 7h, registradas 4h.
    const { container } = renderTotals([entry('a', '2026-06-12', '09:00', '13:00')], ['2026-06-12'], 'week');

    expect(container.textContent).toContain('4h 0m');
    expect(container.textContent).toContain('−3h 0m');
    expect(container.textContent).toContain('no cumple el objetivo de 7h 0m');
  });

  it('muestra el balance positivo sobre el objetivo del día', () => {
    // Jueves: objetivo 8h 15m, registradas 10h.
    const { container } = renderTotals([entry('a', '2026-06-11', '08:00', '18:00')], ['2026-06-11'], 'week');

    expect(container.textContent).toContain('10h 0m');
    expect(container.textContent).toContain('+1h 45m');
    expect(container.textContent).toContain('cumple el objetivo de 8h 15m');
  });

  it('sin objetivo no muestra cifra de balance', () => {
    // Sábado: objetivo 0.
    const { container } = renderTotals([entry('a', '2026-06-13', '09:00', '12:00')], ['2026-06-13'], 'week');

    expect(container.textContent).toContain('3h 0m');
    expect(container.textContent).not.toContain('+');
    expect(container.textContent).not.toContain('−');
    expect(container.textContent).toContain('sin objetivo');
  });

  it('el balance excluye los Permisos y lo registrado los incluye', () => {
    // Viernes: 4h de trabajo + 2h de Permiso; balance = 4h − 7h.
    const { container } = renderTotals(
      [entry('a', '2026-06-12', '09:00', '13:00'), entry('b', '2026-06-12', '13:00', '15:00', true)],
      ['2026-06-12'],
      'week',
    );

    expect(container.textContent).toContain('6h 0m');
    expect(container.textContent).toContain('−3h 0m');
  });

  it('en modo semana la celda Total suma el balance de la semana', () => {
    const { container } = renderTotals(
      [entry('a', '2026-06-12', '09:00', '13:00'), entry('b', '2026-06-11', '09:00', '13:00')],
      ['2026-06-11', '2026-06-12'],
      'week',
    );

    // 8h registradas frente a 15h 15m de objetivo.
    expect(container.textContent).toContain('8h 0m');
    expect(container.textContent).toContain('−7h 15m');
  });

  it('en modo día la fila de totales muestra lo registrado y el balance', () => {
    const { container } = renderTotals([entry('a', '2026-06-12', '09:00', '13:00')], ['2026-06-12'], 'day');

    expect(container.textContent).toContain('Total');
    expect(container.textContent).toContain('4h 0m');
    expect(container.textContent).toContain('−3h 0m');
  });
});
