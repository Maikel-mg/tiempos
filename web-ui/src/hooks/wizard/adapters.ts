import { parseCSV } from '@/lib/csv-parser';
import { findSuggestedMapping, saveMappings } from '@/lib/task-mapping-storage';
import { generateSQL } from '@/lib/sql-generator';
import type { CSVParserPort, TaskStoragePort, SQLGeneratorPort, ParsedData, SQLResult } from './ports';

/**
 * Adapter for existing CSV parser
 */
export class CSVParserAdapter implements CSVParserPort {
  async parse(file: File, encoding: string): Promise<ParsedData> {
    return await parseCSV(file, encoding);
  }
}

/**
 * Adapter for existing Task Mapping Storage
 */
export class TaskStorageAdapter implements TaskStoragePort {
  loadSuggestedMapping(taskName: string): string | null {
    return findSuggestedMapping(taskName);
  }

  saveMappings(mappings: Record<string, string>): void {
    saveMappings(mappings);
  }
}

/**
 * Adapter for existing SQL Generator
 */
export class SQLGeneratorAdapter implements SQLGeneratorPort {
  generate(params: {
    rows: string[][];
    headers: string[];
    taskMapping: Record<string, string>;
    config: any;
    indices: any;
  }): SQLResult {
    return generateSQL(params);
  }
}
