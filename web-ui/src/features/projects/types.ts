export interface DbConnectionParams {
  server: string;
  database: string;
  username?: string;
  user?: string;
  password?: string;
}

export interface Project {
  CodCli: string;
  Cliente: string;
  NomCliente: string;
  NomProy: string;
  Proyecto: string;
  Abierto: boolean;
  IdDpto: string;
  NomDpto: string;
  IdAplicacion: string;
  UsuredRespRev: string;
}

export interface ProjectsParams {
  fecha?: string;     // YYYY-MM-DD
  modoProc?: string;  // Filtering mode
  usured?: string;    // User ID filter
}

export interface ProjectsRequest extends DbConnectionParams, ProjectsParams {}

// ========== Project Tree Types ==========

export interface ProjectTreeCliente {
  codCli: number;
  cliente: string;
  nomCliente: string;
}

export interface ProjectTreeProyecto {
  codCli: number;
  proyecto: number;
  nomProy: string;
  cerrado: boolean;
  cmmi: boolean;
  esCM: boolean;
  esPET: boolean;
}

export interface ProjectTreeProceso {
  proceso: number;
  nombre: string;
}

export interface ProjectTreeFase {
  fase: number;
  nombre: string;
  cerrado: boolean;
  orden: number;
  procesos: ProjectTreeProceso[];
}

export interface ProjectTreeDisciplina {
  idDisciplina: number;
  nombre: string;
  sinDisciplina: boolean;
  orden: number;
  fases: ProjectTreeFase[];
}

export interface ProjectTreeResponse {
  cliente: ProjectTreeCliente;
  proyecto: ProjectTreeProyecto;
  disciplinas: ProjectTreeDisciplina[];
}

export interface ProjectTreeParams {
  codCli: string;
  proyecto: string;
}

export interface ProjectTreeRequest extends DbConnectionParams, ProjectTreeParams {}
