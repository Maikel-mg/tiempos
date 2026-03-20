export interface DbConfig {
  server: string;
  database: string;
  username: string;
  password?: string;
}

export interface TimeEntry {
  id?: string;
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
