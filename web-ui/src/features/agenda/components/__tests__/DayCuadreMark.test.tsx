import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { CalendarView } from '../CalendarView';
import { AgendaView } from '../AgendaView';
import { TimelineView } from '../TimelineView';
import type { DayCuadre, DayCuadreStatus } from '../../lib/cuadre';
import type { TimeEntry } from '@/features/time-tracker/types';

function cuadre(day: string, status: DayCuadreStatus): [string, DayCuadre] {
  return [day, { day, status, franjas: [], desajustes: [] }];
}

function entry(id: string, date: string): TimeEntry {
  return {
    id,
    taskId: 10,
    taskName: 'Clasificador',
    proceso: { proceso: 10, nombre: 'Clasificador' },
    date,
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    synced: false,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

const week = ['2026-06-08', '2026-06-09'];
const entries = [entry('a', '2026-06-08'), entry('b', '2026-06-09')];
const marks = new Map([cuadre('2026-06-09', 'descuadrado')]);

const MARCA = 'descuadrado con marcajes';

/** El botón o cabecera del día que contiene la marca, para saber a qué día fue. */
function markedDayLabel(mark: HTMLElement): string {
  return mark.closest('button, section')?.textContent ?? '';
}

describe('marca de cuadre en las tres vistas del período', () => {
  it('Calendario en modo semana pinta la marca en su día y solo en él', () => {
    render(<CalendarView entries={entries} days={week} mode="week" workdayStart={540} cuadresPorDia={marks} />);

    const marksSeen = screen.getAllByRole('img', { name: MARCA });
    expect(marksSeen).toHaveLength(1);
    expect(markedDayLabel(marksSeen[0])).toContain('Mar 9');
  });

  it('Calendario en modo día pinta la marca del día abierto', () => {
    const { container } = render(
      <CalendarView entries={entries} days={['2026-06-09']} mode="day" workdayStart={540} cuadresPorDia={marks} />,
    );

    expect(screen.getByRole('img', { name: MARCA })).toBeInTheDocument();
    expect(container.textContent).toContain('martes 9 jun 2026');
  });

  it('Agenda pinta la marca en la cabecera de su día y no en la del vecino', () => {
    render(<AgendaView entries={entries} days={week} mode="week" workdayStart={540} cuadresPorDia={marks} />);

    const marksSeen = screen.getAllByRole('img', { name: MARCA });
    expect(marksSeen).toHaveLength(1);
    expect(markedDayLabel(marksSeen[0])).toContain('martes 9');
  });

  it('Timeline en modo semana pinta la marca en su columna', () => {
    render(<TimelineView entries={entries} days={week} mode="week" workdayStart={540} cuadresPorDia={marks} />);

    // La marca vive dentro del botón del día marcado, no del vecino.
    expect(markedDayLabel(screen.getByRole('img', { name: MARCA }))).toContain('Mar 9');
    expect(screen.getByRole('img', { name: MARCA }).closest('button')).toHaveTextContent('Mar 9');
  });

  it('Timeline en modo día pinta la marca del día abierto', () => {
    render(
      <TimelineView entries={entries} days={['2026-06-09']} mode="day" workdayStart={540} cuadresPorDia={marks} />,
    );

    expect(screen.getByRole('img', { name: MARCA })).toBeInTheDocument();
  });

  it('las vistas siguen funcionando sin marca: ningún día inventa indicador', () => {
    render(<CalendarView entries={entries} days={week} mode="week" workdayStart={540} />);
    render(<AgendaView entries={entries} days={week} mode="week" workdayStart={540} />);
    render(<TimelineView entries={entries} days={week} mode="week" workdayStart={540} />);

    expect(screen.queryAllByRole('img', { name: MARCA })).toHaveLength(0);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('un día sin marcajes no lleva marca aunque el período tenga otros días marcados', () => {
    const soloUnDia = new Map([cuadre('2026-06-09', 'sin-marcajes')]);
    render(<AgendaView entries={entries} days={week} mode="week" workdayStart={540} cuadresPorDia={soloUnDia} />);

    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });
});
