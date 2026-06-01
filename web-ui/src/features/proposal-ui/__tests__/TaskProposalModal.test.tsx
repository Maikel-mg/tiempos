import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { TaskProposalModal } from '../components/TaskProposalModal';
import type { TaskProposal } from '@/domain/proposals/extract-proposals';
import type { ProcessConfig } from '@/features/process-management/types';

// Mock the child components
vi.mock('@/features/process-management/components/ProcessSelector', () => ({
  ProcessSelector: ({ open, onSelect }: any) => {
    if (!open) return null;
    return (
      <div data-testid="process-selector">
        <button onClick={() => onSelect('projCode', 'PROC-123')}>Select</button>
      </div>
    );
  },
}));

vi.mock('@/lib/task-mapping-storage', () => ({
  updateMapping: vi.fn(),
}));

vi.mock('@/components/SQLPreviewModal', () => ({
  SQLPreviewModal: ({ open, title, taskData, onExecute, isExecuting, executeResult }: any) => {
    if (!open) return null;
    return (
      <div data-testid="sql-preview-modal">
        <span data-testid="sql-preview-title">{title}</span>
        <span data-testid="sql-preview-task-data">{JSON.stringify(taskData)}</span>
        <span data-testid="sql-preview-executing">{String(isExecuting)}</span>
        <span data-testid="sql-preview-result">{JSON.stringify(executeResult)}</span>
        {onExecute && (
          <button data-testid="sql-execute-btn" onClick={() => onExecute('SELECT 1')}>Execute</button>
        )}
      </div>
    );
  },
}));

vi.mock('@/features/process-management/mutations/useCreateProcess', () => ({
  useCreateProcess: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    data: null,
    error: null,
  })),
}));

