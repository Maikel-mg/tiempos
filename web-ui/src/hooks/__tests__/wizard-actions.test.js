import { renderHook, act } from '@testing-library/react';
import { useWizard } from '../wizard/useWizard';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useWizard Actions', () => {
  let mockCsvParser;
  let mockTaskStorage;
  let mockSqlGenerator;
  let adapters;

  beforeEach(() => {
    mockCsvParser = {
      parse: vi.fn()
    };
    mockTaskStorage = {
      loadSuggestedMapping: vi.fn(),
      saveMappings: vi.fn()
    };
    mockSqlGenerator = {
      generate: vi.fn()
    };
    adapters = {
      csvParser: mockCsvParser,
      taskStorage: mockTaskStorage,
      sqlGenerator: mockSqlGenerator
    };
  });

  it('initializes with step 1', () => {
    const { result } = renderHook(() => useWizard({ adapters }));
    expect(result.current.step).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('uploadFile parses CSV and moves to step 2', async () => {
    const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    mockCsvParser.parse.mockResolvedValue({
      headers: ['Tarea', 'Fecha de Inicio', 'Hora de Inicio', 'Fecha de Finalizacion', 'Hora de Finalizacion', 'Duracion (decimal)'],
      rows: [['Task1', '17/03/2026', '09:00:00', '17/03/2026', '10:00:00', '1']],
      separador: ','
    });
    mockTaskStorage.loadSuggestedMapping.mockReturnValue('123');

    const { result } = renderHook(() => useWizard({ adapters }));

    await act(async () => {
      await result.current.uploadFile(mockFile);
    });

    expect(result.current.step).toBe(2);
    expect(result.current.error).toBeNull();
    expect(result.current.totalRows).toBe(1);
    expect(result.current.uniqueTasks).toBe(1);
    expect(result.current._raw.taskMapping['Task1']).toBe('123');
  });

  it('setTaskId updates mapping and persists', async () => {
    const { result } = renderHook(() => useWizard({ adapters }));

    act(() => {
      result.current.setTaskId('Task1', '456');
    });

    expect(result.current._raw.taskMapping['Task1']).toBe('456');
    expect(mockTaskStorage.saveMappings).toHaveBeenCalledWith({ 'Task1': '456' });
  });

  it('generateSQL produces SQL and moves to step 3', async () => {
    // Setup state by uploading first
    const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    mockCsvParser.parse.mockResolvedValue({
      headers: ['Tarea', 'Fecha de Inicio', 'Hora de Inicio', 'Fecha de Finalizacion', 'Hora de Finalizacion', 'Duracion (decimal)'],
      rows: [['Task1', '17/03/2026', '09:00:00', '17/03/2026', '10:00:00', '1']],
      separador: ','
    });
    mockSqlGenerator.generate.mockReturnValue({
      sql: 'EXEC sp...',
      statements: ['EXEC sp...'],
      processed: 1,
      errors: [],
      total: 1
    });

    const { result } = renderHook(() => useWizard({ adapters }));

    await act(async () => {
      await result.current.uploadFile(mockFile);
    });

    act(() => {
      result.current.setTaskId('Task1', '123');
    });

    act(() => {
      result.current.generateSQL();
    });

    expect(result.current.step).toBe(3);
    expect(result.current.getSqlResult().sql).toBe('EXEC sp...');
  });

  it('reset clears state', async () => {
    const { result } = renderHook(() => useWizard({ adapters }));

    // Manually set some state
    act(() => {
      result.current.setTaskId('Task1', '123');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.step).toBe(1);
    expect(result.current._raw.taskMapping).toEqual({});
  });
});
