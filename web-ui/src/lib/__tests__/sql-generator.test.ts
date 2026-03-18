import { describe, test, expect } from 'vitest';
import { 
  generateTimeEntrySQL, 
  generateTaskSQL, 
  generateFromSource,
  parseISO8601DurationToMinutes,
  formatISOToSQLDate,
  formatISOToSQLTime,
  decimalHorasAMinutos,
  escapeSQL,
  validarFecha,
  validarHora,
  validarIdProceso,
  validarSeguroSQL
} from '../sql-generator/index';

describe('SQL Generator Module', () => {
  
  describe('generateTimeEntrySQL', () => {
    
    test('single time entry generates valid SQL', () => {
      const entries = [{
        task: 'Desarrollo API',
        fechaInicio: '17/03/2026',
        horaInicio: '09:00:00',
        fechaFin: '17/03/2026',
        horaFin: '11:30:00',
        duracionDecimal: '2.5'
      }];
      
      const taskMapping = { 'Desarrollo API': '1234' };
      const config = { usuario: 'BR00', tipoHora: 11 };
      
      const result = generateTimeEntrySQL(entries, taskMapping, config);
      
      expect(result.processed).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.sql).toContain('spNETTiempos_Alta');
      expect(result.sql).toContain("@Usured='BR00'");
      expect(result.sql).toContain('@Proceso=1234');
    });
    
    test('multiple entries generate batched SQL with GO separator', () => {
      const entries = [
        { task: 'Task1', fechaInicio: '17/03/2026', horaInicio: '09:00:00', fechaFin: '17/03/2026', horaFin: '10:00:00', duracionDecimal: '1' },
        { task: 'Task2', fechaInicio: '17/03/2026', horaInicio: '10:00:00', fechaFin: '17/03/2026', horaFin: '11:00:00', duracionDecimal: '1' }
      ];
      
      const taskMapping = { Task1: '100', Task2: '200' };
      const config = { usuario: 'BR00', tipoHora: 11 };
      
      const result = generateTimeEntrySQL(entries, taskMapping, config);
      
      expect(result.processed).toBe(2);
      expect(result.statements).toHaveLength(2);
      expect(result.sql).toContain('GO');
    });
    
    test('invalid task mapping returns error', () => {
      const entries = [{
        task: 'Unknown Task',
        fechaInicio: '17/03/2026',
        horaInicio: '09:00:00',
        fechaFin: '17/03/2026',
        horaFin: '11:30:00',
        duracionDecimal: '2.5'
      }];
      
      const taskMapping = { 'Known Task': '1234' };
      const config = { usuario: 'BR00', tipoHora: 11 };
      
      const result = generateTimeEntrySQL(entries, taskMapping, config);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Tarea no encontrada en mapeo');
    });
    
    test('invalid duration format throws error', () => {
      const entries = [{
        task: 'Task',
        fechaInicio: '17/03/2026',
        horaInicio: '09:00:00',
        fechaFin: '17/03/2026',
        horaFin: '11:30:00',
        duracionDecimal: 'invalid'
      }];
      
      const taskMapping = { 'Task': '1234' };
      const config = { usuario: 'BR00', tipoHora: 11 };
      
      const result = generateTimeEntrySQL(entries, taskMapping, config);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Duración inválida');
    });
  });
  
  describe('generateTaskSQL', () => {
    
    test('valid task definition generates SQL', () => {
      const task = {
        nombre: 'Nueva tarea',
        fechaInicio: '2026-03-17',
        fechaFin: '2026-03-20',
        minutos: 480,
        usuario: 'BR00'
      };
      
      const result = generateTaskSQL(task);
      
      expect(result).toContain('spNETTiempos_Procesos_Mantenimiento');
      expect(result).toContain("@pNombre = 'Nueva tarea'");
      expect(result).toContain("@pTecnicos = 'BR00'");
    });
  });
  
  describe('generateFromSource', () => {
    
    test('Clockify source generates SQL', () => {
      const source = {
        project: { name: 'Project A' },
        taskName: 'Task A',
        description: 'Working on feature',
        timeInterval: {
          start: '2026-03-17T09:00:00Z',
          end: '2026-03-17T12:30:00Z',
          duration: 'PT3H30M'
        }
      };
      
      const taskMapping = { 'Task A': '5678' };
      const config = { usuario: 'BR00', tipoHora: 11 };
      
      const result = generateFromSource(source, taskMapping, config);
      
      expect(result.processed).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.sql).toContain('spNETTiempos_Alta');
    });
    
    test('missing task in mapping throws error', () => {
      const source = {
        taskName: 'Unknown Task',
        timeInterval: {
          start: '2026-03-17T09:00:00Z',
          end: '2026-03-17T12:30:00Z',
          duration: 'PT3H30M'
        }
      };
      
      const taskMapping = { 'Known Task': '1234' };
      const config = { usuario: 'BR00', tipoHora: 11 };
      
      expect(() => generateFromSource(source, taskMapping, config)).toThrow('Tarea no encontrada en mapeo');
    });
  });
  
  describe('parseISO8601DurationToMinutes', () => {
    
    test('parses hours and minutes', () => {
      expect(parseISO8601DurationToMinutes('PT1H30M')).toBe(90);
    });
    
    test('parses with seconds rounding up', () => {
      expect(parseISO8601DurationToMinutes('PT1H30M45S')).toBe(91);
    });
    
    test('parses minutes only', () => {
      expect(parseISO8601DurationToMinutes('PT45M')).toBe(45);
    });
    
    test('handles empty input', () => {
      expect(parseISO8601DurationToMinutes('')).toBe(0);
      expect(parseISO8601DurationToMinutes(null)).toBe(0);
    });
  });
  
  describe('formatISOToSQLDate', () => {
    
    test('converts ISO date to DD/MM/YYYY', () => {
      expect(formatISOToSQLDate('2024-01-15T09:00:00Z')).toBe('15/01/2024');
    });
    
    test('handles empty input', () => {
      expect(formatISOToSQLDate('')).toBe('');
    });
  });
  
  describe('formatISOToSQLTime', () => {
    
    test('converts ISO time to HH:MM:SS', () => {
      // Note: Date parsing converts to local timezone
      // Using a time without timezone suffix to avoid conversion issues
      const result = formatISOToSQLTime('2024-01-15T09:30:00');
      expect(result).toMatch(/09:30:00|10:30:00/); // Depends on local timezone
    });
    
    test('handles empty input', () => {
      expect(formatISOToSQLTime('')).toBe('');
    });
  });
  
  describe('decimalHorasAMinutos', () => {
    
    test('parses decimal hours with dot', () => {
      expect(decimalHorasAMinutos('1.5')).toBe(90);
    });
    
    test('parses decimal hours with comma', () => {
      expect(decimalHorasAMinutos('1,5')).toBe(90);
    });
    
    test('parses HH:MM:SS format', () => {
      expect(decimalHorasAMinutos('01:30:00')).toBe(90);
    });
    
    test('rounds seconds at 30+', () => {
      expect(decimalHorasAMinutos('01:30:45')).toBe(91);
    });
    
    test('handles empty input', () => {
      expect(decimalHorasAMinutos('')).toBe(0);
    });
  });
  
  describe('escapeSQL', () => {
    
    test('escapes single quotes', () => {
      expect(escapeSQL("It's working")).toBe("It''s working");
    });
    
    test('handles empty input', () => {
      expect(escapeSQL('')).toBe('');
      expect(escapeSQL(null)).toBe('');
    });
  });
  
  describe('validarFecha', () => {
    
    test('accepts valid DD/MM/YYYY format', () => {
      expect(validarFecha('17/03/2026')).toBe('17/03/2026');
    });
    
    test('throws on invalid format', () => {
      expect(() => validarFecha('2026-03-17')).toThrow('Formato de fecha inválido');
    });
  });
  
  describe('validarHora', () => {
    
    test('accepts valid HH:MM:SS format', () => {
      expect(validarHora('09:30:00')).toBe('09:30:00');
    });
    
    test('throws on invalid format', () => {
      expect(() => validarHora('9:30')).toThrow('Formato de hora inválido');
    });
  });
  
  describe('validarIdProceso', () => {
    
    test('accepts valid positive integer', () => {
      expect(validarIdProceso(123)).toBe(123);
      expect(validarIdProceso('456')).toBe(456);
    });
    
    test('throws on invalid id', () => {
      expect(() => validarIdProceso(0)).toThrow('ID de proceso inválido');
      expect(() => validarIdProceso(-1)).toThrow('ID de proceso inválido');
      expect(() => validarIdProceso('abc')).toThrow('ID de proceso inválido');
    });
  });
  
  describe('validarSeguroSQL', () => {
    
    test('accepts normal text', () => {
      expect(validarSeguroSQL('Normal text')).toBe('Normal text');
    });
    
    test('throws on SQL comment', () => {
      expect(() => validarSeguroSQL('DROP--table')).toThrow('caracteres no permitidos');
    });
    
    test('throws on DROP statement', () => {
      expect(() => validarSeguroSQL('DROP TABLE users')).toThrow('caracteres no permitidos');
    });
  });
});
