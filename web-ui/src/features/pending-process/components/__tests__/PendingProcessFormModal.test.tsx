import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { PendingProcessFormModal } from '../PendingProcessFormModal';
import type { ProcesoPendiente, OfflineProjectSelection } from '@/features/time-tracker/types';
import type { ProjectTreeResponse } from '@/features/projects/types';

Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.scrollIntoView = vi.fn();
HTMLElement.prototype.focus = vi.fn();

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockWizardGet = vi.fn();
const mockGetOfflineProjectSelections = vi.fn();
const mockGetProjectTree = vi.fn();
const mockCreatePendingProcess = vi.fn();
const mockUpdatePendingProcess = vi.fn();

vi.mock('@/features/time-tracker/services/ProcessOfflineService', () => ({
  processOfflineService: {
    getOfflineProjectSelections: (...args: unknown[]) => mockGetOfflineProjectSelections(...args),
    getProjectTree: (...args: unknown[]) => mockGetProjectTree(...args),
    createPendingProcess: (...args: unknown[]) => mockCreatePendingProcess(...args),
    updatePendingProcess: (...args: unknown[]) => mockUpdatePendingProcess(...args),
  },
}));

vi.mock('@/config/stores', () => ({
  wizardConfig: { get: () => mockWizardGet() },
  dbConfig: { get: () => null },
  scheduleConfig: {
    get: () => ({
      defaultHours: { mon: 8.25, tue: 8.25, wed: 8.25, thu: 8.25, fri: 7, sat: 0, sun: 0 },
      exceptions: [],
    }),
  },
}));

// ── Test data ────────────────────────────────────────────────────────────────

const SELECTION: OfflineProjectSelection = {
  codCli: 'CLI001',
  proyecto: 'PROY01',
  nomProy: 'Proyecto Alpha',
  nomCliente: 'Acme Corp',
  status: 'sincronizado',
  markedAt: 1000,
};

const TREE: ProjectTreeResponse = {
  cliente: { codCli: 1, cliente: 'CLI001', nomCliente: 'Acme Corp' },
  proyecto: { codCli: 1, proyecto: 1, nomProy: 'Proyecto Alpha', cerrado: false, cmmi: false, esCM: false, esPET: false },
  disciplinas: [
    {
      idDisciplina: 10,
      nombre: 'Diseño',
      sinDisciplina: false,
      orden: 1,
      fases: [
        { fase: 20, nombre: 'Fase 1', cerrado: false, orden: 1, procesos: [] },
      ],
    },
  ],
};

function setupDefaultMocks() {
  mockWizardGet.mockReturnValue({ usuario: 'MG01' });
  mockGetOfflineProjectSelections.mockResolvedValue([SELECTION]);
  mockGetProjectTree.mockResolvedValue(TREE);
  mockCreatePendingProcess.mockResolvedValue({
    id: -1,
    nombre: 'Nuevo Proceso',
    proyectoId: 'CLI001',
    proyectoNombre: 'Proyecto Alpha',
    clienteId: 'CLI001',
    clienteNombre: 'Acme Corp',
    faseId: 20,
    faseNombre: 'Fase 1',
    minutos: 60,
    createdAt: 1000,
    updatedAt: 1000,
  } satisfies ProcesoPendiente);
  mockUpdatePendingProcess.mockImplementation((_usured: string, id: number, patch: Partial<ProcesoPendiente>) =>
    Promise.resolve({
      id,
      nombre: 'Renombrado',
      proyectoId: 'CLI001',
      proyectoNombre: 'Proyecto Alpha',
      clienteId: 'CLI001',
      clienteNombre: 'Acme Corp',
      faseId: 20,
      faseNombre: 'Fase 1',
      minutos: 120,
      createdAt: 1000,
      updatedAt: 1000,
      ...patch,
    } satisfies ProcesoPendiente)
  );
}

function selectOption(trigger: HTMLElement, optionText: RegExp | string) {
  fireEvent.click(trigger);
  const option = screen.getByText(optionText);
  fireEvent.click(option);
}

async function waitForForm() {
  return waitFor(() => {
    expect(screen.getByPlaceholderText('Nombre del proceso')).toBeInTheDocument();
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PendingProcessFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('does not fetch offline selections when closed', () => {
    render(
      <PendingProcessFormModal
        open={false}
        onOpenChange={vi.fn()}
      />
    );

    expect(mockGetOfflineProjectSelections).not.toHaveBeenCalled();
  });

  it('shows a hint when no offline projects are marked', async () => {
    mockGetOfflineProjectSelections.mockResolvedValue([]);

    render(
      <PendingProcessFormModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(await screen.findByText(/Marca primero proyectos como disponibles offline en Proyectos/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /proyecto/i })).not.toBeInTheDocument();
  });

  it('creates a pending process with the form data and calls onSaved', async () => {
    const onSaved = vi.fn();

    render(
      <PendingProcessFormModal
        open={true}
        onOpenChange={vi.fn()}
        onSaved={onSaved}
      />
    );

    await waitForForm();
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /proyecto/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Nombre del proceso'), { target: { value: 'Nuevo Proceso' } });
    selectOption(screen.getByRole('combobox', { name: /proyecto/i }), /Proyecto Alpha/i);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /fase/i })).toBeEnabled();
    });
    selectOption(screen.getByRole('combobox', { name: /fase/i }), 'Diseño / Fase 1');

    fireEvent.change(screen.getByPlaceholderText('Minutos estimados'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(mockCreatePendingProcess).toHaveBeenCalledTimes(1);
    });

    expect(mockCreatePendingProcess).toHaveBeenCalledWith('MG01', {
      nombre: 'Nuevo Proceso',
      proyectoId: 'CLI001',
      proyectoNombre: 'Proyecto Alpha',
      clienteId: 'CLI001',
      clienteNombre: 'Acme Corp',
      faseId: 20,
      faseNombre: 'Fase 1',
      minutos: 60,
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('loads fases from the project tree with combined labels', async () => {
    render(
      <PendingProcessFormModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitForForm();
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /proyecto/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('combobox', { name: /proyecto/i }));
    fireEvent.click(await screen.findByText(/Proyecto Alpha/i));

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /fase/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('combobox', { name: /fase/i }));

    expect(screen.getByText('Diseño / Fase 1')).toBeInTheDocument();
    expect(mockGetProjectTree).toHaveBeenCalledWith('MG01', 'CLI001', 'PROY01');
  });

  it('prefills fields from initialData and updates the pending process', async () => {
    const onSaved = vi.fn();
    const existing: ProcesoPendiente = {
      id: -3,
      nombre: 'Pendiente Existente',
      proyectoId: 'CLI001',
      proyectoNombre: 'Proyecto Alpha',
      clienteId: 'CLI001',
      clienteNombre: 'Acme Corp',
      faseId: 20,
      faseNombre: 'Fase 1',
      minutos: 120,
      fechaInicio: '2026-06-01',
      createdAt: 1000,
      updatedAt: 1000,
    };

    render(
      <PendingProcessFormModal
        open={true}
        onOpenChange={vi.fn()}
        initialData={existing}
        onSaved={onSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Pendiente Existente')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Nombre del proceso'), { target: { value: 'Renombrado' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(mockUpdatePendingProcess).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdatePendingProcess).toHaveBeenCalledWith('MG01', -3, expect.objectContaining({ nombre: 'Renombrado' }));
    expect(mockCreatePendingProcess).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
