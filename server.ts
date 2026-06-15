import express, { type Request, type Response } from 'express';
import cors from 'cors';
import sql from 'mssql';
import { getYearMonthPairs } from './src/domain/year-month-pairs';
import { transformToTreeStructure } from './src/domain/tree-transformer';
import { createDbConfig, type DbConnectionParams } from './src/domain/db-config';
import {
  executeStatements,
  executeQueryRaw,
  executeForYearMonthPairs,
  executeTimeEntriesInTransaction,
} from './src/application/sql-executor';
import { buildProjectsQuery, buildProjectsTreeQuery, buildProcessesQuery, buildExecuteTimeEntriesSQL, buildCreateProcessSQL, type CreateProcessDTO } from './src/application/sp-builder';
import { classifyEntries, type TimeEntry } from './src/application/entry-classifier';
import * as clockifyApp from './src/application/clockify-app';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Re-export DbConnectionParams for backward compatibility with existing tests
export type { DbConnectionParams } from './src/domain/db-config';

// Test connection endpoint
app.post('/api/test-connection', async (req: Request, res: Response) => {
  const { server, database, username, password } = req.body as DbConnectionParams;
  
  try {
    const testConfig = createDbConfig(req.body as DbConnectionParams);

    const testPool = new sql.ConnectionPool(testConfig);
    await testPool.connect();
    await testPool.close();

    res.json({
      success: true,
      message: 'Connection successful!',
      details: {
        server,
        database
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      suggestions: [
        'Check server name',
        'Verify credentials',
        'Ensure network connectivity to the database server'
      ]
    });
  }
});

interface ExecuteSqlParams extends DbConnectionParams {
  sqlStatements: string[];
}

// Execute SQL endpoint
app.post('/api/execute-sql', async (req: Request, res: Response) => {
  const { server, database, username, password, sqlStatements } = req.body as ExecuteSqlParams;

  try {
    const results = await executeStatements(req.body as ExecuteSqlParams, sqlStatements);
    const totalRowsAffected = results.reduce((sum, r) => sum + r.rowsAffected, 0);

    res.json({
      success: true,
      message: 'SQL executed successfully',
      totalRowsAffected,
      results
    });
  } catch (error: any) {
    console.error('SQL Execution Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      suggestions: [
        'Check SQL syntax',
        'Verify constraint compliance',
        'Ensure all referenced entities exist'
      ]
    });
  }
});



