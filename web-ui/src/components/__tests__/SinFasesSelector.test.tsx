import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SinFasesSelector } from '../SinFasesSelector';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useProjectTree } from '@/features/projects/hooks/use-project-tree';

// Mock hooks at module level (same pattern as ProcessSelector)
vi.mock('@/features/projects/hooks/use-projects', () => ({
  useProjects: vi.fn(),
}));

vi.mock('@/features/projects/hooks/use-project-tree', () => ({
  useProjectTree: vi.fn(),
}));

describe('SinFasesSelector', () => {
  const defaultConfig = { usuario: 'MG01', fase: '100' };
  const mockOnTaskChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Phase 1: Foundation ──────────────────────────────────────

  describe('Loading state', () => {
    it('shows loading spinner while projects are loading', () => {
      vi.mocked(useProjects).mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
      } as any);
      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
      } as any);

      render(
        <SinFasesSelector
          config={defaultConfig}
          onTaskChange={mockOnTaskChange}
        />
      );

      expect(screen.getByTestId('projects-loading')).toBeTruthy();
      expect(screen.getByText('Cargando proyectos...')).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('shows error alert when projects fail to load', () => {
      vi.mocked(useProjects).mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
      } as any);
      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
      } as any);

      render(
        <SinFasesSelector
          config={defaultConfig}
          onTaskChange={mockOnTaskChange}
        />
      );

      expect(screen.getByTestId('projects-error')).toBeTruthy();
      expect(
        screen.getByText('Error al cargar proyectos')
      ).toBeTruthy();
    });
  });

  describe('Empty projects', () => {
    it('shows empty message when no projects are available', () => {
      vi.mocked(useProjects).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as any);
      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
      } as any);

      render(
        <SinFasesSelector
          config={defaultConfig}
          onTaskChange={mockOnTaskChange}
        />
      );

      expect(screen.getByTestId('projects-empty')).toBeTruthy();
      expect(
        screen.getByText('No hay proyectos disponibles')
      ).toBeTruthy();
    });
  });

  // ── Phase 2: Core — Phase selection flow ─────────────────────

  describe('Project selection', () => {
    it('renders project dropdown with options when projects loaded', () => {
      const mockProjects = [
        {
          CodCli: '1',
          NomCliente: 'Client A',
          NomProy: 'Project A',
          Proyecto: 'PA',
        },
        {
          CodCli: '2',
          NomCliente: 'Client B',
          NomProy: 'Project B',
          Proyecto: 'PB',
        },
      ];

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);
      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
      } as any);

      render(
        <SinFasesSelector
          config={defaultConfig}
          onTaskChange={mockOnTaskChange}
        />
      );

      // Should show trigger with placeholder
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeTruthy();
      fireEvent.click(combobox);

      // Options should be present
      expect(screen.getByText('Client A / Project A (PA)')).toBeTruthy();
      expect(screen.getByText('Client B / Project B (PB)')).toBeTruthy();
    });

    it('calls onTaskChange with project code when project selected', () => {
      const mockProjects = [
        {
          CodCli: '1',
          NomCliente: 'Client A',
          NomProy: 'Project A',
          Proyecto: 'PA',
        },
      ];

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);
      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
      } as any);

      render(
        <SinFasesSelector
          config={defaultConfig}
          onTaskChange={mockOnTaskChange}
        />
      );

      // Open dropdown and select project
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      fireEvent.click(screen.getByText('Client A / Project A (PA)'));

      expect(mockOnTaskChange).toHaveBeenCalledWith({
        usuario: 'PA',
        fase: '',
      });
    });
  });

  describe('Phase loading', () => {
    it('shows phase loading spinner when project selected and tree loading', () => {
      const mockProjects = [
        {
          CodCli: '1',
          NomCliente: 'Client A',
          NomProy: 'Project A',
          Proyecto: 'PA',
        },
      ];

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);
      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: true,
        data: undefined,
      } as any);

      render(
        <SinFasesSelector
          config={defaultConfig}
          onTaskChange={mockOnTaskChange}
        />
      );

      // Select a project to trigger phase area
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      fireEvent.click(screen.getByText('Client A / Project A (PA)'));

      // Phase loading spinner should appear
      expect(screen.getByTestId('phases-loading')).toBeTruthy();
      expect(screen.getByText('Cargando fases...')).toBeTruthy();
    });
  });

  describe('Phase error', () => {
    it('shows error alert when project tree fails to load', () => {
      const mockProjects = [
        {
          CodCli: '1',
          NomCliente: 'Client A',
          NomProy: 'Project A',
          Proyecto: 'PA',
        },
      ];

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);
      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
      } as any);

      render(
        <SinFasesSelector
          config={defaultConfig}
          onTaskChange={mockOnTaskChange}
        />
      );

      // Select project
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      fireEvent.click(screen.getByText('Client A / Project A (PA)'));

      expect(screen.getByTestId('phases-error')).toBeTruthy();
      expect(screen.getByText('Error al cargar fases')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  describe('Phase extraction', () => {
    it('renders phase dropdown with deduplicated phases from tree', () => {
      const mockProjects = [
        {
          CodCli: '1',
          NomCliente: 'Client A',
          NomProy: 'Project A',
          Proyecto: 'PA',
        },
      ];

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      const mockTree = {
        cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client 1' },
        proyecto: {
          codCli: 1,
          proyecto: 1,
          nomProy: 'P1',
          cerrado: false,
          cmmi: false,
          esCM: false,
          esPET: false,
        },
        disciplinas: [
          {
            idDisciplina: 10,
            nombre: 'Diseño',
            sinDisciplina: false,
            orden: 1,
            fases: [
              {
                fase: 20,
                nombre: 'Fase 1',
                cerrado: false,
                orden: 1,
                procesos: [],
              },
              {
                fase: 21,
                nombre: 'Fase 2',
                cerrado: false,
                orden: 2,
                procesos: [],
              },
            ],
          },
          {
            idDisciplina: 11,
            nombre: 'Desarrollo',
            sinDisciplina: false,
            orden: 2,
            fases: [
              // Same fase ID 20 appears again (should be deduplicated)
              {
                fase: 20,
                nombre: 'Fase 1',
                cerrado: false,
                orden: 1,
                procesos: [],
              },
              {
                fase: 22,
                nombre: 'Fase 3',
                cerrado: false,
                orden: 2,
                procesos: [],
              },
            ],
          },
        ],
      };

      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
        data: { data: mockTree },
      } as any);

      render(
        <SinFasesSelector
          config={defaultConfig}
          onTaskChange={mockOnTaskChange}
        />
      );

      // Select project to load phases
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      fireEvent.click(screen.getByText('Client A / Project A (PA)'));

      // Phase dropdown should now appear with options
      const phaseCombobox = screen.getAllByRole('combobox')[1];
      expect(phaseCombobox).toBeTruthy();
      fireEvent.click(phaseCombobox);

      // Should have 3 unique phases (deduplicated from 4)
      expect(screen.getByText('Diseño / Fase 1')).toBeTruthy();
      expect(screen.getByText('Diseño / Fase 2')).toBeTruthy();
      expect(screen.getByText('Desarrollo / Fase 3')).toBeTruthy();
    });
  });

  describe('Empty phases', () => {
    it('shows info message when project has no phases', () => {
      const mockProjects = [
        {
          CodCli: '1',
          NomCliente: 'Client A',
          NomProy: 'Project A',
          Proyecto: 'PA',
        },
      ];

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
        data: {
          data: {
            cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client 1' },
            proyecto: {
              codCli: 1,
              proyecto: 1,
              nomProy: 'P1',
              cerrado: false,
              cmmi: false,
              esCM: false,
              esPET: false,
            },
            disciplinas: [],
          },
        },
      } as any);

      render(
        <SinFasesSelector
          config={defaultConfig}
          onTaskChange={mockOnTaskChange}
        />
      );

      // Select project
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      fireEvent.click(screen.getByText('Client A / Project A (PA)'));

      expect(screen.getByTestId('phases-empty')).toBeTruthy();
      expect(
        screen.getByText('Este proyecto no tiene fases')
      ).toBeTruthy();
    });
  });

  describe('Phase selection', () => {
    it('calls onTaskChange with fase ID when phase selected', () => {
      const mockProjects = [
        {
          CodCli: '1',
          NomCliente: 'Client A',
          NomProy: 'Project A',
          Proyecto: 'PA',
        },
      ];

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      const mockTree = {
        cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client 1' },
        proyecto: {
          codCli: 1,
          proyecto: 1,
          nomProy: 'P1',
          cerrado: false,
          cmmi: false,
          esCM: false,
          esPET: false,
        },
        disciplinas: [
          {
            idDisciplina: 10,
            nombre: 'Diseño',
            sinDisciplina: false,
            orden: 1,
            fases: [
              {
                fase: 20,
                nombre: 'Fase 1',
                cerrado: false,
                orden: 1,
                procesos: [],
              },
            ],
          },
        ],
      };

      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
        data: { data: mockTree },
      } as any);

      render(
        <SinFasesSelector
          config={defaultConfig}
          onTaskChange={mockOnTaskChange}
        />
      );

      // Select project
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      fireEvent.click(screen.getByText('Client A / Project A (PA)'));

      // First call was for project selection
      expect(mockOnTaskChange).toHaveBeenCalledWith({
        usuario: 'PA',
        fase: '',
      });

      // Select phase
      const phaseCombobox = screen.getAllByRole('combobox')[1];
      fireEvent.click(phaseCombobox);
      fireEvent.click(screen.getByText('Diseño / Fase 1'));

      // Should call onTaskChange with fase ID
      expect(mockOnTaskChange).toHaveBeenCalledWith({ fase: '20' });
    });
  });

  // ── Disabled state ─────────────────────────────────────────

  describe('Disabled state', () => {
    it('disables project select when disabled prop is true', () => {
      const mockProjects = [
        {
          CodCli: '1',
          NomCliente: 'Client A',
          NomProy: 'Project A',
          Proyecto: 'PA',
        },
      ];

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);
      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
      } as any);

      render(
        <SinFasesSelector
          config={defaultConfig}
          onTaskChange={mockOnTaskChange}
          disabled={true}
        />
      );

      // The Select component should render a trigger with role="combobox"
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeTruthy();
      // Radix UI Select sets data-disabled when disabled prop is true
      expect(combobox.getAttribute('data-disabled')).toBe('');
    });
  });
});
