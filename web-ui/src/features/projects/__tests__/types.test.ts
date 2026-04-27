import { describe, it, expect } from 'vitest';
import type { Project, ProjectsRequest } from '../types';

describe('Projects Types', () => {
  it('should define a Project object structure', () => {
    const project: Project = {
      CodCli: 'C001',
      Cliente: 'Client Name',
      NomCliente: 'Long Client Name',
      NomProy: 'Project Name',
      Proyecto: 'P001',
      Abierto: true,
      IdDpto: 'D01',
      NomDpto: 'Department Name',
      IdAplicacion: 'A01',
      UsuredRespRev: 'user123'
    };

    expect(project.CodCli).toBe('C001');
    expect(project.Abierto).toBe(true);
  });

  it('should define a ProjectsRequest structure', () => {
    const request: ProjectsRequest = {
      server: 'localhost',
      database: 'test-db',
      username: 'user',
      password: 'password',
      fecha: '2023-01-01',
      modoProc: 'ALL',
      usured: 'user123'
    };

    expect(request.server).toBe('localhost');
    expect(request.fecha).toBe('2023-01-01');
  });
});