app.get('/api/get-workspace-id', async (_req: Request, res: Response) => {
  try {
    const workspaces = await clockifyApp.getWorkspaces();

    res.json({
      success: true,
      message: 'Copia el ID del workspace que quieras usar',
      workspaces
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/time-entries', async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query as Record<string, string>;

        if (!startDate) {
            return res.status(400).json({
                error: 'El parámetro startDate es requerido (formato: YYYY-MM-DD)'
            });
        }

        const data = await clockifyApp.getTimeEntries({ startDate, endDate });

        res.json({
            success: true,
            count: Array.isArray(data) ? data.length : 0,
            data
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de Clockify',
            details: error.message
        });
    }
});

app.post('/api/clockify/report', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;
    const data = await clockifyApp.getReport({ startDate, endDate });

    res.json({
      success: true,
      count: data.length || 0,
      data
    });
  } catch (error: any) {
    if (error.message === 'Timeout: La petición tardó demasiado') {
      return res.status(504).json({
        success: false,
        error: 'Timeout: La petición tardó demasiado'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error interno al generar el reporte',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// --- Clockify: Create Task ---
app.post('/api/clockify/create-task', async (req: Request, res: Response) => {
    try {
        const { projectId, name: taskName } = req.body;

        if (!projectId || !taskName) {
            return res.status(400).json({
                success: false,
                message: 'Los campos projectId y name son requeridos'
            });
        }

        const result = await clockifyApp.createTask(projectId, taskName);

        res.json({
            success: true,
            taskId: result.taskId,
            message: 'Tarea creada'
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error interno al crear la tarea',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// --- Clockify: Bulk Update Entries ---
app.put('/api/clockify/bulk-update-entries', async (req: Request, res: Response) => {
    try {
        const { entries, taskId } = req.body;

        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El campo entries es requerido y debe ser un array no vacío'
            });
        }

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: 'El campo taskId es requerido'
            });
        }

        await clockifyApp.bulkUpdateEntries(entries, taskId);

        res.json({
            success: true,
            updated: entries.length,
            message: `${entries.length} entradas reasignadas`
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error interno al actualizar las entradas',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


interface ValidateEntriesParams extends DbConnectionParams {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

interface ProjectsRequest extends DbConnectionParams {
  fecha?: string;     // YYYY-MM-DD
  modoProc?: string;  // Filtering mode
  usured?: string;    // User ID filter
}

app.post('/api/projects', async (req: Request, res: Response) => {
  const { server, database, username, password, fecha, modoProc, usured } = req.body as ProjectsRequest;

  try {
    const query = buildProjectsQuery({
      fecha,
      modoProc: modoProc ? parseInt(modoProc, 10) : undefined,
      usured,
    });

    const result = await executeQueryRaw(req.body as ProjectsRequest, query);
    const data = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Projects Fetch Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/validate-entries', async (req: Request, res: Response) => {
  const { server, database, username, password, startDate, endDate } = req.body as ValidateEntriesParams;
  console.log(`TCL ~ validate-entries request:`, { startDate, endDate, hasServer: !!server });

  if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
  }

  try {
    const pairs = getYearMonthPairs(startDate, endDate);
    const results = await executeForYearMonthPairs(req.body as ValidateEntriesParams, pairs);
    res.json({ success: true, results });
  } catch (error: any) {
    console.error('Validation Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Sync Time Entries: classify entries as new or existing ---
interface SyncTimeEntriesParams extends DbConnectionParams {
  entries: TimeEntry[];
  usuario: string;
}

app.post('/api/sync-time-entries', async (req: Request, res: Response) => {
  const { server, database, username, password, entries, usuario } = req.body as any;

  // --- Validation ---
  if (!entries || !Array.isArray(entries)) {
    return res.status(400).json({ success: false, message: 'entries is required and must be an array' });
  }
  if (!server) {
    return res.status(400).json({ success: false, message: 'server is required' });
  }
  if (!database) {
    return res.status(400).json({ success: false, message: 'database is required' });
  }

  // --- Empty entries shortcut ---
  if (entries.length === 0) {
    return res.json({ success: true, willInsert: [], alreadyExists: [] });
  }

  const pairs = getYearMonthPairs(entries);
    const pairResults = await executeForYearMonthPairs(req.body as SyncTimeEntriesParams, pairs, usuario);
    const allDbRows = pairResults.flatMap(r => r.data);

    const result = classifyEntries(entries, allDbRows);

    res.json({ success: true, ...result });
});

// --- Execute Time Entries: insert time entries via spNETTiempos_Alta ---
interface ExecuteTimeEntriesParams extends DbConnectionParams {
  entries: Array<{
    entryId: string;
    Usured: string;
    Fecha: string;       // YYYYMMDD
    HoraDesde: string;
    HoraHasta: string;
    Minutos: number;
    Proceso: number;
    pTipoHora: number;   // default 11
    Comentario?: string;
  }>;
}

app.post('/api/execute-time-entries', async (req: Request, res: Response) => {
  const { server, database, username, password, entries } = req.body as ExecuteTimeEntriesParams;

  if (!entries || !Array.isArray(entries)) {
    return res.status(400).json({ success: false, message: 'entries is required and must be an array' });
  }
  if (!server) {
    return res.status(400).json({ success: false, message: 'server is required' });
  }
  if (!database) {
    return res.status(400).json({ success: false, message: 'database is required' });
  }

  const results = await executeTimeEntriesInTransaction(req.body as ExecuteTimeEntriesParams, entries);
  res.json({ success: true, results });
});

// --- Preview Time Entries SQL: returns constructed SQL without executing ---
app.post('/api/preview-sql', async (req: Request, res: Response) => {
  try {
    const { entries } = req.body as { entries: ExecuteTimeEntriesParams['entries'] };

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'entries is required and must be a non-empty array' });
    }

    const sql = buildExecuteTimeEntriesSQL(entries);
    res.json({ success: true, sql });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Preview Process SQL: returns constructed SQL without executing ---
interface PreviewProcessParams extends DbConnectionParams {
  dto: CreateProcessDTO;
}

app.post('/api/preview-process-sql', async (req: Request, res: Response) => {
  try {
    const { dto } = req.body as PreviewProcessParams;

    if (!dto || !dto.nombre || !dto.usuario || !dto.fase) {
      return res.status(400).json({ success: false, message: 'dto with nombre, usuario, and fase is required' });
    }

    const sql = buildCreateProcessSQL(dto);
    res.json({ success: true, sql });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Create Process: generates INSERT SQL from DTO and executes it ---
interface CreateProcessParams extends DbConnectionParams {
  dto: CreateProcessDTO;
}

app.post('/api/create-process', async (req: Request, res: Response) => {
  const { server, database, username, password, dto } = req.body as CreateProcessParams;

  if (!dto || !dto.nombre || !dto.usuario || !dto.fase) {
    return res.status(400).json({ success: false, message: 'dto with nombre, usuario, and fase is required' });
  }

  try {
    const sql = buildCreateProcessSQL(dto);
    const results = await executeStatements(
      { server, database, username, password: password || '' } as DbConnectionParams,
      [sql]
    );
    const totalRowsAffected = results.reduce((sum, r) => sum + r.rowsAffected, 0);

    res.json({
      success: true,
      message: 'Proceso creado exitosamente',
      totalRowsAffected,
      results
    });
  } catch (error: any) {
    console.error('Create Process Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      suggestions: [
        'Check SQL syntax',
        'Verify constraint compliance',
        'Ensure all referenced entities exist'
      ]
    });
  }
});

// Only start listening when run directly (not when imported for tests)
if (process.argv[1] && !process.argv[1].includes('vitest')) {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

export default app;

// ============================================
// Phase 1: Tipos e Interfaces
// ============================================

// ============================================
// Phase 2: Endpoint /api/projects-tree
// ============================================

app.post('/api/projects-tree', async (req: Request, res: Response) => {
  const { codCli, proyecto, fecha, modo } = req.body;

  try {
    const query = buildProjectsTreeQuery({
      codCli,
      proyecto,
      fecha,
      modo: modo ? parseInt(modo, 10) : undefined,
    });

    const result = await executeQueryRaw(req.body as DbConnectionParams, query);

    const recordsets: any[] = Array.isArray(result)
      ? result
      : Object.values(result || {});

    const treeData = transformToTreeStructure(recordsets);

    res.json({
      success: true,
      data: treeData
    });
  } catch (error: any) {
    console.error('Projects Tree Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// Endpoint /api/processes
// ============================================

app.post('/api/processes', async (req: Request, res: Response) => {
  const { usured, server, database, username, password } = req.body;

  if (!usured || usured.trim() === '') {
    res.status(400).json({
      success: false,
      message: 'El parámetro "usured" es requerido'
    });
    return;
  }

try {
    const query = buildProcessesQuery({ usured });

    const result = await executeQueryRaw(req.body as DbConnectionParams, query);
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : (Array.isArray(result) ? result : []);

    const data = rows.map((row: any) => ({
      proceso: row.NProceso,
      nombre: row.NomProceso,
      faseId: row.NFase,
      faseNombre: row.NomFase,
      proyectoId: row.NProyecto,
      proyectoNombre: row.NomProyecto,
      clienteId: row.CodCli,
      clienteNombre: row.NomCliente,
      departamentoId: row.IdDpto,
      departamentoNombre: row.NomDepartamento,
      disciplinaId: row.Disciplina,
    }));

    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Processes Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
