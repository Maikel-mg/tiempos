import { describe, it, expect } from 'vitest';
import { planProcessSync } from '../processSyncPlanner';
import type { Proceso, ProcesoPendiente } from '../../types';

function proc(overrides: Partial<Proceso> & { proceso: number; nombre: string }): Proceso {
  return { ...overrides } as Proceso;
}
function pending(overrides: Partial<ProcesoPendiente> & { id: number; nombre: string }): ProcesoPendiente {
  return { minutos: 60, createdAt: 1, updatedAt: 1, ...overrides } as ProcesoPendiente;
}

describe('planProcessSync', () => {
  it('pull: system not in local are pull candidates', () => {
    const system = [proc({ proceso: 1, nombre: 'Alpha' }), proc({ proceso: 2, nombre: 'Beta' })];
    const local = [proc({ proceso: 1, nombre: 'Alpha' })];
    const pendings: ProcesoPendiente[] = [];
    const plan = planProcessSync(system, local, pendings);
    expect(plan.pull.map((p) => p.proceso)).toEqual([2]);
    expect(plan.push).toEqual([]);
    expect(plan.duplicates).toEqual([]);
  });

  it('push: pending not duplicated go to push', () => {
    const system = [proc({ proceso: 10, nombre: 'Existing' })];
    const local: Proceso[] = [];
    const pendings = [pending({ id: -1, nombre: 'Nuevo Uno' }), pending({ id: -2, nombre: 'Nuevo Dos' })];
    const plan = planProcessSync(system, local, pendings);
    expect(plan.push.map((p) => p.id)).toEqual([-1, -2]);
    expect(plan.duplicates).toEqual([]);
  });

  it('duplicates by normalized name, pull excludes duplicate system process', () => {
    const system = [proc({ proceso: 10, nombre: 'Proceso Duplicado' }), proc({ proceso: 11, nombre: 'Otro' })];
    const local: Proceso[] = [];
    const pendings = [pending({ id: -1, nombre: '  proceso duplicado ' })];
    const plan = planProcessSync(system, local, pendings);
    expect(plan.duplicates).toHaveLength(1);
    expect(plan.duplicates[0].pending.id).toBe(-1);
    expect(plan.duplicates[0].system.proceso).toBe(10);
    expect(plan.push).toEqual([]);
    expect(plan.pull.map((p) => p.proceso)).toEqual([11]);
  });

  it('duplicate detection is case and accent insensitive', () => {
    const system = [proc({ proceso: 5, nombre: 'Gestión Ágil' })];
    const local: Proceso[] = [];
    const pendings = [pending({ id: -1, nombre: 'gestion agil' })];
    const plan = planProcessSync(system, local, pendings);
    expect(plan.duplicates).toHaveLength(1);
  });

  it('if local already has proceso id, not pull even if name differs', () => {
    const system = [proc({ proceso: 1, nombre: 'Alpha New' })];
    const local = [proc({ proceso: 1, nombre: 'Alpha Old' })];
    const pendings: ProcesoPendiente[] = [];
    const plan = planProcessSync(system, local, pendings);
    expect(plan.pull).toEqual([]);
  });
});
