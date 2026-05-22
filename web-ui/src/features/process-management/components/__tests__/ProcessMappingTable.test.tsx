import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProcessMappingTable } from '../ProcessMappingTable';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock ProcessSelector to avoid full render complexity here
vi.mock('../ProcessSelector', () => ({
  ProcessSelector: ({ open }: { open: boolean }) => open ? <div data-testid="process-selector">Selector Open</div> : null
}));

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('ProcessMappingTable Integration', () => {
  const mockProcesses = [
    { name: 'Task 1', fechaInicio: '2023-01-01', fechaFin: '2023-01-01', totalMinutes: 60 },
  ];
  const mockConfig = { usuario: 'test', fase: '123', tipoHora: '11' };

  it('should open ProcessSelector when an input is clicked', () => {
    render(
      <ProcessMappingTable
        processes={mockProcesses}
        taskMapping={{}}
        localErrors={{}}
        config={mockConfig}
        onUpdateProcessId={vi.fn()}
      />,
      { wrapper }
    );

    const input = screen.getByPlaceholderText('Seleccionar ID...');
    fireEvent.click(input);

    expect(screen.getByTestId('process-selector')).toBeDefined();
  });

  it('should only have one ProcessSelector instance across multiple rows', () => {
    const multiProcesses = [
      { name: 'Task 1', fechaInicio: '2023-01-01', fechaFin: '2023-01-01', totalMinutes: 60 },
      { name: 'Task 2', fechaInicio: '2023-01-01', fechaFin: '2023-01-01', totalMinutes: 60 },
    ];
    
    render(
      <ProcessMappingTable
        processes={multiProcesses}
        taskMapping={{}}
        localErrors={{}}
        config={mockConfig}
        onUpdateProcessId={vi.fn()}
      />,
      { wrapper }
    );

    const inputs = screen.getAllByPlaceholderText('Seleccionar ID...');
    
    // Click first input
    fireEvent.click(inputs[0]);
    expect(screen.getAllByTestId('process-selector')).toHaveLength(1);
    
    // Click second input
    fireEvent.click(inputs[1]);
    expect(screen.getAllByTestId('process-selector')).toHaveLength(1);
  });
});
