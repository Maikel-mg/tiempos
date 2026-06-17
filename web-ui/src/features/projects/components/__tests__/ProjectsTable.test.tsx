import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsTable } from '../ProjectsTable';
import { describe, it, expect, vi } from 'vitest';
import type { Project } from '../../types';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ProjectsTable', () => {
  const mockProjects: Project[] = [
    {
      CodCli: '1',
      Cliente: 'Client 1',
      NomCliente: 'Client One',
      NomProy: 'Project One',
      Proyecto: 'P1',
      Abierto: true,
      IdDpto: 'D1',
      NomDpto: 'Department 1',
      IdAplicacion: 'App1',
      UsuredRespRev: 'user1',
    },
    {
      CodCli: '2',
      Cliente: 'Client 2',
      NomCliente: 'Client Two',
      NomProy: 'Project Two',
      Proyecto: 'P2',
      Abierto: false,
      IdDpto: 'D2',
      NomDpto: 'Department 2',
      IdAplicacion: 'App2',
      UsuredRespRev: 'user2',
    },
  ];

  it('should render table headers with correct columns', () => {
    renderWithRouter(<ProjectsTable projects={mockProjects} />);
    
    expect(screen.getByText('Cliente')).toBeDefined();
    expect(screen.getByText('Proyecto')).toBeDefined();
    expect(screen.getByText('Código')).toBeDefined();
    expect(screen.getByText('Departamento')).toBeDefined();
    expect(screen.getByText('Estado')).toBeDefined();
    expect(screen.getByText('Responsable')).toBeDefined();
  });

  it('should render project data in table rows', () => {
    renderWithRouter(<ProjectsTable projects={mockProjects} />);
    
    expect(screen.getByText('Client One')).toBeDefined();
    expect(screen.getByText('Project One')).toBeDefined();
    expect(screen.getByText('P1')).toBeDefined();
    expect(screen.getByText('Department 1')).toBeDefined();
    expect(screen.getByText('user1')).toBeDefined();
  });

  it('should display "Sí" for open projects and "No" for closed projects', () => {
    renderWithRouter(<ProjectsTable projects={mockProjects} />);
    
    // First project is open (Abierto: true)
    expect(screen.getByText('Sí')).toBeDefined();
    // Second project is closed (Abierto: false)
    expect(screen.getByText('No')).toBeDefined();
  });

  it('should render loading state when isLoading is true', () => {
    renderWithRouter(<ProjectsTable projects={[]} isLoading={true} />);
    
    expect(screen.getByText('Cargando proyectos...')).toBeDefined();
  });

  it('should render empty state when there are no projects', () => {
    renderWithRouter(<ProjectsTable projects={[]} isLoading={false} />);
    
    expect(screen.getByText('No se encontraron proyectos')).toBeDefined();
  });

  it('should render empty state with custom message when provided', () => {
    renderWithRouter(<ProjectsTable projects={[]} isLoading={false} emptyMessage="Custom empty message" />);
    
    expect(screen.getByText('Custom empty message')).toBeDefined();
  });

  it('should not render empty state when loading', () => {
    renderWithRouter(<ProjectsTable projects={[]} isLoading={true} />);
    
    expect(screen.queryByText('No se encontraron proyectos')).toBeNull();
  });

  it('should render error state with retry button when error is provided', () => {
    const mockError = new Error('Failed to fetch projects');
    const mockRetry = vi.fn();
    renderWithRouter(<ProjectsTable projects={[]} isLoading={false} error={mockError} onRetry={mockRetry} />);
    
    // Check that error message is displayed
    expect(screen.getByText(/Failed to fetch projects/i)).toBeDefined();
    // Check that retry button exists (Spanish "Reintentar")
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeDefined();
  });

  it('should call onRetry when retry button is clicked', () => {
    const mockError = new Error('Network error');
    const mockRetry = vi.fn();
    renderWithRouter(<ProjectsTable projects={[]} isLoading={false} error={mockError} onRetry={mockRetry} />);
    
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('should not render error state when loading', () => {
    const mockError = new Error('Error while loading');
    renderWithRouter(<ProjectsTable projects={[]} isLoading={true} error={mockError} />);
    
    expect(screen.queryByText('Error while loading')).toBeNull();
  });
});