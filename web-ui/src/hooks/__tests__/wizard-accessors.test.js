import { renderHook, act } from '@testing-library/react';
import { useWizard } from '../wizard/useWizard';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useWizard Accessors', () => {
  let mockCsvParser;
  let adapters;

  beforeEach(() => {
    mockCsvParser = { parse: vi.fn() };
    adapters = {
      csvParser: mockCsvParser,
      taskStorage: { loadSuggestedMapping: vi.fn(), saveMappings: vi.fn() },
      sqlGenerator: { generate: vi.fn() }
    };
  });

  it('getTasks returns structured task data', async () => {
    mockCsvParser.parse.mockResolvedValue({
      headers: ['Tarea', 'Fecha de Inicio', 'Hora de Inicio', 'Fecha de Finalizacion', 'Hora de Finalizacion', 'Duracion (decimal)'],
      rows: [['Task1', '17/03/2026', '09:00:00', '17/03/2026', '10:00:00', '1']],
      separador: ','
    });

    const { result } = renderHook(() => useWizard({ adapters }));

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
      assignedId: '123',
      isSuggested: false,
      summary: {
        startDate: '17/03/2026',
        endDate: '17/03/2026',
        totalMinutes: 60
      }
    });
  });
});
