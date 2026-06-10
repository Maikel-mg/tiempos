import sql from 'mssql';
import { createDbConfig, type DbConnectionParams } from '../domain/db-config';

/**
 * Executes a single SQL query with pool lifecycle management.
 * Sets Spanish session language for correct date interpretation.
 */
export async function executeQuery<T = any>(
  params: DbConnectionParams,
  query: string
): Promise<T[]> {
  const config = createDbConfig(params);
  const pool = new sql.ConnectionPool(config);
  let connected = false;
  try {
    await pool.connect();
    connected = true;
    // Set session language before the actual query
    await pool.request().query('SET LANGUAGE Spanish; SET DATEFORMAT dmy;');
    const result = await pool.request().query(query);
    return (result.recordset || []) as T[];
  } finally {
    if (connected) await pool.close();
  }
}

/**
 * Executes a query without SET LANGUAGE (for calls that include it inline,
 * or for SPs that don't need it). Returns all recordsets from the SP.
 */
export async function executeQueryRaw(
  params: DbConnectionParams,
  query: string
): Promise<any[]> {
  const config = createDbConfig(params);
  const pool = new sql.ConnectionPool(config);
  let connected = false;
  try {
    await pool.connect();
    connected = true;
    const result = await pool.request().query(query);
    // Return all recordsets — callers can extract the one they need
    // result.recordsets is an array of recordsets; result.recordset is the first one
    return Array.isArray(result.recordsets) ? result.recordsets : [result.recordset];
  } finally {
    if (connected) await pool.close();
  }
}

/**
 * Executes multiple SQL statements in sequence and returns rowsAffected per statement.
 * Used by /api/execute-sql.
 */
export async function executeStatements(
  params: DbConnectionParams,
  statements: string[]
): Promise<{ success: boolean; rowsAffected: number }[]> {
  const config = createDbConfig(params);
  const pool = new sql.ConnectionPool(config);
  let connected = false;
  try {
    await pool.connect();
    connected = true;
    const results: { success: boolean; rowsAffected: number }[] = [];
    for (const statement of statements) {
      const result = await pool.request().query(statement);
      const rowsAffected = result.rowsAffected[0] || 0;
      results.push({ success: true, rowsAffected });
    }
    return results;
  } finally {
    if (connected) await pool.close();
  }
}

/**
 * Runs a function inside a SQL transaction with Spanish session settings.
 * The callback receives a sql.Request and can run multiple queries.
 * Automatically commits on success, rolls back on error.
 */
export async function executeInTransaction<T = any>(
  params: DbConnectionParams,
  fn: (request: sql.Request) => Promise<T[]>
): Promise<T[]> {
  const config = createDbConfig(params);
  const pool = new sql.ConnectionPool(config);
  let connected = false;
  try {
    await pool.connect();
    connected = true;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Set session language
      const setupReq = transaction.request();
      await setupReq.query('SET LANGUAGE Spanish;\nSET DATEFORMAT dmy;');
      const result = await fn(transaction.request());
      await transaction.commit();
      return result;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } finally {
    if (connected) await pool.close();
  }
}

/**
 * Executes a query for each year/month pair and returns combined results.
 * Used by /api/validate-entries and /api/sync-time-entries.
 */
export async function executeForYearMonthPairs(
  params: DbConnectionParams,
  pairs: { year: number; month: number }[],
  usured: string = 'MG01'
): Promise<{ year: number; month: number; data: any[] }[]> {
  const config = createDbConfig(params);
  const pool = new sql.ConnectionPool(config);
  let connected = false;
  try {
    await pool.connect();
    connected = true;
    await pool.request().query('SET LANGUAGE Spanish; SET DATEFORMAT dmy;');
    const allResults: { year: number; month: number; data: any[] }[] = [];
    for (const pair of pairs) {
      const query = `EXEC spNETTiempos_ListaImputaciones @pUsured='${usured}', @pAnio=${pair.year}, @pMes=${pair.month}, @pDia=NULL, @pOrder=' ORDER BY TC.Fecha DESC, CONVERT(char(5), TL.[Desde Hora], 108)', @pWhere=NULL`;
      const result = await pool.request().query(query);
      allResults.push({
        year: pair.year,
        month: pair.month,
        data: result.recordset || []
      });
    }
    return allResults;
  } finally {
    if (connected) await pool.close();
  }
}

/**
 * Runs entries in a transaction with per-entry error handling.
 * Each entry is tried separately; errors are collected but the transaction always commits.
 * Used by /api/execute-time-entries.
 */
export async function executeTimeEntriesInTransaction(
  params: DbConnectionParams,
  entries: Array<{
    entryId: string;
    Usured: string;
    Fecha: string;
    HoraDesde: string;
    HoraHasta: string;
    Minutos: number;
    Proceso: number;
    pTipoHora?: number;
    Comentario?: string;
  }>
): Promise<Array<{ entryId: string; success: boolean; serverId?: number; error?: string }>> {
  const config = createDbConfig(params);
  const pool = new sql.ConnectionPool(config);
  let connected = false;
  try {
    await pool.connect();
    connected = true;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Set session language
    await transaction.request().query('SET LANGUAGE Spanish;\nSET DATEFORMAT dmy;');

    const results: Array<{ entryId: string; success: boolean; serverId?: number; error?: string }> = [];

    for (const entry of entries) {
      try {
        const req = transaction.request();
        const result = await req.query(
          `EXEC spNETTiempos_Alta @Usured='${entry.Usured.replace(/'/g, "''")}', @Fecha='${entry.Fecha}', @HoraDesde='${entry.HoraDesde}', @HoraHasta='${entry.HoraHasta}', @Minutos=${entry.Minutos}, @Proceso=${entry.Proceso}, @pParteSalida=NULL, @pGastos=0, @pKms=0, @pTipoHora=${entry.pTipoHora ?? 11}, @ClienteComercial=NULL, @Comentario='${(entry.Comentario ?? '').replace(/'/g, "''")}', @pCambio=NULL, @pTeleTrabajo=0, @ObservacionesCalidad=NULL, @Rapport=0, @RapportCheck=0, @VBPermisoUsured=NULL, @VBPermisoFechaHora=NULL, @ObservacionesPermiso=NULL, @Ticket=NULL, @EsTeleTrabajo=1, @pMarcajeIP_INI=0, @pMarcajeIP_FIN=0, @pObservacionesPseudoMarcaje=NULL, @pTiempoNoReconocido=0, @pObservacionesRegistroHorario=NULL`
        );
        const serverId = result.recordset?.[0]?.Id;
        results.push({
          entryId: entry.entryId,
          success: true,
          serverId: serverId !== undefined ? Number(serverId) : undefined,
        });
      } catch (err: any) {
        results.push({
          entryId: entry.entryId,
          success: false,
          error: err.message,
        });
      }
    }

    await transaction.commit();
    return results;
  } catch (error: any) {
    // Outer error (e.g., begin/commit failed)
    throw error;
  } finally {
    if (connected) await pool.close();
  }
}