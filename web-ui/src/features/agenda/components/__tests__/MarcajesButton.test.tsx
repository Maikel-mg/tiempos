import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarcajesButton } from '../MarcajesButton';
import { cuadrarDia } from '../../lib/cuadre';
import { groupMarcajesByDay } from '../../lib/marcajes';
import type { MarcajesPeriodo } from '../../hooks/useMarcajesPeriodo';
import type { TimeEntry } from '@/features/time-tracker/types';

const DAY = '2026-11-04';
const TODAY = '2026-11-05';

function entry(id: string, startTime: string, endTime: string, taskName = 'Clasificador'): TimeEntry {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return {
    id,
    taskId: 10,
    taskName,
    proceso: { proceso: 10, nombre: taskName },
    date: DAY,
    startTime,
    endTime,
    duration: (eh * 60 + em - (sh * 60 + sm)) * 60,
    synced: false,
    createdAt: `${DAY}T00:00:00.000Z`,
    updatedAt: `${DAY}T00:00:00.000Z`,
  };
}

async function openPopup({
  times,
  entries,
  onApplyFix = vi.fn(async () => null),
  ignored = false,
  stale = false,
}: {
  times: string[];
  entries: TimeEntry[];
  onApplyFix?: (fix: never) => Promise<string | null>;
  ignored?: boolean;
  stale?: boolean;
}) {
  const grupо = groupMarcajesByDay(times.map((time) => ({ date: DAY, time, origen: 'MAIL' })))[0];
  const marcajes: MarcajesPeriodo = {
    byDay: new Map([
      [DAY, { ...(grupо ?? { day: DAY, times: [], coveredMinutes: 0, marcajes: [] }), stale, ignored }],
    ]),
    isRefreshing: false,
    error: null,
    addManual: vi.fn(),
    updateManual: vi.fn(),
    removeManual: vi.fn(),
    setIgnored: vi.fn(),
  };
  const cuadresPorDia = new Map([[DAY, cuadrarDia({ day: DAY, today: TODAY, times, ignored, entries })]]);

  render(
    <MarcajesButton
      days={[DAY]}
      entries={entries}
      marcajes={marcajes}
      cuadresPorDia={cuadresPorDia}
      onApplyFix={onApplyFix as never}
      onSplit={vi.fn()}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: /Ver marcajes/ }));
  return { onApplyFix };
}

describe('popup de marcajes — desajustes y ajuste de un Registro', () => {
  it('un Registro que empieza después de su entrada fichada ofrece ampliar hasta la entrada', async () => {
    await openPopup({ times: ['06:35', '13:30'], entries: [entry('a', '07:00', '13:30')] });

    expect(screen.getByText('07:00–13:30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ampliar inicio a 06:35/ })).toBeInTheDocument();
  });

  it('un Registro que acaba después de su salida fichada ofrece recortar hasta la salida', async () => {
    await openPopup({ times: ['06:35', '15:35'], entries: [entry('a', '06:35', '16:00')] });

    expect(screen.getByRole('button', { name: /Recortar fin a 15:35/ })).toBeInTheDocument();
  });

  it('un Registro que empieza antes de su entrada fichada también se marca, para recortarlo', async () => {
    await openPopup({ times: ['06:35', '15:35'], entries: [entry('a', '06:00', '15:35')] });

    expect(screen.getByRole('button', { name: /Recortar inicio a 06:35/ })).toBeInTheDocument();
  });

  it('la diferencia de un minuto se marca; la de cero, no', async () => {
    const { onApplyFix } = await openPopup({
      times: ['06:35', '13:30'],
      entries: [entry('a', '06:36', '13:30')],
    });

    await userEvent.click(screen.getByRole('button', { name: /Ampliar inicio a 06:35/ }));
    expect(onApplyFix).toHaveBeenCalledWith(
      expect.objectContaining({ entryId: 'a', kind: 'ampliar-inicio', patch: { startTime: '06:35' } }),
    );
  });

  it('un Registro que ya cuadra no ofrece ningún botón de ajuste', async () => {
    await openPopup({ times: ['06:35', '13:30'], entries: [entry('a', '06:35', '13:30')] });

    expect(screen.queryByRole('button', { name: /Ampliar|Recortar/ })).not.toBeInTheDocument();
    expect(screen.getByText('cuadra con marcajes')).toBeInTheDocument();
  });

  it('un día sin marcajes válidos no ofrece botones de ajuste', async () => {
    await openPopup({ times: ['06:35', '13:30', '15:15'], entries: [entry('a', '09:00', '10:00')] });

    expect(screen.queryByRole('button', { name: /Ampliar|Recortar/ })).not.toBeInTheDocument();
    expect(screen.getByText('sin marcajes válidos')).toBeInTheDocument();
  });

  it('si el ajuste chocaría con otro Registro, no se aplica y se explica con cuál', async () => {
    const onApplyFix = vi.fn(async () => 'No se aplicó «Recortar fin a 13:30»: se solapa con Revisión (13:00–14:00)');
    await openPopup({
      times: ['06:35', '13:30'],
      entries: [entry('a', '06:35', '14:30'), entry('b', '13:00', '14:00', 'Revisión')],
      onApplyFix,
    });

    await userEvent.click(screen.getByRole('button', { name: /Recortar fin a 13:30/ }));

    expect(await screen.findByText(/se solapa con Revisión \(13:00–14:00\)/)).toBeInTheDocument();
  });

  it('el ajuste se pide con la hora exacta a la que queda el Registro', async () => {
    const { onApplyFix } = await openPopup({
      times: ['06:35', '15:35'],
      entries: [entry('a', '06:35', '16:00')],
    });

    await userEvent.click(screen.getByRole('button', { name: /Recortar fin a 15:35/ }));

    expect(onApplyFix).toHaveBeenCalledTimes(1);
    expect(onApplyFix).toHaveBeenCalledWith(expect.objectContaining({ patch: { endTime: '15:35' } }));
  });
});
