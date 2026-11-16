import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
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
  onSplit = vi.fn(),
  ignored = false,
  stale = false,
  manualTimes = [],
}: {
  times: string[];
  entries: TimeEntry[];
  onApplyFix?: (fix: never) => Promise<string | null>;
  onSplit?: (entry: TimeEntry) => void;
  ignored?: boolean;
  stale?: boolean;
  manualTimes?: string[];
}) {
  const marcajesDelDia = [
    ...times.map((time) => ({ date: DAY, time, origen: 'MAIL' })),
    ...manualTimes.map((time) => ({ date: DAY, time, origen: 'manual', manual: true })),
  ];
  const grupо = groupMarcajesByDay(marcajesDelDia)[0];
  const acciones = {
    addManual: vi.fn(async () => undefined),
    updateManual: vi.fn(async () => undefined),
    removeManual: vi.fn(async () => undefined),
    setIgnored: vi.fn(async () => undefined),
  };
  const marcajes: MarcajesPeriodo = {
    byDay: new Map([
      [DAY, { ...(grupо ?? { day: DAY, times: [], coveredMinutes: 0, marcajes: [] }), stale, ignored }],
    ]),
    isRefreshing: false,
    error: null,
    ...acciones,
  };
  const cuadresPorDia = new Map([[DAY, cuadrarDia({ day: DAY, today: TODAY, times, ignored, entries })]]);

  render(
    <MarcajesButton
      days={[DAY]}
      entries={entries}
      marcajes={marcajes}
      cuadresPorDia={cuadresPorDia}
      onApplyFix={onApplyFix as never}
      onSplit={onSplit}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: /Ver marcajes/ }));
  return { onApplyFix, onSplit, ...acciones };
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

describe('popup de marcajes — Registro que cruza dos franjas', () => {
  // Fichado 06:35–13:30 y 15:15–16:13: el hueco de la comida no se fichó.
  const times = ['06:35', '13:30', '15:15', '16:13'];

  it('se distingue como cruce y dice los minutos fichados y los que no', async () => {
    await openPopup({ times, entries: [entry('a', '13:00', '14:00')] });

    expect(screen.getByText('cruza dos franjas')).toBeInTheDocument();
    expect(screen.getByText('30m fichados · 30m sin fichar')).toBeInTheDocument();
  });

  it('ofrece el recorte al borde donde empieza y un enlace a Dividir', async () => {
    const onSplit = vi.fn();
    const { onApplyFix } = await openPopup({ times, entries: [entry('a', '13:00', '14:00')], onSplit });

    await userEvent.click(screen.getByRole('button', { name: /Recortar fin a 13:30/ }));
    expect(onApplyFix).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'cruza-franja', patch: { endTime: '13:30' } }),
    );

    await userEvent.click(screen.getByRole('button', { name: /Dividir/ }));
    expect(onSplit).toHaveBeenCalledTimes(1);
    expect(onSplit.mock.calls[0][0]).toMatchObject({ id: 'a', startTime: '13:00', endTime: '14:00' });
  });

  it('no crea ningún Registro nuevo sin intervención del usuario', async () => {
    const { onApplyFix, onSplit } = await openPopup({ times, entries: [entry('a', '13:00', '14:00')] });

    expect(onApplyFix).not.toHaveBeenCalled();
    expect(onSplit).not.toHaveBeenCalled();
  });
});

describe('popup de marcajes — marcajes manuales', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('añade a mano un marcaje a un día pasado indicando solo la hora', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-05T09:00:00')); // hoy es el día siguiente
    const { addManual } = await openPopup({ times: ['06:35'], entries: [entry('a', '06:35', '13:00')] });

    await userEvent.type(screen.getByLabelText(`Nueva hora fichada el ${DAY}`), '13:30');
    await userEvent.click(screen.getByRole('button', { name: /Añadir marcaje/ }));

    expect(addManual).toHaveBeenCalledWith(DAY, '13:30');
  });

  it('no deja añadir marcajes a hoy ni a días futuros', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(`${DAY}T09:00:00`));
    await openPopup({ times: ['06:35'], entries: [entry('a', '06:35', '13:00')] });

    expect(screen.queryByLabelText(`Nueva hora fichada el ${DAY}`)).not.toBeInTheDocument();
  });

  it('distingue el marcaje añadido a mano y deja corregirlo y borrarlo', async () => {
    const { updateManual, removeManual } = await openPopup({
      times: ['06:35', '14:17'],
      entries: [entry('a', '06:35', '14:17')],
      manualTimes: ['16:13'],
    });

    expect(screen.getByText('manual')).toBeInTheDocument();
    expect(screen.getByLabelText('Hora del marcaje manual de las 16:13')).toHaveValue('16:13');

    fireEvent.change(screen.getByLabelText('Hora del marcaje manual de las 16:13'), {
      target: { value: '16:20' },
    });
    expect(updateManual).toHaveBeenCalledWith(DAY, '16:13', '16:20');

    await userEvent.click(screen.getByRole('button', { name: /Borrar marcaje manual de las 16:13/ }));
    expect(removeManual).toHaveBeenCalledWith(DAY, '16:13');
  });

  it('un marcaje de la intranet no ofrece corregir ni borrar', async () => {
    await openPopup({ times: ['06:35', '14:17'], entries: [entry('a', '06:35', '14:17')] });

    expect(screen.queryByText('manual')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Borrar marcaje/ })).not.toBeInTheDocument();
    expect(screen.getAllByTitle('Marcaje de la intranet')).toHaveLength(2);
  });
});

describe('popup de marcajes — ignorar un día', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cualquier día con marcajes ofrece ignorarlo, no solo los mal formados', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-05T09:00:00'));
    const { setIgnored } = await openPopup({ times: ['06:35', '13:30'], entries: [entry('a', '06:35', '13:30')] });

    await userEvent.click(screen.getByRole('button', { name: 'Ignorar este día' }));
    expect(setIgnored).toHaveBeenCalledWith(DAY, true);
  });

  it('un día ignorado no muestra desajustes ni botones de ajuste, y se identifica', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-05T09:00:00'));
    const { setIgnored } = await openPopup({
      times: ['06:35', '13:30'],
      entries: [entry('a', '07:00', '13:30')],
      ignored: true,
    });

    expect(screen.getByText('marcajes ignorados')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ampliar|Recortar/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dejar de ignorar' }));
    expect(setIgnored).toHaveBeenCalledWith(DAY, false);
  });

  it('el día de hoy y los días sin marcajes no ofrecen ignorar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(`${DAY}T09:00:00`));
    await openPopup({ times: ['06:35', '13:30'], entries: [entry('a', '06:35', '13:30')] });
    expect(screen.queryByRole('button', { name: /Ignorar/ })).not.toBeInTheDocument();
  });

  it('un día sin marcajes no ofrece la acción aunque ya pasó', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-05T09:00:00'));
    await openPopup({ times: [], entries: [] });

    expect(screen.queryByRole('button', { name: /Ignorar/ })).not.toBeInTheDocument();
  });
});
