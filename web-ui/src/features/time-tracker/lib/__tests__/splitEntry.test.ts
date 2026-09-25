import { describe, it, expect } from 'vitest';
import { MIN_SPLIT_MINUTES, buildSplitHalves, cutTimeFromMinutes, planSplit, splitAffordance, splitAvailability } from '../splitEntry';
import type { TimeEntry } from '../../types';

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'entry-1',
    taskId: 100,
    taskName: 'Desarrollo',
    proceso: { proceso: 100, nombre: 'Desarrollo', proyectoId: 7, proyectoNombre: 'IPKWEB' },
    date: '2026-01-15',
    startTime: '09:12',
    endTime: '12:47',
    duration: 12900,
    description: 'Revisión de importaciones',
    createdAt: '2026-01-15T09:12:00Z',
    updatedAt: '2026-01-15T09:12:00Z',
    synced: false,
    ...overrides,
  };
}

const DEPS = { newId: 'entry-2', now: '2026-01-15T13:00:00Z' };

function expectHalves(entry: TimeEntry, cutTime: string) {
  const plan = planSplit(entry, cutTime);
  if (!plan.ok) throw new Error(`Se esperaba un plan válido, llegó: ${plan.reason}`);
  return buildSplitHalves(entry, plan.segments, DEPS);
}

describe('planSplit', () => {
  it('devuelve las dos mitades en orden temporal, con la fecha del Registro', () => {
    const plan = planSplit(makeEntry(), '11:00');

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.segments).toEqual([
      { date: '2026-01-15', startTime: '09:12', endTime: '11:00', minutes: 108 },
      { date: '2026-01-15', startTime: '11:00', endTime: '12:47', minutes: 107 },
    ]);
  });

  it('rechaza un Registro de menos de dos minutos', () => {
    const plan = planSplit(makeEntry({ startTime: '09:12', endTime: '09:13' }), '09:12');

    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.reason).toBe(
      `Un Registro de menos de ${MIN_SPLIT_MINUTES} minutos no se puede dividir`,
    );
  });

  it('acepta el caso mínimo: dos minutos con el corte en medio', () => {
    const plan = planSplit(makeEntry({ startTime: '09:00', endTime: '09:02' }), '09:01');

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.segments[0].minutes).toBe(1);
    expect(plan.segments[1].minutes).toBe(1);
  });

  it('rechaza el corte sobre la hora de inicio', () => {
    const plan = planSplit(makeEntry(), '09:12');

    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.reason).toBe('El corte tiene que caer dentro del Registro');
  });

  it('rechaza el corte sobre la hora de fin', () => {
    const plan = planSplit(makeEntry(), '12:47');

    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.reason).toBe('El corte tiene que caer dentro del Registro');
  });

  it('rechaza el corte fuera del Registro', () => {
    expect(planSplit(makeEntry(), '08:00').ok).toBe(false);
    expect(planSplit(makeEntry(), '14:00').ok).toBe(false);
  });

  it('rechaza una hora de corte inválida', () => {
    const plan = planSplit(makeEntry(), 'lo que sea');

    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.reason).toBe('Indica una hora de corte válida (HH:MM)');
  });

  it('rechaza un Registro que cruza la medianoche', () => {
    const plan = planSplit(makeEntry({ startTime: '23:30', endTime: '00:15' }), '23:50');

    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.reason).toBe('Un Registro que cruza la medianoche no se puede dividir a mano');
  });
});

