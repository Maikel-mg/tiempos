/**
 * @typedef {Object} ParsedData
 * @property {string[]} headers
 * @property {string[][]} rows
 * @property {string} separador
 */

/**
 * @typedef {Object} SQLResult
 * @property {string} sql
 * @property {string[]} statements
 * @property {number} processed
 * @property {any[]} errors
 * @property {number} total
 */

/**
 * Port for CSV Parsing
 * @interface
 */
export class CSVParserPort {
  /**
   * @param {File} file
   * @param {string} encoding
   * @returns {Promise<ParsedData>}
   */
  async parse(file, encoding) {
    throw new Error('Not implemented');
  }
}

/**
 * Port for Task Mapping Storage
 * @interface
 */
export class TaskStoragePort {
  /**
   * @param {string} taskName
   * @returns {string|null}
   */
  loadSuggestedMapping(taskName) {
    throw new Error('Not implemented');
  }

  /**
   * @param {Record<string, string>} mappings
   */
  saveMappings(mappings) {
    throw new Error('Not implemented');
  }
}

/**
 * Port for SQL Generation
 * @interface
 */
export class SQLGeneratorPort {
  /**
   * @param {Object} params
   * @param {string[][]} params.rows
   * @param {string[]} params.headers
   * @param {Record<string, number>} params.taskMapping
   * @param {Object} params.config
   * @param {Object} params.indices
   * @returns {SQLResult}
   */
  generate(params) {
    throw new Error('Not implemented');
  }
}
