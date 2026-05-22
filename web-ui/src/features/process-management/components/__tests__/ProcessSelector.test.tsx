import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ProcessSelector } from '../ProcessSelector';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useProjectTree } from '@/features/projects/hooks/use-project-tree';

// Mock hooks
vi.mock('@/features/projects/hooks/use-projects', () => ({
  useProjects: vi.fn(),
}));

vi.mock('@/features/projects/hooks/use-project-tree', () => ({
  useProjectTree: vi.fn(),
}));

describe('ProcessSelector', () => {
  it('should render dialog with title when open', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);
    vi.mocked(useProjectTree).mockReturnValue({ isLoading: false } as any);

    const onSelect = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ProcessSelector
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('Seleccionar ID de Tarea')).toBeDefined();
  });

  it('should display project list when data is loaded', () => {
    const mockProjects = [
      { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project A', Proyecto: 'P1' },
      { CodCli: '2', NomCliente: 'Client B', NomProy: 'Project B', Proyecto: 'P2' },
    ];

    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      isError: false,
    } as any);

    render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

    // Check headers
    expect(screen.getByText('Cliente')).toBeDefined();
    expect(screen.getByText('Proyecto')).toBeDefined();
    expect(screen.getByText('Código')).toBeDefined();

    // Check data
    expect(screen.getByText('Client A')).toBeDefined();
    expect(screen.getByText('Project A')).toBeDefined();
    expect(screen.getByText('P1')).toBeDefined();
    expect(screen.getByText('Client B')).toBeDefined();
    expect(screen.getByText('Project B')).toBeDefined();
    expect(screen.getByText('P2')).toBeDefined();
  });

  it('should switch to processes view when a project is clicked', () => {
    const mockProjects = [
      { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project A', Proyecto: 'P1' },
    ];

    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      isError: false,
    } as any);

    render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

    const row = screen.getByText('Client A').closest('tr');
    if (!row) throw new Error('Row not found');
    
    fireEvent.click(row);

    expect(screen.getByText(/Procesos para: Project A/)).toBeDefined();
    expect(screen.getByText('Volver a proyectos')).toBeDefined();
  });

  it('should call onOpenChange(false) when Escape is pressed at level 1', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    const onOpenChange = vi.fn();
    render(<ProcessSelector open={true} onOpenChange={onOpenChange} onSelect={() => {}} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should go back to projects view when Escape is pressed at level 2', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [{ CodCli: '1', NomCliente: 'C1', NomProy: 'P1', Proyecto: 'K1' }],
      isLoading: false,
      isError: false,
    } as any);

    const onOpenChange = vi.fn();
    render(<ProcessSelector open={true} onOpenChange={onOpenChange} onSelect={() => {}} />);

    // Go to level 2
    fireEvent.click(screen.getByText('C1'));
    expect(screen.getByText(/Procesos para: P1/)).toBeDefined();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    // Should NOT close dialog, but go back to level 1
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText('Cliente')).toBeDefined();
  });

  it('should show loading state when fetching project tree (level 2)', () => {
    const mockProjects = [{ CodCli: '1', NomCliente: 'C1', NomProy: 'P1', Proyecto: 'K1' }];
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
    } as any);

    // Mock level 2 loading
    vi.mocked(useProjectTree).mockReturnValue({
      isLoading: true,
      data: undefined
    } as any);

    render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

    // Click project to trigger Level 2
    fireEvent.click(screen.getByText('C1'));

    expect(screen.getByText('Cargando procesos...')).toBeDefined();
  });

  it('should show error state when project tree fetch fails', () => {
    const mockProjects = [{ CodCli: '1', NomCliente: 'C1', NomProy: 'P1', Proyecto: 'K1' }];
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
    } as any);

    vi.mocked(useProjectTree).mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('Network Error')
    } as any);

    render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

    fireEvent.click(screen.getByText('C1'));

    expect(screen.getByText(/Error al cargar los procesos/)).toBeDefined();
    expect(screen.getByText('Network Error')).toBeDefined();
  });

  it('should display flattened process list from project tree', () => {
    const mockProjects = [{ CodCli: '1', NomCliente: 'C1', NomProy: 'P1', Proyecto: 'K1' }];
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
    } as any);

    const mockTree = {
      cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client 1' },
      proyecto: { codCli: 1, proyecto: 1, nomProy: 'P1', cerrado: false, cmmi: false, esCM: false, esPET: false },
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
              procesos: [
                { proceso: 123, nombre: 'Proceso A' },
                { proceso: 124, nombre: 'Proceso B' }
              ]
            }
          ]
        },
        {
          idDisciplina: 11,
          nombre: 'Desarrollo',
          sinDisciplina: false,
          orden: 2,
          fases: [
            {
              fase: 30,
              nombre: 'Fase 2',
              cerrado: false,
              orden: 1,
              procesos: [
                { proceso: 456, nombre: 'Proceso C' }
              ]
            }
          ]
        }
      ]
    };

    vi.mocked(useProjectTree).mockReturnValue({
      isLoading: false,
      data: mockTree
    } as any);

    render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

    fireEvent.click(screen.getByText('C1'));

    // Check headers
    expect(screen.getByText('ID')).toBeDefined();
    expect(screen.getByText('Proceso')).toBeDefined();
    expect(screen.getByText('Ruta')).toBeDefined();

    // Check flattened data
    expect(screen.getByText('123')).toBeDefined();
    expect(screen.getByText('Proceso A')).toBeDefined();
    expect(screen.getAllByText('Diseño / Fase 1')[0]).toBeDefined();

    expect(screen.getByText('124')).toBeDefined();
    expect(screen.getByText('Proceso B')).toBeDefined();

    expect(screen.getByText('456')).toBeDefined();
    expect(screen.getByText('Proceso C')).toBeDefined();
    expect(screen.getByText('Desarrollo / Fase 2')).toBeDefined();
  });

  it('should show empty state when project tree has no processes', () => {
    const mockProjects = [{ CodCli: '1', NomCliente: 'C1', NomProy: 'P1', Proyecto: 'K1' }];
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
    } as any);

    // Empty tree
    vi.mocked(useProjectTree).mockReturnValue({
      isLoading: false,
      data: { cliente: {}, proyecto: {}, disciplinas: [] }
    } as any);

    render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

    fireEvent.click(screen.getByText('C1'));

    expect(screen.getByText('No se encontraron procesos')).toBeDefined();
  });

  it('should return to level 1 when "Volver a proyectos" is clicked', () => {
    const mockProjects = [{ CodCli: '1', NomCliente: 'C1', NomProy: 'P1', Proyecto: 'K1' }];
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
    } as any);

    vi.mocked(useProjectTree).mockReturnValue({
      isLoading: false,
      data: { cliente: {}, proyecto: {}, disciplinas: [] }
    } as any);

    render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

    // Go to Level 2
    fireEvent.click(screen.getByText('C1'));
    expect(screen.getByText(/Procesos para/)).toBeDefined();

    // Click Volver
    fireEvent.click(screen.getByText('Volver a proyectos'));

    // Check Level 1
    expect(screen.getByText('Cliente')).toBeDefined();
     expect(screen.queryByText(/Procesos para/)).toBeNull();
   });

  describe('Search functionality', () => {
    beforeEach(() => {
      vi.mocked(useProjects).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as any);
      vi.mocked(useProjectTree).mockReturnValue({ isLoading: false } as any);
    });

    it('should render search input in projects view', () => {
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
        { CodCli: '2', NomCliente: 'Client B', NomProy: 'Project Beta', Proyecto: 'PB' },
      ];
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      expect(screen.getByPlaceholderText('Buscar proyectos...')).toBeDefined();
      expect(screen.getByRole('button', { name: /Limpiar búsqueda de proyectos/i })).not.toBeInTheDocument();
    });

    it('should filter projects by name and code (case-insensitive)', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
        { CodCli: '2', NomCliente: 'Client B', NomProy: 'Project Beta', Proyecto: 'PB' },
        { CodCli: '3', NomCliente: 'Client C', NomProy: 'Gamma Project', Proyecto: 'PG' },
      ];
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      const searchInput = screen.getByPlaceholderText('Buscar proyectos...');

      // Search for "alpha" (partial match on NomProy)
      await user.type(searchInput, 'alpha');
      expect(screen.getByText('Project Alpha')).toBeDefined();
      expect(screen.queryByText('Project Beta')).toBeNull();
      expect(screen.queryByText('Gamma Project')).toBeNull();

      // Clear and search by code "pb"
      await user.click(screen.getByRole('button', { name: /Limpiar búsqueda de proyectos/i }));
      await user.type(searchInput, 'pb');
      expect(screen.getByText('Project Beta')).toBeDefined();
      expect(screen.queryByText('Project Alpha')).toBeNull();

      // Case insensitivity: search for "GAMMA"
      await user.click(screen.getByRole('button', { name: /Limpiar búsqueda de proyectos/i }));
      await user.type(searchInput, 'GAMMA');
      expect(screen.getByText('Gamma Project')).toBeDefined();
    });

    it('should show clear button only when search term is non-empty', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
      ];
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      const searchInput = screen.getByPlaceholderText('Buscar proyectos...');
      const clearButton = screen.queryByRole('button', { name: /Limpiar búsqueda de proyectos/i });

      expect(clearButton).not.toBeInTheDocument();

      await user.type(searchInput, 'test');
      expect(screen.getByRole('button', { name: /Limpiar búsqueda de proyectos/i })).toBeInTheDocument();
    });

    it('should clear search and show all projects when clear button is clicked', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
        { CodCli: '2', NomCliente: 'Client B', NomProy: 'Project Beta', Proyecto: 'PB' },
      ];
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      const searchInput = screen.getByPlaceholderText('Buscar proyectos...');
      await user.type(searchInput, 'Alpha');
      expect(screen.queryByText('Project Beta')).toBeNull();

      await user.click(screen.getByRole('button', { name: /Limpiar búsqueda de proyectos/i }));
      expect((searchInput as HTMLInputElement).value).toBe('');
    });

    it('should reset opposite view search term when view changes', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
      ];
      const mockTree = {
        cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client 1' },
        proyecto: { codCli: 1, proyecto: 1, nomProy: 'P1', cerrado: false, cmmi: false, esCM: false, esPET: false },
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
                procesos: [
                  { proceso: 123, nombre: 'Proceso A' }
                ]
              }
            ]
          }
        ]
      };

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
        data: mockTree
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      // In projects view, type in project search
      const projectSearch = screen.getByPlaceholderText('Buscar proyectos...');
      await user.type(projectSearch, 'alpha');
      expect((projectSearch as HTMLInputElement).value).toBe('alpha');

      // Navigate to processes view (by clicking project)
      await user.click(screen.getByText('Client A'));

      // Now processes search should appear and project search term should be reset
      expect(screen.getByPlaceholderText('Buscar procesos...')).toBeDefined();
      // Check project search is empty (but the input is not in the DOM when view is processes)
      // We can't query it directly; instead we can verify that if we go back, it's empty.
      // But we can test that the opposite view's search was cleared by checking after we go back.
      // However, the spec says "clears the search term of the view being left".
      // So when we left projects view, the projectSearchTerm should be cleared.
      // Let's go back to projects view
      await user.click(screen.getByText('Volver a proyectos'));
      // Now project search input should be present and empty (cleared when going to L2)
      expect((screen.getByPlaceholderText('Buscar proyectos...') as HTMLInputElement).value).toBe('');
    });

    it('should still allow row selection with active filter', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
        { CodCli: '2', NomCliente: 'Client B', NomProy: 'Project Beta', Proyecto: 'PB' },
      ];
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      const searchInput = screen.getByPlaceholderText('Buscar proyectos...');
      await user.type(searchInput, 'alpha');

      // Only one row visible - click it
      const row = screen.getByText('Client A').closest('tr');
      if (!row) throw new Error('Row not found');

      await user.click(row!);

      // Should go to L2 (processes view), not call onSelect
      expect(screen.getByText(/Procesos para: Project Alpha/)).toBeDefined();
    });
  });

  describe('Keyboard navigation', () => {
    beforeEach(() => {
      vi.mocked(useProjects).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as any);
      vi.mocked(useProjectTree).mockReturnValue({ isLoading: false } as any);
    });

    it('should highlight first row by default when popup opens (L1)', async () => {
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
        { CodCli: '2', NomCliente: 'Client B', NomProy: 'Project Beta', Proyecto: 'PB' },
      ];
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      // First row should have selected state
      const firstRow = screen.getByText('Client A').closest('tr');
      expect(firstRow?.getAttribute('data-state')).toBe('selected');
    });

    it('should navigate down with ArrowDown in L1', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
        { CodCli: '2', NomCliente: 'Client B', NomProy: 'Project Beta', Proyecto: 'PB' },
      ];
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      // Press ArrowDown
      await user.keyboard('{ArrowDown}');

      // Second row should now be selected
      const secondRow = screen.getByText('Client B').closest('tr');
      expect(secondRow?.getAttribute('data-state')).toBe('selected');
    });

    it('should navigate up with ArrowUp in L1', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
        { CodCli: '2', NomCliente: 'Client B', NomProy: 'Project Beta', Proyecto: 'PB' },
      ];
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      // Press ArrowDown twice to go to second row
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');

      // Now press ArrowUp to go back
      await user.keyboard('{ArrowUp}');

      // First row should be selected again
      const firstRow = screen.getByText('Client A').closest('tr');
      expect(firstRow?.getAttribute('data-state')).toBe('selected');
    });

    it('should select project and go to L2 on Enter in L1', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
      ];
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      const mockTree = {
        cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client 1' },
        proyecto: { codCli: 1, proyecto: 1, nomProy: 'P1', cerrado: false, cmmi: false, esCM: false, esPET: false },
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
                procesos: [
                  { proceso: 123, nombre: 'Proceso A' },
                ]
              }
            ]
          }
        ]
      };

      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
        data: mockTree
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      // Press Enter to select the project
      await user.keyboard('{Enter}');

      // Should switch to processes view
      expect(screen.getByText(/Procesos para: Project Alpha/)).toBeDefined();
    });

    it('should navigate down with ArrowDown in L2', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
      ];
      const mockTree = {
        cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client 1' },
        proyecto: { codCli: 1, proyecto: 1, nomProy: 'P1', cerrado: false, cmmi: false, esCM: false, esPET: false },
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
                procesos: [
                  { proceso: 123, nombre: 'Proceso A' },
                  { proceso: 124, nombre: 'Proceso B' }
                ]
              }
            ]
          }
        ]
      };

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
        data: mockTree
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      // Navigate to L2
      await user.click(screen.getByText('Client A'));
      expect(screen.getByText(/Procesos para/)).toBeDefined();

      // First process should be selected by default
      const firstRow = screen.getByText('123').closest('tr');
      expect(firstRow?.getAttribute('data-state')).toBe('selected');

      // Press ArrowDown
      await user.keyboard('{ArrowDown}');

      // Second process should be selected
      const secondRow = screen.getByText('124').closest('tr');
      expect(secondRow?.getAttribute('data-state')).toBe('selected');
    });

    it('should select process and call onSelect on Enter in L2', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
      ];
      const mockTree = {
        cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client 1' },
        proyecto: { codCli: 1, proyecto: 1, nomProy: 'P1', cerrado: false, cmmi: false, esCM: false, esPET: false },
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
                procesos: [
                  { proceso: 123, nombre: 'Proceso A' },
                  { proceso: 124, nombre: 'Proceso B' }
                ]
              }
            ]
          }
        ]
      };

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
        data: mockTree
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={onSelect} />);

      // Navigate to L2
      await user.click(screen.getByText('Client A'));

      // Navigate to second process and select
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      // Should call onSelect with project code and process name
      expect(onSelect).toHaveBeenCalledWith('PA', 'Proceso B');
    });

    it('should go back to L1 on Escape in L2', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
      ];
      const mockTree = {
        cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client 1' },
        proyecto: { codCli: 1, proyecto: 1, nomProy: 'P1', cerrado: false, cmmi: false, esCM: false, esPET: false },
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
                procesos: [
                  { proceso: 123, nombre: 'Proceso A' },
                ]
              }
            ]
          }
        ]
      };

      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      vi.mocked(useProjectTree).mockReturnValue({
        isLoading: false,
        data: mockTree
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      // Go to L2
      await user.click(screen.getByText('Client A'));
      expect(screen.getByText(/Procesos para/)).toBeDefined();

      // Press Escape
      await user.keyboard('{Escape}');

      // Should go back to L1
      expect(screen.getByText('Cliente')).toBeDefined();
      expect(screen.queryByText(/Procesos para/)).toBeNull();
    });

    it('should close popup on Escape in L1 when no selection', async () => {
      const user = userEvent.setup();
      vi.mocked(useProjects).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as any);

      const onOpenChange = vi.fn();
      render(<ProcessSelector open={true} onOpenChange={onOpenChange} onSelect={() => {}} />);

      await user.keyboard('{Escape}');

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should handle ArrowUp at first row (no change)', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
        { CodCli: '2', NomCliente: 'Client B', NomProy: 'Project Beta', Proyecto: 'PB' },
      ];
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      // First row is already selected, press ArrowUp
      await user.keyboard('{ArrowUp}');

      // First row should still be selected
      const firstRow = screen.getByText('Client A').closest('tr');
      expect(firstRow?.getAttribute('data-state')).toBe('selected');
    });

    it('should navigate with arrow keys filtered by search', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { CodCli: '1', NomCliente: 'Client A', NomProy: 'Project Alpha', Proyecto: 'PA' },
        { CodCli: '2', NomCliente: 'Client B', NomProy: 'Project Beta', Proyecto: 'PB' },
      ];
      vi.mocked(useProjects).mockReturnValue({
        data: mockProjects,
        isLoading: false,
        isError: false,
      } as any);

      render(<ProcessSelector open={true} onOpenChange={() => {}} onSelect={() => {}} />);

      // Filter to show only Client A
      const searchInput = screen.getByPlaceholderText('Buscar proyectos...');
      await user.type(searchInput, 'alpha');

      // Only one row visible, first row is selected
      const firstRow = screen.getByText('Client A').closest('tr');
      expect(firstRow?.getAttribute('data-state')).toBe('selected');

      // ArrowDown when only one row - should stay
      await user.keyboard('{ArrowDown}');
      expect(screen.getByText('Client A')).toBeDefined();
    });
  });
});

export {};
