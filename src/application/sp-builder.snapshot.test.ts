import { describe, test, expect } from 'vitest';
import { buildExecuteTimeEntriesSQL, buildCreateProcessSQL } from './sp-builder';
import type { TimeEntry } from './sp-builder';

// Gate del path de ESCRITURA. El CI nunca habla con SQL Server, así que la única
// forma de detectar un cambio no intencionado en el batch (formato de fecha, orden
// de parámetros, comillas, NULL) es congelar su forma completa aquí.
// Si un diff en el .snap es intencionado, actualízalo y dilo en el PR.
describe('gate SQL — batches de escritura', () => {
  const entry: TimeEntry = {
    entryId: 'e1',
    Usured: 'BR00',
    Fecha: '20260317',
    HoraDesde: '09:00:00',
    HoraHasta: '11:30:00',
    Minutos: 150,
    Proceso: 1234,
    pTipoHora: 11,
    Comentario: "It's a test",
  };

  test('batch de alta de tiempos (2 entradas, comillas y default de pTipoHora)', () => {
    const second: TimeEntry = {
      ...entry,
      entryId: 'e2',
      Usured: "O'Brien",
      Proceso: 5678,
      Minutos: 60,
      Comentario: undefined,
      pTipoHora: undefined,
    };
    expect(buildExecuteTimeEntriesSQL([entry, second])).toMatchSnapshot();
  });

  test('batch vacío: solo cabecera de idioma y formato', () => {
    expect(buildExecuteTimeEntriesSQL([])).toMatchSnapshot();
  });

  test('batch de alta de proceso (fechas DD/MM/YYYY → YYYYMMDD)', () => {
    expect(
      buildCreateProcessSQL({
        nombre: "Tarea O'Brien",
        fechaInicio: '17/03/2026',
        fechaFin: '31/03/2026',
        fechaEstimacion: '01/04/2026',
        minutos: 480,
        usuario: 'BR00',
        fase: 'DES',
      })
    ).toMatchSnapshot();
  });
});
