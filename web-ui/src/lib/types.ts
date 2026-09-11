export interface DbConfig {
  server: string;
  database: string;
  username: string;
  password?: string;
}

export interface ExecuteSqlParams extends DbConfig {
  sqlStatements: string[];
}

export interface ExecuteSqlResponse {
  success: boolean;
  message: string;
  totalRowsAffected?: number;
  results?: { success: boolean; rowsAffected: number }[];
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: { server: string; database: string };
  suggestions?: string[];
}

export interface TimeEntry {
  id?: string;
  _id?: string;
  description: string;
  taskName?: string;
  task?: { name: string };
  project?: { name: string };
  projectId?: string;
  timeInterval: {
    start: string;
    end: string;
    duration: number | string;
  };
}

export interface ImportConfig {
  usuario: string;
  fase?: string;
  tipoHora: string | number;
}

export interface TaskMappings {
  [taskName: string]: string;
}
