import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessMappingTable } from '../ProcessMappingTable';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock ProcessSelector to avoid full render complexity here
// Capture onSelect and onCreateNew to verify callback chain works
let capturedOnSelect: ((projectCode: string, processId: string) => void) | null = null;
let capturedOnCreateNew: ((data: { fases: Array<{ id: string; label: string }>; usuario: string; projectInfo?: any }) => void) | null = null;
vi.mock('../ProcessSelector', () => ({
  ProcessSelector: ({ open, onSelect, onCreateNew }: { 
    open: boolean; 
    onSelect?: (projectCode: string, processId: string) => void;
    onCreateNew?: (data: { fases: Array<{ id: string; label: string }>; usuario: string; projectInfo?: any }) => void;
  }) => {
    if (open && onSelect) capturedOnSelect = onSelect;
    if (open && onCreateNew) capturedOnCreateNew = onCreateNew;
    return open ? <div data-testid="process-selector">Selector Open</div> : null;
  }
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

  it('should pass current taskMapping value to selector when opening', () => {
    const onUpdateProcessId = vi.fn();
    
    render(
      <ProcessMappingTable
        processes={mockProcesses}
        taskMapping={{ 'Task 1': 'existing-id-123' }}
        localErrors={{}}
        config={mockConfig}
        onUpdateProcessId={onUpdateProcessId}
      />,
      { wrapper }
    );

    const input = screen.getByDisplayValue('existing-id-123');
    expect(input).toBeDefined();
    
    fireEvent.click(input);
    
    // Input value should still show the pre-filled ID
    expect(screen.getByDisplayValue('existing-id-123')).toBeDefined();
  });

  it('should call onUpdateProcessId when selector selects a process', () => {
    const onUpdateProcessId = vi.fn();
    
    render(
      <ProcessMappingTable
        processes={mockProcesses}
        taskMapping={{}}
        localErrors={{}}
        config={mockConfig}
        onUpdateProcessId={onUpdateProcessId}
      />,
      { wrapper }
    );

    // Open selector
    const input = screen.getByPlaceholderText('Seleccionar ID...');
    fireEvent.click(input);
    expect(screen.getByTestId('process-selector')).toBeDefined();
    
    // Simulate selector calling onSelect with selected process
    if (capturedOnSelect) {
      capturedOnSelect('PR1', '456');
    }
    
    // Verify parent callback was called with correct values
    expect(onUpdateProcessId).toHaveBeenCalledWith('Task 1', '456');
  });

  it('should allow manual typing in input (fallback)', () => {
    const onUpdateProcessId = vi.fn();
    
    render(
      <ProcessMappingTable
        processes={mockProcesses}
        taskMapping={{}}
        localErrors={{}}
        config={mockConfig}
        onUpdateProcessId={onUpdateProcessId}
      />,
      { wrapper }
    );

    // Type directly in the input (without clicking to open selector)
    const input = screen.getByPlaceholderText('Seleccionar ID...');
    fireEvent.change(input, { target: { value: 'manual-id-789' } });
    
    // onUpdateProcessId should be called with the typed value
    expect(onUpdateProcessId).toHaveBeenCalledWith('Task 1', 'manual-id-789');
  });

  it('should pre-fill input when taskMapping has existing value', () => {
    const onUpdateProcessId = vi.fn();
    
    render(
      <ProcessMappingTable
        processes={mockProcesses}
        taskMapping={{ 'Task 1': 'prefilled-id' }}
        localErrors={{}}
        config={mockConfig}
        onUpdateProcessId={onUpdateProcessId}
      />,
      { wrapper }
    );

    // Input should show prefilled value
    const input = screen.getByDisplayValue('prefilled-id');
    expect(input).toBeDefined();
    
    // Can still type to update
    fireEvent.change(input, { target: { value: 'new-id' } });
    expect(onUpdateProcessId).toHaveBeenCalledWith('Task 1', 'new-id');
  });

  describe('Create new process flow', () => {
    const mockFases = [
      { id: '10', label: 'Diseño / Fase 1' },
      { id: '20', label: 'Desarrollo / Fase 2' },
    ];

    beforeEach(() => {
      // Reset captured callbacks
      capturedOnCreateNew = null;
    });

    function openSelectorAndTriggerCreateNew() {
      const input = screen.getByPlaceholderText('Seleccionar ID...');
      fireEvent.click(input);
      expect(screen.getByTestId('process-selector')).toBeDefined();
      expect(capturedOnCreateNew).not.toBeNull();
      act(() => {
        capturedOnCreateNew!({ fases: mockFases, usuario: 'test' });
      });
    }

    it('should open SQLPreviewModal in creation mode and close ProcessSelector when onCreateNew is triggered', () => {
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

      openSelectorAndTriggerCreateNew();

      // ProcessSelector should be closed
      expect(screen.queryByTestId('process-selector')).toBeNull();

      // SQLPreviewModal should now be open with title "Crear Proceso"
      expect(screen.getByText('Crear Proceso')).toBeDefined();
    });

    it('should render fases as a Select dropdown in the modal (not text input)', async () => {
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

      openSelectorAndTriggerCreateNew();

      // Wait for the dialog to render and verify it's open
      await waitFor(() => {
        expect(screen.getByText('Crear Proceso')).toBeDefined();
      });

      // The text input for fase should NOT be present when fases are provided as array
      expect(screen.queryByPlaceholderText('Código de fase')).toBeNull();
    });

    it('should pass projectInfo to SQLPreviewModal and show read-only project info', async () => {
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
      expect(capturedOnCreateNew).not.toBeNull();

      act(() => {
        capturedOnCreateNew!({
          fases: mockFases,
          usuario: 'test',
          projectInfo: {
            CodCli: 'CLI1',
            NomCliente: 'Client One',
            NomProy: 'Project Alpha',
            Proyecto: 'PA',
          },
        });
      });

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Crear Proceso')).toBeDefined();
      });

      // Should show read-only project info
      expect(screen.getByText('Client One / Project Alpha (PA)')).toBeDefined();
      // Should NOT show editable input for proyecto
      expect(screen.queryByPlaceholderText('Código de proyecto')).toBeNull();
    });

    it('should not re-open ProcessSelector after successful creation flow is triggered', async () => {
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

      openSelectorAndTriggerCreateNew();

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Crear Proceso')).toBeDefined();
      });

      // ProcessSelector should remain closed (handleCreateNew called setSelectorOpen(false))
      expect(screen.queryByTestId('process-selector')).toBeNull();

      // The SQLPreviewModal title is visible, confirming we're in creation mode
      expect(screen.getByText('Crear Proceso')).toBeDefined();
    });
  });
});
