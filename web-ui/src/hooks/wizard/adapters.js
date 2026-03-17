import { parseCSV } from '@/lib/csv-parser';
import { findSuggestedMapping, saveMappings } from '@/lib/task-mapping-storage';
import { generateSQL } from '@/lib/sql-generator';
import { CSVParserPort, TaskStoragePort, SQLGeneratorPort } from './ports';

/**
 * Adapter for existing CSV parser
 * @extends CSVParserPort
 */
export class CSVParserAdapter extends CSVParserPort {
  async parse(file, encoding) {
    return await parseCSV(file, encoding);
  }
}

/**
 * Adapter for existing Task Mapping Storage
 * @extends TaskStoragePort
 */
export class TaskStorageAdapter extends TaskStoragePort {
  loadSuggestedMapping(taskName) {
    return findSuggestedMapping(taskName);
  }

  saveMappings(mappings) {
    saveMappings(mappings);
  }
}

/**
 * Adapter for existing SQL Generator
 * @extends SQLGeneratorPort
 */
export class SQLGeneratorAdapter extends SQLGeneratorPort {
  generate(params) {
    return generateSQL(params);
  }
}
