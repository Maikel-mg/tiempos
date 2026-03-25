import { renderHook, act } from '@testing-library/react';
import { useImportWizard } from '../hooks/use-import-wizard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CSVParserPort } from '../ports';

describe('useWizard Summaries', () => {
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

  it('calculates progress and isFullyMapped correctly', async () => {
    (mockCsvParser.parse as any).mockResolvedValue({
      headers: ['Tarea', 'Fecha de Inicio', 'Hora de Inicio', 'Fecha de Finalizacion', 'Hora de Finalizacion', 'Duracion (decimal)'],
      rows: [
        ['Task1', '17/03/2026', '09:00:00', '17/03/2026', '10:00:00', '1'],
        ['Task2', '17/03/2026', '10:00:00', '17/03/2026', '11:00:00', '1']
      ],
      separador: ','
    });

    const { result } = renderHook(() => useImportWizard({ adapters }));

    await act(async () => {
      await result.current.uploadFile(new File([], 'test.csv'));
    });

    expect(result.current.uniqueTasks).toBe(2);
    expect(result.current.mappedTasks).toBe(0);
    expect(result.current.progress).toBe(0);
    expect(result.current.isFullyMapped).toBe(false);

    act(() => {
      result.current.setTaskId('Task1', '123');
    });

    expect(result.current.mappedTasks).toBe(1);
    expect(result.current.progress).toBe(50);
    expect(result.current.isFullyMapped).toBe(false);

    act(() => {
      result.current.setTaskId('Task2', '456');
    });

    expect(result.current.mappedTasks).toBe(2);
    expect(result.current.progress).toBe(100);
    expect(result.current.isFullyMapped).toBe(true);
  });
});
