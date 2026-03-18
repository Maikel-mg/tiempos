export interface ParsedData {
  headers: string[];
  rows: string[][];
  separador: string;
}

export interface SQLResult {
  sql: string;
  statements: string[];
  processed: number;
  errors: any[];
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
    config: any;
    indices: any;
  }): SQLResult;
}
