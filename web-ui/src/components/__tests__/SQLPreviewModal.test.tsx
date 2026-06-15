import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLPreviewModal } from '../SQLPreviewModal';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useProjectTree } from '@/features/projects/hooks/use-project-tree';
import { apiClient } from '@/lib/api/client';
import { dbConfig } from '@/config/stores';

// Mock hooks used by SinFasesSelector
vi.mock('@/features/projects/hooks/use-projects', () => ({
    useProjects: vi.fn(),
}));

vi.mock('@/features/projects/hooks/use-project-tree', () => ({
    useProjectTree: vi.fn(),
}));

// Mock apiClient
vi.mock('@/lib/api/client', () => ({
    apiClient: {
        post: vi.fn(),
    },
}));

// Mock dbConfig
vi.mock('@/config/stores', () => ({
    dbConfig: {
        get: vi.fn(),
    },
}));

// Helper to format date as used in component
const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

describe('SQLPreviewModal', () => {
    const defaultConfig = { usuario: 'MG01', fase: '100' };
    const mockOnOpenChange = vi.fn();
    const mockOnExecute = vi.fn();

    const mockDbConfig = {
        server: 'localhost\\SQLEXPRESS',
        database: 'TiemposDB',
        username: 'sa',
        password: 'password123',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Default mocks for SinFasesSelector hooks — loading state prevents
        // SinFasesSelector from rendering inputs that would conflict with existing tests.
        vi.mocked(useProjects).mockReturnValue({
            data: [],
            isLoading: true,
            isError: false,
        } as any);
        vi.mocked(useProjectTree).mockReturnValue({
            isLoading: false,
        } as any);
        // Default dbConfig mock
        vi.mocked(dbConfig.get).mockReturnValue(mockDbConfig);
        // Default API mock — returns the SQL that would be generated
        vi.mocked(apiClient.post).mockResolvedValue({
            success: true,
            data: {
                sql: "SET LANGUAGE Spanish;\nSET DATEFORMAT dmy;\n\nEXEC spNETTiempos_Procesos_Mantenimiento @pNombre='Task', @pFechaInicio='20260601', @pFechaFin='20260608', @pFechaEstimacion='20260601', @pMinutos=120, @pUsuario='MG01', @pFase=100;",
            },
        });
    });

    const renderModal = (props: Partial<React.ComponentProps<typeof SQLPreviewModal>> = {}) => {
        const defaultProps = {
            open: true,
            onOpenChange: mockOnOpenChange,
            config: defaultConfig,
            // Default to empty array so tests without explicit fases preserve text-input behavior
            fases: [] as Array<{ id: string; label: string }>,
            ...props,
        };
        return render(<SQLPreviewModal {...defaultProps} />);
    };

    describe('Phase Required Indicator', () => {
        it('shows required indicator on phase label', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
            });

            // The phase label should have an asterisk indicating it's required
            const asteriskEl = screen.getByText('*');
            expect(asteriskEl).toBeInTheDocument();
        });
    });

    describe('Phase Error Styling', () => {
        it('shows aria-invalid on phase input when phase is empty', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                config: { usuario: 'MG01', fase: '' },
            });

            const phaseInput = screen.getByPlaceholderText('Código de fase');
            expect(phaseInput.getAttribute('aria-invalid')).toBe('true');
        });

        it('does not show aria-invalid on phase input when phase is filled', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                config: { usuario: 'MG01', fase: '100' },
            });

            const phaseInput = screen.getByPlaceholderText('Código de fase');
            expect(phaseInput.getAttribute('aria-invalid')).toBe('false');
        });
    });

    describe('Layout Structure', () => {
        it('renders 4 form rows: Proyecto+Fase, Nombre, Fechas, Horas', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
            });

            expect(screen.getByTestId('row-proyecto-fase')).toBeInTheDocument();
            expect(screen.getByTestId('row-nombre')).toBeInTheDocument();
            expect(screen.getByTestId('row-fechas')).toBeInTheDocument();
            expect(screen.getByTestId('row-horas')).toBeInTheDocument();
        });
    });

    describe('Proyecto Field', () => {
        it('shows proyecto input with config.usuario value', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                config: { usuario: 'PROJ01', fase: '100' },
            });

            const proyectoInput = screen.getByPlaceholderText('Código de proyecto') as HTMLInputElement;
            expect(proyectoInput).toBeDefined();
            expect(proyectoInput.value).toBe('PROJ01');
        });
    });

    describe('Phase Input Modes', () => {
        it('renders text input when fases is an empty array', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
            });

            // Should have an input with placeholder for fase
            const phaseInput = screen.getByPlaceholderText('Código de fase') as HTMLInputElement;
            expect(phaseInput).toBeDefined();
            expect(phaseInput.value).toBe('100'); // from config.fase
        });

        it('renders dropdown for phase when fases prop is provided', () => {
            const fases = [
                { id: '100', label: 'Fase 100' },
                { id: '200', label: 'Fase 200' },
            ];
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                fases,
            });

            // Should show combobox trigger with placeholder text
            const combobox = screen.getByRole('combobox');
            expect(combobox).toBeInTheDocument();

            // Open the dropdown to see options
            fireEvent.click(combobox);

            // Options should be present in the portal
            // Using getAllByText because multiple elements may exist (portal and hidden)
            expect(screen.getAllByText('Fase 100').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Fase 200').length).toBeGreaterThan(0);
        });

        it('dropdown selects a phase and updates editedTask', () => {
            const fases = [
                { id: '100', label: 'Fase 100' },
                { id: '200', label: 'Fase 200' },
            ];
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                fases,
                config: defaultConfig,
            });

            // Open dropdown
            const combobox = screen.getByRole('combobox');
            fireEvent.click(combobox);

            // Select '200'
            fireEvent.click(screen.getByText('Fase 200'));

            // The combobox now should display the selected label 'Fase 200'
            expect(combobox.textContent).toContain('Fase 200');
        });
    });

    describe('taskData Handling', () => {
        it('initializes with taskData values when provided', () => {
            const taskData = {
                name: 'My Task',
                fechaInicio: '15/06/2026',
                fechaFin: '22/06/2026',
                totalMinutes: 240,
            };
            renderModal({ taskData });

            // Check date inputs
            const dateInputs = screen.getAllByPlaceholderText('DD/MM/AAAA') as HTMLInputElement[];
            expect(dateInputs[0].value).toBe('15/06/2026');
            expect(dateInputs[1].value).toBe('22/06/2026');

            // Hours: 240/60 = 4
            const hoursInput = document.querySelector('input[type="number"][step="0.25"]') as HTMLInputElement;
            expect(hoursInput.value).toBe('4');
        });

        it('initializes with default values when taskData is null', () => {
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            const expectedStart = formatDate(today);
            const expectedEnd = formatDate(nextWeek);

            renderModal({ taskData: null });

            const dateInputs = screen.getAllByPlaceholderText('DD/MM/AAAA') as HTMLInputElement[];
            expect(dateInputs[0].value).toBe(expectedStart);
            expect(dateInputs[1].value).toBe(expectedEnd);

            // Hours should be 0
            const hoursInput = document.querySelector('input[type="number"][step="0.25"]') as HTMLInputElement;
            expect(hoursInput.value).toBe('0');
        });

        it('uses config.usuario and config.fase when initializing', () => {
            renderModal({
                taskData: null,
                config: { usuario: 'USER01', fase: '200' },
            });

            // Proyecto input should show the usuario code
            const proyectoInput = screen.getByPlaceholderText('Código de proyecto') as HTMLInputElement;
            expect(proyectoInput.value).toBe('USER01');

            // Phase input should show '200'
            const phaseInput = screen.getByPlaceholderText('Código de fase') as HTMLInputElement;
            expect(phaseInput.value).toBe('200');
        });
    });

    describe('SQL Preview (backend-fetched)', () => {
        it('fetches and displays SQL preview from backend', async () => {
            renderModal({
                taskData: {
                    name: 'Test Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
            });

            await waitFor(() => {
                const sqlBlock = screen.getByTestId('sql-preview');
                expect(sqlBlock.textContent).toContain('spNETTiempos_Procesos_Mantenimiento');
            });

            expect(apiClient.post).toHaveBeenCalledWith('/preview-process-sql', expect.objectContaining({
                dto: expect.objectContaining({
                    nombre: 'Test Task',
                    fase: '100',
                }),
            }));
        });

        it('updates preview when phase changes', async () => {
            vi.mocked(apiClient.post).mockResolvedValueOnce({
                success: true,
                data: { sql: "EXEC spNETTiempos_Procesos_Mantenimiento @pFase=100;" },
            });

            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
            });

            // Wait for initial fetch
            await waitFor(() => {
                expect(apiClient.post).toHaveBeenCalled();
            });

            // Mock updated response for phase change
            vi.mocked(apiClient.post).mockResolvedValueOnce({
                success: true,
                data: { sql: "EXEC spNETTiempos_Procesos_Mantenimiento @pFase=999;" },
            });

            const phaseInput = screen.getByPlaceholderText('Código de fase');
            fireEvent.change(phaseInput, { target: { value: '999' } });

            await waitFor(() => {
                expect(apiClient.post).toHaveBeenCalledTimes(2);
            });
        });

        it('shows loading state while fetching preview', async () => {
            // Never resolve the API call
            vi.mocked(apiClient.post).mockReturnValue(new Promise(() => {}));

            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
            });

            expect(screen.getByTestId('sql-preview').textContent).toContain('Cargando vista previa');
        });
    });

    describe('Validation', () => {
        it('disables execute button when phase is empty', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                config: { usuario: 'MG01', fase: '' },
                onExecute: mockOnExecute,
            });

            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton).toBeDisabled();
        });

        it('disables execute button when phase is whitespace-only', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                config: { usuario: 'MG01', fase: '   ' },
                onExecute: mockOnExecute,
            });

            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton).toBeDisabled();
        });

        it('disables execute button when dates are invalid', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: 'invalid',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                onExecute: mockOnExecute,
            });

            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton).toBeDisabled();
        });

        it('enables execute button when all fields are valid', () => {
            const taskData = {
                name: 'Task',
                fechaInicio: '01/06/2026',
                fechaFin: '08/06/2026',
                totalMinutes: 120,
            };
            renderModal({ taskData, onExecute: mockOnExecute });

            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton).toBeEnabled();
        });
    });

    describe('Execute sends DTO', () => {
        it('calls onExecute with CreateProcessDTO when execute button is clicked', async () => {
            renderModal({
                taskData: {
                    name: 'My Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                config: { usuario: 'MG01', fase: '100' },
                onExecute: mockOnExecute,
            });

            // Wait for preview to load
            await waitFor(() => {
                expect(apiClient.post).toHaveBeenCalled();
            });

            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            fireEvent.click(executeButton);

            expect(mockOnExecute).toHaveBeenCalledWith({
                nombre: 'My Task',
                fechaInicio: '01/06/2026',
                fechaFin: '08/06/2026',
                fechaEstimacion: expect.any(String),
                minutos: 120,
                usuario: 'MG01',
                fase: '100',
            });
        });
    });

    describe('Validation: SinFases mode', () => {
        it('disables execute button when no project or phase selected in SinFases mode', () => {
            vi.mocked(useProjects).mockReturnValue({
                data: [
                    {
                        CodCli: '1',
                        NomCliente: 'Client A',
                        NomProy: 'Project A',
                        Proyecto: 'PA',
                    },
                ],
                isLoading: false,
                isError: false,
            } as any);
            vi.mocked(useProjectTree).mockReturnValue({
                isLoading: false,
                data: {
                    data: {
                        cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client 1' },
                        proyecto: { codCli: 1, proyecto: 1, nomProy: 'P1', cerrado: false, cmmi: false, esCM: false, esPET: false },
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
                    },
                },
            } as any);

            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                fases: undefined as any,
                onExecute: mockOnExecute,
            });

            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton).toBeDisabled();
        });

        it('enables execute button after selecting project and phase in SinFases mode', async () => {
            vi.mocked(useProjects).mockReturnValue({
                data: [
                    {
                        CodCli: '1',
                        NomCliente: 'Client A',
                        NomProy: 'Project A',
                        Proyecto: 'PA',
                    },
                ],
                isLoading: false,
                isError: false,
            } as any);
            vi.mocked(useProjectTree).mockReturnValue({
                isLoading: false,
                data: {
                    data: {
                        cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client 1' },
                        proyecto: { codCli: 1, proyecto: 1, nomProy: 'P1', cerrado: false, cmmi: false, esCM: false, esPET: false },
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
                    },
                },
            } as any);

            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                fases: undefined as any,
                onExecute: mockOnExecute,
            });

            // Open project dropdown and select project
            const projectCombobox = screen.getByRole('combobox');
            fireEvent.click(projectCombobox);
            fireEvent.click(screen.getByText('Client A / Project A (PA)'));

            // Phase dropdown should appear — open and select a phase
            const phaseCombobox = screen.getAllByRole('combobox')[1];
            fireEvent.click(phaseCombobox);
            fireEvent.click(screen.getByText('Diseño / Fase 1'));

            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton).toBeEnabled();
        });
    });

    describe('Validation: WithFases+Select mode', () => {
        it('disables execute button when no fase is selected in Select mode', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                fases: [{ id: '100', label: 'Fase 100' }],
                config: { usuario: 'MG01', fase: '' },
                onExecute: mockOnExecute,
            });

            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton).toBeDisabled();
        });

        it('enables execute button after selecting a fase from dropdown in Select mode', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                fases: [{ id: '100', label: 'Fase 100' }],
                config: { usuario: 'MG01', fase: '' },
                onExecute: mockOnExecute,
            });

            // Open dropdown and select a fase
            const combobox = screen.getByRole('combobox');
            fireEvent.click(combobox);
            fireEvent.click(screen.getByText('Fase 100'));

            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton).toBeEnabled();
        });
    });

    describe('Integration with Step2Tasks', () => {
        it('renders text input mode when fases is an empty array (as used by Step2Tasks)', () => {
            // This is a smoke test that the modal renders without fases and with taskData as used by Step2Tasks
            const taskData = {
                name: 'Some Task',
                fechaInicio: '01/06/2026',
                fechaFin: '08/06/2026',
                totalMinutes: 90,
            };
            renderModal({
                taskData,
                config: { usuario: 'MG01', fase: '123' },
                onExecute: vi.fn(),
                isExecuting: false,
            });

            // Should show text input for phase
            const phaseInput = screen.getByPlaceholderText('Código de fase') as HTMLInputElement;
            expect(phaseInput).toBeDefined();
            // Phase should be '123'
            expect(phaseInput.value).toBe('123');
            // Execute button should be visible and enabled
            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton).toBeInTheDocument();
            expect(executeButton).toBeEnabled();
        });
    });

    describe('Project Info Display (selectedProject prop)', () => {
  const mockProject = {
    CodCli: 'CLI1',
    Cliente: 'Cliente 1',
    NomCliente: 'Client One',
    NomProy: 'Project Alpha',
    Proyecto: 'PA',
    Abierto: true,
    IdDpto: 'DPT1',
    NomDpto: 'Dept 1',
    IdAplicacion: 'APP1',
    UsuredRespRev: 'USER1',
  };

  it('shows read-only project info div when selectedProject and fases are provided', () => {
    renderModal({
      taskData: {
        name: 'Task',
        fechaInicio: '01/06/2026',
        fechaFin: '08/06/2026',
        totalMinutes: 120,
      },
      fases: [{ id: '100', label: 'Fase 100' }],
      selectedProject: mockProject,
    });

    // Should show project info as formatted text: NomCliente / NomProy (Proyecto)
    expect(screen.getByText('Client One / Project Alpha (PA)')).toBeDefined();
    // Should NOT show editable input for proyecto
    expect(screen.queryByPlaceholderText('Código de proyecto')).toBeNull();
  });

  it('still shows editable input when fases are provided but selectedProject is undefined', () => {
    renderModal({
      taskData: {
        name: 'Task',
        fechaInicio: '01/06/2026',
        fechaFin: '08/06/2026',
        totalMinutes: 120,
      },
      fases: [{ id: '100', label: 'Fase 100' }],
      // selectedProject is intentionally not provided
    });

    // Should show editable input
    const proyectoInput = screen.getByPlaceholderText('Código de proyecto') as HTMLInputElement;
    expect(proyectoInput).toBeDefined();
    // Should NOT show read-only div
    expect(screen.queryByText(/Client One \/ Project Alpha \(PA\)/)).toBeNull();
  });

  it('still shows editable input when selectedProject is null and fases are provided', () => {
    renderModal({
      taskData: {
        name: 'Task',
        fechaInicio: '01/06/2026',
        fechaFin: '08/06/2026',
        totalMinutes: 120,
      },
      fases: [{ id: '100', label: 'Fase 100' }],
      selectedProject: null,
    });

    const proyectoInput = screen.getByPlaceholderText('Código de proyecto') as HTMLInputElement;
    expect(proyectoInput).toBeDefined();
  });
});

describe('SinFasesSelector Integration', () => {
        it('renders SinFasesSelector when fases prop is not provided)', () => {
            // Mock hooks to return loading state so SinFasesSelector renders cleanly
            vi.mocked(useProjects).mockReturnValue({
                data: [],
                isLoading: false,
                isError: false,
            } as any);

            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                // Override default fases:[] by passing undefined
                fases: undefined as any,
            });

            // SinFasesSelector should appear instead of the traditional row
            expect(screen.getByTestId('sin-fases-selector')).toBeInTheDocument();
            // The traditional proyecto input should NOT be present
            expect(screen.queryByPlaceholderText('Código de proyecto')).toBeNull();
        });

        it('SinFasesSelector shows loading state when projects are loading (no fases)', () => {
            vi.mocked(useProjects).mockReturnValue({
                data: [],
                isLoading: true,
                isError: false,
            } as any);

            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                fases: undefined as any,
            });

            expect(screen.getByTestId('sin-fases-selector')).toBeInTheDocument();
            expect(screen.getByText('Cargando proyectos...')).toBeInTheDocument();
        });
    });
});
