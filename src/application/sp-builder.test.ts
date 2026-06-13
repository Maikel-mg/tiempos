import { describe, test, expect } from 'vitest';
import { buildProjectsQuery, buildProjectsTreeQuery, buildProcessesQuery } from './sp-builder';

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
});
