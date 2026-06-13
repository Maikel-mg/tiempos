import { describe, test, expect } from 'vitest';
import { buildProjectsQuery, buildProjectsTreeQuery, buildProcessesQuery, buildExecuteTimeEntriesSQL, type TimeEntry } from './sp-builder';

describe('sp-builder', () => {
  describe('buildProjectsQuery', () => {
    test('includes SET LANGUAGE Spanish and SET DATEFORMAT dmy', () => {
      const query = buildProjectsQuery({ fecha: '2024-01-15', usured: 'MG01' });
      expect(query).toContain('SET LANGUAGE Spanish');
      expect(query).toContain('SET DATEFORMAT dmy');
    });

    test('calls spNETProyectos_SeleccionProyectos with DD/MM/YYYY date', () => {
      const query = buildProjectsQuery({ fecha: '2024-01-15', usured: 'MG01' });
      expect(query).toContain('spNETProyectos_SeleccionProyectos');
      expect(query).toContain("@pFecha = '15/01/2024'");
    });

    test('escapes single quotes in usured', () => {
      const query = buildProjectsQuery({ usured: "O'Brien" });
      expect(query).toContain("@pUsured = 'O''Brien'");
    });

    test('defaults to MG01 when usured not provided', () => {
      const query = buildProjectsQuery({});
      expect(query).toContain("@pUsured = 'MG01'");
    });

    test('defaults modoProc to 1 when not provided', () => {
      const query = buildProjectsQuery({});
      expect(query).toContain('@pModoProc = 1');
    });
  });

  describe('buildProjectsTreeQuery', () => {
    test('includes SET LANGUAGE Spanish and SET DATEFORMAT dmy', () => {
      const query = buildProjectsTreeQuery({ fecha: '2024-01-15' });
      expect(query).toContain('SET LANGUAGE Spanish');
      expect(query).toContain('SET DATEFORMAT dmy');
    });

    test('calls spNETProyectos_TreeProyectos with YYYYMMDD date', () => {
      const query = buildProjectsTreeQuery({ fecha: '2024-01-15' });
      expect(query).toContain('spNETProyectos_TreeProyectos');
      expect(query).toContain("@pFecha = '20240115'");
    });

    test('parses DD/MM/YYYY as DD first', () => {
      const query = buildProjectsTreeQuery({ fecha: '15/01/2024' });
      expect(query).toContain("@pFecha = '20240115'");
    });

    test('uses NULL for missing optional params', () => {
      const query = buildProjectsTreeQuery({});
      expect(query).toContain('@pClientes = NULL');
      expect(query).toContain('@pProyectos = NULL');
    });

    test('escapes single quotes in codCli and proyecto', () => {
      const query = buildProjectsTreeQuery({ codCli: "O'Brien", proyecto: "it's" });
      expect(query).toContain("@pClientes = 'O''Brien'");
      expect(query).toContain("@pProyectos = 'it''s'");
    });
  });

  describe('buildProcessesQuery', () => {
    test('includes SET LANGUAGE Spanish and SET DATEFORMAT dmy', () => {
      const query = buildProcessesQuery({ usured: 'MG01' });
      expect(query).toContain('SET LANGUAGE Spanish');
      expect(query).toContain('SET DATEFORMAT dmy');
    });

    test('calls spNETTiempos_SEL_TraerProcesos', () => {
      const query = buildProcessesQuery({ usured: 'MG01' });
      expect(query).toContain('spNETTiempos_SEL_TraerProcesos');
      expect(query).toContain("@pUsured = 'MG01'");
    });

    test('escapes single quotes in usured', () => {
      const query = buildProcessesQuery({ usured: "O'Brien" });
      expect(query).toContain("@pUsured = 'O''Brien'");
    });

    test('trims whitespace from usured', () => {
      const query = buildProcessesQuery({ usured: '  MG01  ' });
      expect(query).toContain("@pUsured = 'MG01'");
    });
  });

  describe('buildExecuteTimeEntriesSQL', () => {
    const baseEntry: TimeEntry = {
      entryId: 'e1',
      Usured: 'BR00',
      Fecha: '20260317',
      HoraDesde: '09:00:00',
      HoraHasta: '11:30:00',
      Minutos: 150,
      Proceso: 1234,
      pTipoHora: 11,
      Comentario: 'Test entry',
    };

    test('includes SET LANGUAGE Spanish and SET DATEFORMAT dmy', () => {
      const sql = buildExecuteTimeEntriesSQL([baseEntry]);
      expect(sql).toContain('SET LANGUAGE Spanish');
      expect(sql).toContain('SET DATEFORMAT dmy');
    });

    test('calls spNETTiempos_Alta', () => {
      const sql = buildExecuteTimeEntriesSQL([baseEntry]);
      expect(sql).toContain('spNETTiempos_Alta');
    });

    test('uses YYYYMMDD format for Fecha', () => {
      const sql = buildExecuteTimeEntriesSQL([baseEntry]);
      expect(sql).toContain("@Fecha='20260317'");
    });

    test('includes all required parameters', () => {
      const sql = buildExecuteTimeEntriesSQL([baseEntry]);
      expect(sql).toContain("@Usured='BR00'");
      expect(sql).toContain("@HoraDesde='09:00:00'");
      expect(sql).toContain("@HoraHasta='11:30:00'");
      expect(sql).toContain('@Minutos=150');
      expect(sql).toContain('@Proceso=1234');
      expect(sql).toContain('@pTipoHora=11');
      expect(sql).toContain("@Comentario='Test entry'");
    });

    test('defaults pTipoHora to 11 when not provided', () => {
      const entry = { ...baseEntry, pTipoHora: undefined };
      const sql = buildExecuteTimeEntriesSQL([entry]);
      expect(sql).toContain('@pTipoHora=11');
    });

    test('escapes single quotes in Comentario', () => {
      const entry = { ...baseEntry, Comentario: "It's a test" };
      const sql = buildExecuteTimeEntriesSQL([entry]);
      expect(sql).toContain("@Comentario='It''s a test'");
    });

    test('escapes single quotes in Usured', () => {
      const entry = { ...baseEntry, Usured: "O'Brien" };
      const sql = buildExecuteTimeEntriesSQL([entry]);
      expect(sql).toContain("@Usured='O''Brien'");
    });

    test('generates multiple EXEC statements for multiple entries', () => {
      const entries = [
        baseEntry,
        { ...baseEntry, entryId: 'e2', Proceso: 5678, Minutos: 60 },
      ];
      const sql = buildExecuteTimeEntriesSQL(entries);
      const execCount = (sql.match(/EXEC spNETTiempos_Alta/g) || []).length;
      expect(execCount).toBe(2);
      expect(sql).toContain('@Proceso=1234');
      expect(sql).toContain('@Proceso=5678');
    });

    test('returns header-only SQL for empty entries', () => {
      const sql = buildExecuteTimeEntriesSQL([]);
      expect(sql).toContain('SET LANGUAGE Spanish');
      expect(sql).toContain('SET DATEFORMAT dmy');
      expect(sql).not.toContain('EXEC');
    });
  });
});
