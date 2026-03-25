import type { UniqueTask, CSVIndices, ParsedData } from './services/csv-parser';

export { type UniqueTask, type CSVIndices, type ParsedData };

export interface SQLResult {
  sql: string;
  statements: string[];
  processed: number;
  errors: unknown[];
  total: number;
}

export interface CSVParserPort {
  parse(file: File, encoding: string): Promise<ParsedData>;
}

export interface TaskStoragePort {
  loadSuggestedMapping(taskName: string): string | null;
  saveMappings(mappings: Record<string, string>): void;
}

export interface SQLGeneratorPort {
  generate(params: {
    rows: string[][];
    headers: string[];
    taskMapping: Record<string, string>;
    config: ImportConfigPort;
    indices: CSVIndices;
  }): SQLResult;
}

export interface ImportConfigPort {
  usuario: string;
  fase: string;
  tipoHora: string;
  encoding: string;
  [key: string]: string;
}

export interface WizardAdaptersPort {
  csvParser: CSVParserPort;
  taskStorage: TaskStoragePort;
  sqlGenerator: SQLGeneratorPort;
}