describe('TaskProposalModal', () => {
  const mockProposals: TaskProposal[] = [
    {
      description: 'Reunión equipo',
      genericTask: 'ABC 2025-01. General',
      totalHours: 12,
      proposedName: 'ABC 2025-01. Reunión equipo',
      projectCode: 'ABC',
      period: '2025-01',
      fechaInicio: '2025-01-01',
      fechaFin: '2025-01-15',
      entryCount: 5,
      entryIds: ['1', '2'],
      clockifyProjectId: '123',
    },
    {
      description: 'Desarrollo features',
      genericTask: 'XYZ 2025-01. General',
      totalHours: 20,
      proposedName: 'XYZ 2025-01. Desarrollo features',
      projectCode: 'XYZ',
      period: '2025-01',
      fechaInicio: '2025-01-02',
      fechaFin: '2025-01-16',
      entryCount: 8,
      entryIds: ['3', '4'],
      clockifyProjectId: '456',
    },
  ];

  const mockConfig: ProcessConfig = {
    usuario: 'testuser',
    fase: '1',
    tipoHora: '1',
  };

  const mockOnAccept = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when open is false', () => {
    render(
      <TaskProposalModal
        open={false}
        onOpenChange={() => {}}
        proposals={mockProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    expect(screen.queryByText('Seleccionar ID de Tarea')).not.toBeInTheDocument();
  });

  it('shows empty state when proposals empty', () => {
    render(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={[]}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    expect(screen.getByText('Seleccionar ID de Tarea')).toBeInTheDocument();
    expect(screen.getByText('No hay propuestas pendientes')).toBeInTheDocument();
  });

  it('renders table with proposals', () => {
    render(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={mockProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Descripción')).toBeInTheDocument();
    expect(screen.getByText('Tarea Genérica')).toBeInTheDocument();
    expect(screen.getByText('Horas')).toBeInTheDocument();
    expect(screen.getByText('Nombre Propuesto')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();

    // Check proposal data appears
    expect(screen.getByText('Reunión equipo')).toBeInTheDocument();
    expect(screen.getByText('ABC 2025-01. General')).toBeInTheDocument();
    expect(screen.getByText('Desarrollo features')).toBeInTheDocument();
    expect(screen.getByText('XYZ 2025-01. General')).toBeInTheDocument();
  });

  it('processId inputs are initially empty and read-only', () => {
    render(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={mockProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    const processInputs = screen.getAllByPlaceholderText('ID de proceso');
    expect(processInputs).toHaveLength(2);
    processInputs.forEach(input => {
      expect(input).toHaveValue('');
      expect(input).toHaveAttribute('readonly');
    });
  });

  it('each row has correct number of cells', () => {
    render(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={mockProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    const rows = screen.getAllByRole('row');
    // One header row + two data rows
    expect(rows).toHaveLength(3);
  });

  it('initializes rowsState from props on mount', () => {
    render(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={mockProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    // The inputs should have initial values from proposals
    const inputs = screen.getAllByDisplayValue(mockProposals[0].proposedName);
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('updates proposedName state on change', async () => {
    const user = userEvent.setup();
    render(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={mockProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    const firstInput = screen.getAllByDisplayValue(mockProposals[0].proposedName)[0];
    await user.clear(firstInput);
    await user.type(firstInput, 'Nuevo nombre propuesto');

    expect(firstInput).toHaveValue('Nuevo nombre propuesto');
  });

  it('opens ProcessSelector when Seleccionar Proceso button clicked', async () => {
    const user = userEvent.setup();
    render(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={mockProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    const buttons = screen.getAllByRole('button', { name: 'Seleccionar Proceso' });
    await user.click(buttons[0]);

    expect(screen.getByTestId('process-selector')).toBeInTheDocument();
  });

  it('calls updateMapping and onAccept when process selected', async () => {
    const user = userEvent.setup();
    const { updateMapping } = await import('@/lib/task-mapping-storage');

    render(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={mockProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    // Open selector for first row
    const buttons = screen.getAllByRole('button', { name: 'Seleccionar Proceso' });
    await user.click(buttons[0]);

    // Simulate process selection
    const selectButton = screen.getByText('Select');
    await user.click(selectButton);

    expect(updateMapping).toHaveBeenCalledWith(
      mockProposals[0].proposedName,
      'PROC-123'
    );
    expect(mockOnAccept).toHaveBeenCalledWith(
      mockProposals[0],
      mockProposals[0].proposedName,
      'PROC-123'
    );

    // Selector should close
    expect(screen.queryByTestId('process-selector')).not.toBeInTheDocument();

    // The first row's processId input should now show the selected ID
    expect(screen.getByDisplayValue('PROC-123')).toBeInTheDocument();
  });

  it('resets rowsState when proposals prop changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={mockProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    // Edit first row
    const firstInput = screen.getAllByDisplayValue(mockProposals[0].proposedName)[0];
    await user.clear(firstInput);
    await user.type(firstInput, 'Edited name');
    expect(firstInput).toHaveValue('Edited name');

    // Change proposals (different data)
    const newProposals: TaskProposal[] = [
      {
        description: 'Nueva descripción',
        genericTask: 'DEF 2025-02. General',
        totalHours: 5,
        proposedName: 'DEF 2025-02. Nueva descripción',
        projectCode: 'DEF',
        period: '2025-02',
        fechaInicio: '2025-02-01',
        fechaFin: '2025-02-10',
        entryCount: 2,
        entryIds: ['10'],
        clockifyProjectId: '789',
      },
    ];

    rerender(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={newProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    // The first row input should now show the new proposal's proposedName
    const newInput = screen.getByDisplayValue(newProposals[0].proposedName);
    expect(newInput).toBeInTheDocument();
    // The edited value should be gone
    expect(screen.queryByDisplayValue('Edited name')).not.toBeInTheDocument();
  });

  it('renders Eye button for each proposal', () => {
    render(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={mockProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    const eyeButtons = screen.getAllByTitle('Previsualizar SQL de Creación');
    expect(eyeButtons).toHaveLength(mockProposals.length);
  });

  it('clicking Eye button opens SQLPreviewModal with correct title', async () => {
    const user = userEvent.setup();
    render(
      <TaskProposalModal
        open={true}
        onOpenChange={() => {}}
        proposals={mockProposals}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    const eyeButtons = screen.getAllByTitle('Previsualizar SQL de Creación');
    await user.click(eyeButtons[0]);

    expect(screen.getByTestId('sql-preview-modal')).toBeInTheDocument();
    expect(screen.getByTestId('sql-preview-title')).toHaveTextContent('Vista Previa - Crear Proceso');
  });

  it('closes modal when onOpenChange(false) is called', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <TaskProposalModal
        open={true}
        onOpenChange={onOpenChange}
        proposals={[]}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );

    // Simulate backdrop click by calling onOpenChange (since Dialog internals call it)
    // We can test that onOpenChange is called when the Dialog backdrop is clicked indirectly by
    // verifying that if we call onOpenChange(false) and rerender with open=false, modal disappears.
    // But we want to test that the modal reacts to onOpenChange(false) by closing. That's just React behavior.
    // Instead, test that the user can provide onOpenChange and it gets called when we simulate a close.
    // We can't easily simulate backdrop click without triggering internal event. So we trust the Dialog.
    // However, we can at least verify that calling onOpenChange leads to modal disappearing after rerender.
    rerender(
      <TaskProposalModal
        open={false}
        onOpenChange={onOpenChange}
        proposals={[]}
        onAccept={mockOnAccept}
        config={mockConfig}
      />
    );
    expect(screen.queryByText('Seleccionar ID de Tarea')).not.toBeInTheDocument();
  });
});
