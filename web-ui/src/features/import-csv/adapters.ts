import { parseCSV } from './services/csv-parser';
import { findSuggestedMapping, saveMappings } from '@/lib/task-mapping-storage';
import type { CSVParserPort, TaskStoragePort, SQLGeneratorPort, ParsedData, SQLResult } from './ports';
import type { CSVIndices } from './services/csv-parser';
import type { ImportConfigPort } from './ports';

export class CSVParserAdapter implements CSVParserPort {
  async parse(file: File, encoding: string): Promise<ParsedData> {
    return await parseCSV(file, encoding);
  }
}

export class TaskStorageAdapter implements TaskStoragePort {
  loadSuggestedMapping(taskName: string): string | null {
    return findSuggestedMapping(taskName);
  }

  saveMappings(mappings: Record<string, string>): void {
    saveMappings(mappings);
  }
}

export class SQLGeneratorAdapter implements SQLGeneratorPort {
  generate(_params: {
    rows: string[][];
    headers: string[];
    taskMapping: Record<string, string>;
    config: ImportConfigPort;
    indices: CSVIndices;
  }): SQLResult {
    return { sql: '', statements: [], processed: 0, errors: [], total: 0 };
  }
}