describe('buildSplitHalves', () => {
  it('la primera mitad conserva id, createdAt y fecha; la segunda es nueva', () => {
    const entry = makeEntry();
    const { first, second } = expectHalves(entry, '11:00');

    expect(first.id).toBe('entry-1');
    expect(first.createdAt).toBe('2026-01-15T09:12:00Z');
    expect(first.date).toBe('2026-01-15');

    expect(second.id).toBe('entry-2');
    expect(second.createdAt).toBe(DEPS.now);
    expect(second.date).toBe('2026-01-15');
  });

  it('reparte los horarios y recalcula la duración en minutos', () => {
    const { first, second } = expectHalves(makeEntry(), '11:00');

    expect(first.startTime).toBe('09:12');
    expect(first.endTime).toBe('11:00');
    expect(first.duration).toBe(108 * 60);

    expect(second.startTime).toBe('11:00');
    expect(second.endTime).toBe('12:47');
    expect(second.duration).toBe(107 * 60);
  });

  it('clona la Tarea (Proceso) completa, no solo su nombre', () => {
    const { first, second } = expectHalves(makeEntry(), '11:00');

    expect(first.proceso).toEqual({
      proceso: 100,
      nombre: 'Desarrollo',
      proyectoId: 7,
      proyectoNombre: 'IPKWEB',
    });
    expect(second.proceso).toEqual(first.proceso);
    expect(second.taskId).toBe(100);
    expect(second.taskName).toBe('Desarrollo');
    expect(second.description).toBe('Revisión de importaciones');
  });

  it('deja las dos mitades pendientes y sin rastro de sincronización', () => {
    const { first, second } = expectHalves(
      makeEntry({ synced: true, syncError: 'boom', serverId: 42 }),
      '11:00',
    );

    expect(first.synced).toBe(false);
    expect(first.syncError).toBeUndefined();
    expect(first.serverId).toBeUndefined();
    expect(second.synced).toBe(false);
    expect(second.syncError).toBeUndefined();
    expect(second.serverId).toBeUndefined();
  });

  it('sella updatedAt en las dos mitades', () => {
    const { first, second } = expectHalves(makeEntry(), '11:00');

    expect(first.updatedAt).toBe(DEPS.now);
    expect(second.updatedAt).toBe(DEPS.now);
  });

  it('no muta el Registro original', () => {
    const entry = makeEntry();
    const snapshot = JSON.parse(JSON.stringify(entry));

    expectHalves(entry, '11:00');

    expect(entry).toEqual(snapshot);
  });

  it('aplica una descripción distinta a cada mitad cuando se indica', () => {
    const entry = makeEntry();
    const plan = planSplit(entry, '11:00');
    if (!plan.ok) throw new Error(plan.reason);

    const { first, second } = buildSplitHalves(entry, plan.segments, {
      ...DEPS,
      descriptions: { first: 'Revisión de endpoints', second: 'Maquetación' },
    });

    expect(first.description).toBe('Revisión de endpoints');
    expect(second.description).toBe('Maquetación');
  });

  it('hereda la descripción original en la mitad que no recibe una nueva', () => {
    const entry = makeEntry({ description: 'Original' });
    const plan = planSplit(entry, '11:00');
    if (!plan.ok) throw new Error(plan.reason);

    const { first, second } = buildSplitHalves(entry, plan.segments, {
      ...DEPS,
      descriptions: { first: 'Solo la primera' },
    });

    expect(first.description).toBe('Solo la primera');
    expect(second.description).toBe('Original');
  });

  it('permite vaciar la descripción de una mitad', () => {
    const entry = makeEntry({ description: 'Original' });
    const plan = planSplit(entry, '11:00');
    if (!plan.ok) throw new Error(plan.reason);

    const { first, second } = buildSplitHalves(entry, plan.segments, {
      ...DEPS,
      descriptions: { first: '' },
    });

    expect(first.description).toBe('');
    expect(second.description).toBe('Original');
  });
});

describe('cutTimeFromMinutes', () => {
  it('formatea minutos del día como HH:MM', () => {
    expect(cutTimeFromMinutes(0)).toBe('00:00');
    expect(cutTimeFromMinutes(630)).toBe('10:30');
    expect(cutTimeFromMinutes(1439)).toBe('23:59');
  });
});

describe('splitAvailability', () => {
  it('acepta un Registro normal', () => {
    expect(splitAvailability({ startTime: '09:12', endTime: '12:47' })).toEqual({ splittable: true });
  });

  it('rechaza el que cruza la medianoche antes de mirar la duración', () => {
    expect(splitAvailability({ startTime: '23:30', endTime: '00:15' })).toEqual({
      splittable: false,
      reason: 'Un Registro que cruza la medianoche no se puede dividir a mano',
    });
  });

  it('rechaza el de menos de dos minutos', () => {
    expect(splitAvailability({ startTime: '09:12', endTime: '09:13' })).toEqual({
      splittable: false,
      reason: `Un Registro de menos de ${MIN_SPLIT_MINUTES} minutos no se puede dividir`,
    });
  });

  it('acepta el de exactamente dos minutos', () => {
    expect(splitAvailability({ startTime: '09:12', endTime: '09:14' })).toEqual({ splittable: true });
  });

  it('rechaza un horario ilegible', () => {
    expect(splitAvailability({ startTime: '', endTime: '09:14' }).splittable).toBe(false);
  });
});

describe('splitAffordance', () => {
  it('un Registro normal se ofrece habilitado', () => {
    expect(splitAffordance(makeEntry())).toEqual({ visible: true, enabled: true });
  });

  it('no se ofrece en sincronizados', () => {
    expect(splitAffordance(makeEntry({ synced: true }))).toEqual({ visible: false });
  });

  it('no se ofrece en permisos', () => {
    expect(splitAffordance(makeEntry({ recoverable: true }))).toEqual({ visible: false });
  });

  it('se ofrece deshabilitado con el motivo cuando no hay ningún corte posible', () => {
    expect(splitAffordance(makeEntry({ startTime: '09:12', endTime: '09:13' }))).toEqual({
      visible: true,
      enabled: false,
      reason: `Un Registro de menos de ${MIN_SPLIT_MINUTES} minutos no se puede dividir`,
    });
  });
});
