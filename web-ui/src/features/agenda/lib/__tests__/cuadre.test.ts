import { describe, expect, it } from 'vitest';
import { parseHHMM } from '@/lib/format';
import {
  conflictOf,
  cuadrarDia,
  fixesAjustables,
  franjasOf,
  isDiaFichadoValido,
  patchEntry,
  type MarcajeFix,
} from '../cuadre';
import type { TimeEntry } from '@/features/time-tracker/types';

const HOY = '2026-11-05';

function entry(id: string, date: string, startTime: string, endTime: string): TimeEntry {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return {
    id,
    taskId: 10,
    taskName: 'Clasificador',
    proceso: { proceso: 10, nombre: 'Clasificador' },
    date,
    startTime,
    endTime,
    duration: (eh * 60 + em - (sh * 60 + sm)) * 60,
    synced: false,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

describe('franjasOf', () => {
  it('empareja los Marcajes por posición, no por dirección', () => {
    expect(franjasOf(['15:15', '06:35', '16:13', '13:30'])).toEqual([
      { start: '06:35', end: '13:30' },
      { start: '15:15', end: '16:13' },
    ]);
  });

  it('un Marcaje impar no forma franja', () => {
    expect(franjasOf(['06:35', '13:30', '15:15'])).toEqual([{ start: '06:35', end: '13:30' }]);
  });
});

describe('isDiaFichadoValido', () => {
  it('pide un número par de Marcajes y al menos dos', () => {
    expect(isDiaFichadoValido([])).toBe(false);
    expect(isDiaFichadoValido(['06:35'])).toBe(false);
    expect(isDiaFichadoValido(['06:35', '13:30'])).toBe(true);
    expect(isDiaFichadoValido(['06:35', '13:30', '15:15'])).toBe(false);
    expect(isDiaFichadoValido(['06:35', '13:30', '15:15', '16:13'])).toBe(true);
  });
});

describe('cuadrarDia — estado del día', () => {
  const dia = (times: string[], entries: TimeEntry[] = [], extra: { today?: string; ignored?: boolean } = {}) =>
    cuadrarDia({ day: '2026-11-04', today: extra.today ?? HOY, times, ignored: extra.ignored, entries });

  it('hoy queda siempre fuera del cuadre, tenga los marcajes que tenga', () => {
    expect(dia(['06:35', '13:30'], [], { today: '2026-11-04' }).status).toBe('hoy');
  });

  it('sin marcajes no es descuadrado: es que no hay información', () => {
    expect(dia([], [entry('a', '2026-11-04', '09:00', '10:00')]).status).toBe('sin-marcajes');
  });

  it('con menos de dos marcajes o número impar, el día no tiene franjas fiables', () => {
    expect(dia(['06:35']).status).toBe('sin-marcajes-validos');
    expect(dia(['06:35', '13:30', '15:15']).status).toBe('sin-marcajes-validos');
  });

  it('un día ignorado no se evalúa aunque sus marcajes sean válidos', () => {
    const cuadre = dia(['06:35', '13:30'], [entry('a', '2026-11-04', '09:00', '10:00')], { ignored: true });

    expect(cuadre.status).toBe('ignorado');
    expect(cuadre.desajustes).toEqual([]);
  });

  it('cuadra cuando el Registro cabe entero en la franja', () => {
    expect(dia(['06:35', '14:17'], [entry('a', '2026-11-04', '06:35', '14:17')]).status).toBe('cuadra');
  });

  it('se descuadra con un solo minuto de diferencia fuera de la franja', () => {
    expect(dia(['06:35', '14:17'], [entry('a', '2026-11-04', '06:36', '14:17')]).status).toBe('descuadrado');
  });

  it('un día sin marcajes válidos no inventa desajustes', () => {
    const cuadre = dia(['06:35', '13:30', '15:15'], [entry('a', '2026-11-04', '09:00', '10:00')]);

    expect(cuadre.desajustes).toEqual([]);
    expect(cuadre.franjas).toHaveLength(1);
  });
});

describe('cuadre aplicado — el día deja de estar descuadrado', () => {
  const day = '2026-11-04';

  it('aplicar la corrección propuesta deja el día cuadrado', () => {
    const descuadrado = entry('a', day, '07:00', '13:30');
    const antes = cuadrarDia({ day, today: HOY, times: ['06:35', '13:30'], entries: [descuadrado] });
    const fix = antes.desajustes[0].fixes[0];

    expect(fix.patch).toEqual({ startTime: '06:35' });
    const corregido = patchEntry(descuadrado, fix);
    expect(corregido.startTime).toBe('06:35');
    expect(corregido.duration).toBe((13 * 60 + 30 - (6 * 60 + 35)) * 60);

    const despues = cuadrarDia({ day, today: HOY, times: ['06:35', '13:30'], entries: [corregido] });
    expect(despues.status).toBe('cuadra');
    expect(despues.desajustes).toEqual([]);
  });

  it('detecta el Registro con el que chocaría la corrección', () => {
    const entries = [entry('a', day, '06:35', '14:30'), entry('b', day, '13:00', '14:00')];
    const fix = cuadrarDia({ day, today: HOY, times: ['06:35', '13:30'], entries }).desajustes[0].fixes[0];

    expect(fix.patch).toEqual({ endTime: '13:30' });
    expect(conflictOf(entries, fix)?.id).toBe('b');
  });

  it('sin solape no hay conflicto y la corrección se puede aplicar', () => {
    const entries = [entry('a', day, '06:35', '13:00'), entry('b', day, '13:30', '14:00')];
    const fix: MarcajeFix = {
      entryId: 'a',
      kind: 'recortar-fin',
      patch: { endTime: '13:30' },
      label: 'Recortar fin a 13:30',
    };

    expect(conflictOf(entries, fix)).toBeNull();
  });
});

describe('Registro que cruza dos franjas', () => {
  const day = '2026-11-04';
  // Fichado 06:35–13:30 y 15:15–16:13: la comida no se fichó.
  const times = ['06:35', '13:30', '15:15', '16:13'];

  it('se distingue del resto y dice cuántos minutos quedan dentro y fuera', () => {
    const cuadre = cuadrarDia({ day, today: HOY, times, entries: [entry('a', day, '13:00', '14:00')] });

    expect(cuadre.status).toBe('descuadrado');
    expect(cuadre.desajustes).toHaveLength(1);
    expect(cuadre.desajustes[0]).toMatchObject({
      kind: 'cruza-franja',
      minutosFichados: 30,
      minutosNoFichados: 30,
    });
  });

  it('ofrece el recorte al borde de la franja donde empieza y un enlace a Dividir', () => {
    const cuadre = cuadrarDia({ day, today: HOY, times, entries: [entry('a', day, '13:00', '14:00')] });
    const fix = cuadre.desajustes[0].fixes[0];

    expect(fix).toMatchObject({ kind: 'cruza-franja', patch: { endTime: '13:30' }, dividir: true });
    expect(fix.label).toBe('Recortar fin a 13:30');
    // Nunca se parte el Registro en dos por su cuenta: solo se ofrece la corrección.
    expect(cuadre.desajustes[0].fixes).toHaveLength(1);
  });

  it('un día con marcajes válidos y sin cruces no cambia', () => {
    const cuadre = cuadrarDia({
      day,
      today: HOY,
      times,
      entries: [entry('a', day, '06:35', '13:30'), entry('b', day, '15:15', '16:13')],
    });

    expect(cuadre.status).toBe('cuadra');
    expect(cuadre.desajustes).toEqual([]);
  });
});

describe('día completado a mano', () => {
  const day = '2026-11-04';

  it('un día sin marcajes válidos se cuadra en cuanto el marcaje manual lo completa', () => {
    const entries = [entry('a', day, '06:35', '13:30'), entry('b', day, '15:15', '16:13')];
    const incompleto = ['06:35', '13:30', '15:15'];

    expect(cuadrarDia({ day, today: HOY, times: incompleto, entries }).status).toBe('sin-marcajes-validos');

    const completado = cuadrarDia({ day, today: HOY, times: [...incompleto, '16:13'], entries });
    expect(completado.status).toBe('cuadra');
    expect(completado.franjas).toEqual([
      { start: '06:35', end: '13:30' },
      { start: '15:15', end: '16:13' },
    ]);
  });

  it('un manual duplicado deja el día impar y fuera del cuadre hasta que se borre', () => {
    const entries = [entry('a', day, '06:35', '13:30')];
    // La intranet devolvió tarde el mismo fichaje que el usuario ya había puesto a mano.
    const duplicado = ['06:35', '06:35', '13:30'];

    expect(cuadrarDia({ day, today: HOY, times: duplicado, entries }).status).toBe('sin-marcajes-validos');
    expect(cuadrarDia({ day, today: HOY, times: ['06:35', '13:30'], entries }).status).toBe('cuadra');
  });
});

describe('Ajustar el día en lote', () => {
  const day = '2026-11-04';
  const times = ['06:35', '13:30', '15:15', '16:13'];

  it('aplica los desajustes simples en orden de hora y el día deja de estar descuadrado', () => {
    const entries = [
      entry('tarde', day, '15:30', '16:13'),
      entry('manana', day, '07:00', '13:30'),
    ];
    const antes = cuadrarDia({ day, today: HOY, times, entries });
    const fixes = fixesAjustables(antes.desajustes).sort(
      (a, b) => parseHHMM(patchEntry(entries.find((e) => e.id === a.entryId)!, a).startTime) - parseHHMM(patchEntry(entries.find((e) => e.id === b.entryId)!, b).startTime),
    );

    let corregidos = entries;
    for (const fix of fixes) {
      corregidos = corregidos.map((e) => (e.id === fix.entryId ? patchEntry(e, fix) : e));
    }

    expect(fixes.map((fix) => fix.entryId)).toEqual(['manana', 'tarde']);
    const despues = cuadrarDia({ day, today: HOY, times, entries: corregidos });
    expect(despues.status).toBe('cuadra');
  });

  it('el lote no incluye los Registros que cruzan franjas', () => {
    const cuadre = cuadrarDia({ day, today: HOY, times, entries: [entry('a', day, '13:00', '14:00')] });

    expect(cuadre.desajustes[0].kind).toBe('cruza-franja');
    expect(fixesAjustables(cuadre.desajustes)).toEqual([]);
  });
});
