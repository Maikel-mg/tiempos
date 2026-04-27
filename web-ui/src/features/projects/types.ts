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
