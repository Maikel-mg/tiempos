import { renderHook, act } from '@testing-library/react';
import { useImportWizard } from '../hooks/use-import-wizard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CSVParserPort } from '../ports';

describe('useWizard Accessors', () => {
  let mockCsvParser: CSVParserPort;
  let adapters: any;

  beforeEach(() => {
    mockCsvParser = { parse: vi.fn() };
    adapters = {
      csvParser: mockCsvParser,
      taskStorage: { loadSuggestedMapping: vi.fn(), saveMappings: vi.fn() },
      sqlGenerator: { generate: vi.fn() }
    };
  });

  it('getTasks returns structured task data', async () => {
    (mockCsvParser.parse as any).mockResolvedValue({
      headers: ['Tarea', 'Fecha de Inicio', 'Hora de Inicio', 'Fecha de Finalizacion', 'Hora de Finalizacion', 'Duracion (decimal)'],
      rows: [['Task1', '17/03/2026', '09:00:00', '17/03/2026', '10:00:00', '1']],
      separador: ','
    });

    const { result } = renderHook(() => useImportWizard({ adapters }));

    await act(async () => {
      await result.current.uploadFile(new File([], 'test.csv'));
    });

    act(() => {
      result.current.setTaskId('Task1', '123');
    });

    const tasks = result.current.getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual({
      name: 'Task1',
      fechaInicio: '17/03/2026',
      fechaFin: '17/03/2026',
      totalMinutes: 60
    });
  });
});
