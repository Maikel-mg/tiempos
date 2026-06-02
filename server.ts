import express, { type Request, type Response } from 'express';
import cors from 'cors';
import sql from 'mssql';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

interface DbConnectionParams {
  server: string;
  database: string;
  username?: string;
  user?: string;
  password?: string;
}

// Test connection endpoint
app.post('/api/test-connection', async (req: Request, res: Response) => {
  const { server, database, username, password } = req.body as DbConnectionParams;
  
  try {
    const testConfig: sql.config = {
      server,
      database,
      user: username,
      password,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        language: 'Spanish',
        dateFormat: 'dmy',
        useUTC: false
      }
    };

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
    const config: sql.config = {
        server,
        database,
        user: username,
        password,
        options: {
            encrypt: true,
            trustServerCertificate: true,
            language: 'Spanish',
            dateFormat: 'dmy',
            useUTC: false
        }
    };

    const currentPool = new sql.ConnectionPool(config);
    await currentPool.connect();
    
    try {
      const results: { success: boolean; rowsAffected: number }[] = [];
      let totalRowsAffected = 0;

      console.log(`Ejecutando ${sqlStatements.length} sentencias SQL...`);
      if (sqlStatements.length > 0) {
        console.log('Primera sentencia:', sqlStatements[0]);
      }

      for (const statement of sqlStatements) {
        const result = await currentPool.request().query(statement);
        const rowsAffected = result.rowsAffected[0] || 0;
        results.push({
          success: true,
          rowsAffected
        });
        totalRowsAffected += rowsAffected;
      }

      res.json({
        success: true,
        message: 'SQL executed successfully',
        totalRowsAffected,
        results
      });
    } finally {
      await currentPool.close();
    }
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

// Helper para construir URL con query params
const buildUrl = (baseUrl: string, params: Record<string, string | null | undefined>) => {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });
    return url.toString();
};

app.get('/api/get-workspace-id', async (_req: Request, res: Response) => {
  try {
        const apiKey = process.env.CLOCKIFY_API_KEY;
        if (!apiKey) throw new Error('CLOCKIFY_API_KEY no configurado');

        const response = await fetch('https://api.clockify.me/api/v1/user', {
            headers: { 'X-Api-Key': apiKey }
        });
        
        if (!response.ok) throw new Error('API Key inválida o error de conexión');
        
        const userData = await response.json();
        
        res.json({
            success: true,
            message: 'Copia el ID del workspace que quieras usar',
            workspaces: userData.workspaces.map((w: any) => ({
                id: w.id,
                name: w.name,
                idLength: w.id.length
            }))
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener time entries
app.get('/api/time-entries', async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, userId } = req.query as Record<string, string>;
        
        if (!startDate) {
            return res.status(400).json({ 
                error: 'El parámetro startDate es requerido (formato: YYYY-MM-DD)' 
            });
        }

        const apiKey = process.env.CLOCKIFY_API_KEY;
        if (!apiKey) throw new Error('CLOCKIFY_API_KEY no configurado');

        const apiParams = {
            start: startDate,
            end: endDate || new Date().toISOString().split('T')[0],
            hydrate: 'true'
        };

        const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID;
        const envUserId = process.env.CLOCKIFY_USER_ID;

        const url = buildUrl(
            `https://api.clockify.me/api/v1/workspaces/${workspaceId}/user/${envUserId}/time-entries`,
            apiParams
        );

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        res.json({
            success: true,
            count: Array.isArray(data) ? data.length : 0,
            data: data
        });

    } catch (error: any) {
        console.error('Error al obtener time entries:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de Clockify',
            details: error.message
        });
    }
});

app.post('/api/clockify/report', async (req: Request, res: Response) => {
  const controller = new AbortController();
  console.log(`TCL ~ Request:`, Request)
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const { startDate, endDate } = req.body;
        const apiKey = process.env.CLOCKIFY_API_KEY;
        if (!apiKey) throw new Error('CLOCKIFY_API_KEY no configurado');

        const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID?.trim();
        if (!workspaceId || !/^[0-9a-f]{24}$/i.test(workspaceId)) {
            return res.status(500).json({
                success: false,
                message: 'CLOCKIFY_WORKSPACE_ID inválido en .env'
            });
        }
        
        const userResponse = await fetch('https://api.clockify.me/api/v1/user', {
            headers: { 'X-Api-Key': apiKey }
        });

        if (!userResponse.ok) {
            throw new Error('No se pudo obtener información del usuario de Clockify');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        if (!userId) {
            throw new Error('No se pudo obtener el User ID de Clockify');
        }

        const url = `https://reports.api.clockify.me/v1/workspaces/${workspaceId}/reports/detailed`;

        const payload = {
            dateRangeStart: startDate,
            dateRangeEnd: endDate || new Date().toISOString().split('T')[0],
            hydrate: true,
            page: 1,
            'page-size': 100,
             users: {
                    ids: [userId],
                    contains: "CONTAINS",
                    status: "ALL"
                },
            detailedFilter: {
                page: 1,
                pageSize: 100,
                sortColumn: "DATE",
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                success: false,
                message: errorData.message || `Error ${response.status} de Clockify`
            });
        }

        const data = await response.json();

        res.json({
            success: true,
            count: data.timeentries?.length || 0,
            data: data.timeentries || []
        });

    } catch (error: any) {
        clearTimeout(timeout);
        
        console.error('Error en reporte:', error.message);

        if (error.name === 'AbortError') {
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

        const apiKey = process.env.CLOCKIFY_API_KEY;
        if (!apiKey) throw new Error('CLOCKIFY_API_KEY no configurado');

        const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID?.trim();
        if (!workspaceId || !/^[0-9a-f]{24}$/i.test(workspaceId)) {
            return res.status(500).json({
                success: false,
                message: 'CLOCKIFY_WORKSPACE_ID inválido en .env'
            });
        }

        const url = `https://api.clockify.me/api/v1/workspaces/${workspaceId}/projects/${projectId}/tasks`;
console.log('url', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: taskName })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const statusMessages: Record<number, string> = {
                401: 'API key inválida o expirada',
                403: 'No tienes permisos para crear tareas en este proyecto',
                404: 'Proyecto no encontrado',
                429: 'Límite de peticiones alcanzado, intentá más tarde'
            };
            return res.status(response.status).json({
                success: false,
                message: statusMessages[response.status] || errorData.message || `Error ${response.status} de Clockify`
            });
        }

        const task = await response.json();

        res.json({
            success: true,
            taskId: task.id,
            message: 'Tarea creada'
        });
    } catch (error: any) {
        console.error('Error al crear tarea en Clockify:', error.message);
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

        const apiKey = process.env.CLOCKIFY_API_KEY;
        if (!apiKey) throw new Error('CLOCKIFY_API_KEY no configurado');

        const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID?.trim();
        if (!workspaceId || !/^[0-9a-f]{24}$/i.test(workspaceId)) {
            return res.status(500).json({
                success: false,
                message: 'CLOCKIFY_WORKSPACE_ID inválido en .env'
            });
        }

        const userId = process.env.CLOCKIFY_USER_ID?.trim();
        if (!userId || !/^[0-9a-f]{24}$/i.test(userId)) {
            return res.status(500).json({
                success: false,
                message: 'CLOCKIFY_USER_ID inválido en .env'
            });
        }

        const url = `https://api.clockify.me/api/v1/workspaces/${workspaceId}/user/${userId}/time-entries`;
        console.log(`TCL ~ url:`, url)
        console.log(`TCL ~ url:`, url)
        console.log(`TCL ~ url:`, url)

        const payload = entries.map((entry: { id: string; start: string; end: string; projectId?: string }) => ({
            id: entry.id,
            start: entry.start,
            end: entry.end,
            taskId,
            projectId: entry.projectId,
        }));

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const statusMessages: Record<number, string> = {
                401: 'API key inválida o expirada',
                403: 'No tienes permisos para actualizar estas entradas',
                404: 'Una o más entradas o la tarea no fueron encontradas',
                429: 'Límite de peticiones alcanzado, intentá más tarde'
            };
            return res.status(response.status).json({
                success: false,
                message: statusMessages[response.status] || errorData.message || `Error ${response.status} de Clockify`
            });
        }

        // Clockify PUT returns 200 with no body on success
        res.json({
            success: true,
            updated: entries.length,
            message: `${entries.length} entradas reasignadas`
        });
    } catch (error: any) {
        console.error('Error al actualizar entradas en Clockify:', error.message);
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
  // console.log(`TCL ~ Projects request body:`, req.body);
  const { server, database, username, password, fecha, modoProc, usured } = req.body as ProjectsRequest;

  try {
    const config: sql.config = {
        server,
        database,
        user: username,
        password,
        options: {
            encrypt: true,
            trustServerCertificate: true,
            language: 'Spanish',
            dateFormat: 'dmy',
            useUTC: false
        }
    };

    const currentPool = new sql.ConnectionPool(config);
    await currentPool.connect();
    
    try {
      const fechaInput = fecha || new Date().toISOString().split('T')[0];
      const pModoProc = modoProc ? parseInt(modoProc, 10) : 1;
      const pUsured = usured || 'MG01';

      // console.log(`TCL ~ Projects params:`, { 
      //   fechaInput,
      //   pModoProc, 
      //   pUsured 
      // });

      // Usamos .query con SET DATEFORMAT para asegurar que SQL Server interprete la fecha correctamente
      // independientemente de la configuración de idioma del servidor (MDY vs DMY)
      // Nota: Usamos concatenación directa para el SET DATEFORMAT y pasamos el valor de fecha 
      // de forma que SQL Server no tenga dudas sobre el formato (YYYYMMDD).
      // El SP utiliza internamente CONVERT(..., 103) que es formato dd/mm/yyyy
      // y construye SQL dinámico. Para que ese SQL dinámico funcione con fechas > 12,
      // la sesión DEBE tener SET DATEFORMAT dmy.
      const [year, month, day] = fechaInput.split('-');
      const pFechaSpanish = `${day}/${month}/${year}`;
      
      const query = `
        SET DATEFORMAT dmy;
        EXEC spNETProyectos_SeleccionProyectos @pFecha = '${pFechaSpanish}', @pModoProc = ${pModoProc}, @pUsured = '${pUsured.replace(/'/g, "''")}';
      `;
      
      // console.log(`TCL ~ Ejecutando query raw:`, query);
      const result = await currentPool.request().query(query);

      // console.log(`TCL ~ result:`, result)
      // El resultado de mssql.query() puede devolver múltiples recordsets si hay varias sentencias
      // o PRINTs en el SP. spNETProyectos_SeleccionProyectos tiene PRINT @vSql al final.
      const data = Array.isArray(result.recordsets) ? result.recordsets[0] : result.recordset;
      console.log(`TCL ~ data:`, data)
      // return data;
      res.json({ success: true, data: data || [] });
    } finally {
      await currentPool.close();
    }
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

  // Helper to generate Year/Month pairs
  const getYearMonthPairs = (start: string, end: string) => {
    const pairs = [];
    let current = new Date(start);
    const stop = new Date(end);
    
    while (current <= stop) {
        pairs.push({ year: current.getFullYear(), month: current.getMonth() + 1 });
        current.setMonth(current.getMonth() + 1);
    }
    return pairs;
  };

  try {
    const config: sql.config = {
        server,
        database,
        user: username,
        password,
        options: {
            encrypt: true,
            trustServerCertificate: true,
            language: 'Spanish',
            dateFormat: 'dmy',
            useUTC: false
        }
    };

    const currentPool = new sql.ConnectionPool(config);
    await currentPool.connect();
    
    try {
      const pairs = getYearMonthPairs(startDate, endDate);
      const allResults: any[] = [];

      for (const pair of pairs) {
        const query = `EXEC spNETTiempos_ListaImputaciones @pUsured='MG01', @pAnio=${pair.year}, @pMes=${pair.month}, @pDia=NULL, @pOrder=' ORDER BY TC.Fecha DESC, CONVERT(char(5), TL.[Desde Hora], 108)', @pWhere=NULL`;
        console.log(`TCL ~ query:`, query)
        
        const result = await currentPool.request().query(query);
        allResults.push({
            year: pair.year,
            month: pair.month,
            data: result.recordset
        });
      }

      res.json({ success: true, results: allResults });
    } finally {
      await currentPool.close();
    }
  } catch (error: any) {
    console.error('Validation Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Sync Time Entries: classify entries as new or existing ---
interface TimeEntry {
  id: string;
  taskId: number;
  taskName: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM:SS
  endTime: string;     // HH:MM:SS
  duration: number;
  description?: string;
  synced: boolean;
}

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

  // --- Helper: extract unique year/month pairs from entries ---
  const getYearMonthPairs = (items: any[]) => {
    const seen = new Set<string>();
    const pairs: { year: number; month: number }[] = [];
    for (const entry of items) {
      const [y, m] = entry.date.split('-');
      const key = `${y}-${m}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ year: parseInt(y, 10), month: parseInt(m, 10) });
      }
    }
    return pairs;
  };

  // --- Helper: normalise a DB Fecha to YYYY-MM-DD string ---
  const fechaToYMD = (fecha: any): string => {
    if (!fecha) return '';
    if (typeof fecha === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) return fecha.slice(0, 10);
      const parts = fecha.split('/');
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
      return fecha;
    }
    const d = new Date(fecha);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${yyyy}-${mm}-${dd}`;
    }
    return String(fecha);
  };

  // --- Helper: truncate HH:MM:SS → HH:MM ---
  const toHHMM = (time: string) => time.slice(0, 5);

  const dbConfig: sql.config = {
    server,
    database,
    user: username,
    password,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      language: 'Spanish',
      dateFormat: 'dmy',
      useUTC: false
    }
  };

  const pool = new sql.ConnectionPool(dbConfig);
  let poolConnected = false;

  try {
    await pool.connect();
    poolConnected = true;

    const pairs = getYearMonthPairs(entries);
    const allDbRows: any[] = [];

    for (const pair of pairs) {
      const query = `SET LANGUAGE Spanish;\nSET DATEFORMAT dmy;\nEXEC spNETTiempos_ListaImputaciones @pUsured='${usuario}', @pAnio=${pair.year}, @pMes=${pair.month}, @pDia=NULL, @pOrder=' ORDER BY TC.Fecha DESC, CONVERT(char(5), TL.[Desde Hora], 108)', @pWhere=NULL`;
      const result = await pool.request().query(query);
      allDbRows.push(...(result.recordset || []));
    }

    // --- Classify each entry ---
    const alreadyExists: any[] = [];
    const willInsert: any[] = [];

    for (const entry of entries) {
      const entryDate = entry.date;
      const entryStart = toHHMM(entry.startTime);
      const entryEnd = toHHMM(entry.endTime);

      const matched = allDbRows.some((row: any) => {
        const rowDate = fechaToYMD(row.Fecha);
        const rowStart = toHHMM(String(row.Desde));
        const rowEnd = toHHMM(String(row.Hasta));
        const rowProcess = row.IdProceso ?? row.Proceso;

        return (
          rowDate === entryDate &&
          rowStart === entryStart &&
          rowEnd === entryEnd &&
          rowProcess === entry.taskId
        );
      });

      if (matched) {
        alreadyExists.push(entry);
      } else {
        willInsert.push(entry);
      }
    }

    res.json({ success: true, willInsert, alreadyExists });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (poolConnected) {
      await pool.close();
    }
  }
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

  const dbConfig: sql.config = {
    server,
    database,
    user: username,
    password,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      language: 'Spanish',
      dateFormat: 'dmy',
      useUTC: false
    }
  };

  const pool = new sql.ConnectionPool(dbConfig);
  let poolConnected = false;

  try {
    await pool.connect();
    poolConnected = true;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const results: Array<{
      entryId: string;
      success: boolean;
      serverId?: number;
      error?: string;
    }> = [];

    // Session settings via transaction request
    const setupReq = transaction.request();
    await setupReq.query('SET LANGUAGE Spanish;\nSET DATEFORMAT dmy;');

    for (const entry of entries) {
      try {
        const req = transaction.request();
        const result = await req.query(
          `EXEC spNETTiempos_Alta @Usured='${entry.Usured.replace(/'/g, "''")}', @Fecha='${entry.Fecha}', @HoraDesde='${entry.HoraDesde}', @HoraHasta='${entry.HoraHasta}', @Minutos=${entry.Minutos}, @Proceso=${entry.Proceso}, @pTipoHora=${entry.pTipoHora ?? 11}${entry.Comentario ? `, @Comentario='${entry.Comentario.replace(/'/g, "''")}'` : ''}`
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

    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (poolConnected) {
      await pool.close();
    }
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

/**
 * Parámetros para el endpoint /api/projects-tree
 */
interface ProjectsTreeParams extends DbConnectionParams {
  codCli?: string;    // Código de cliente
  proyecto?: string; // Código del proyecto
  fecha?: string;   // Fecha en formato YYYY-MM-DD
  modo?: string;    // Modo de filtrado (1, 2, etc.)
}

/**
 * Datos del cliente (resultset 0)
 */
interface ClienteData {
  CodCli: number;
  Cliente: string;
  NomCliente: string;
}

/**
 * Datos del proyecto (resultset 1)
 */
interface ProyectoData {
  CodCli: number;
  Proyecto: number;
  NomProy: string;
  Cerrado: boolean;
  CMMI: boolean;
  EsCM: boolean;
  EsPET: boolean;
}

/**
 * Datos de disciplinas (resultset 2)
 */
interface DisciplinaData {
  Proyecto: number;
  IdDisciplina: number;
  Disciplina: string;
  SinDisciplina: boolean;
  Orden: number;
}

/**
 * Datos de fases (resultset 3)
 */
interface FaseData {
  Proyecto: number;
  Fase: number;
  Nombre: string;
  Cerrado: boolean;
  Disciplina: number;
  Orden: number;
}

/**
 * Datos de procesos (resultset 4)
 */
interface ProcesoData {
  Fase: number;
  Proceso: number;
  Nombre: string;
}

/**
 * Proceso en la jerarquía
 */
interface ProcesoNode {
  proceso: number;
  nombre: string;
}

/**
 * Fase en la jerarquía (contiene procesos)
 */
interface FaseNode {
  fase: number;
  nombre: string;
  cerrado: boolean;
  orden: number;
  procesos: ProcesoNode[];
}

/**
 * Disciplina en la jerarquía (contiene fases)
 */
interface DisciplinaNode {
  idDisciplina: number;
  nombre: string;
  sinDisciplina: boolean;
  orden: number;
  fases: FaseNode[];
}

/**
 * Estructura completa del árbol de proyectos (respuesta del endpoint)
 */
interface ProjectsTreeResponse {
  cliente: ClienteData;
  proyecto: ProyectoData;
  disciplinas: DisciplinaNode[];
}

/**
 * Transforma los 5 resultsets del SP a estructura jerárquica
 * @param results - Array de 5 recordsets del SP
 * @returns Estructura jerárquica de proyectos
 * 
 * Estructura de resultsets:
 * - results[0]: Cliente (CodCli, Cliente, NomCliente)
 * - results[1]: Proyecto (CodCli, Proyecto, NomProy, Cerrado, CMMI, EsCM, EsPET)
 * - results[2]: Disciplinas (Proyecto, IdDisciplina, Disciplina, SinDisciplina, Orden)
 * - results[3]: Fases (Proyecto, Fase, Nombre, Cerrado, Disciplina, Orden)
 * - results[4]: Procesos (Fase, Proceso, Nombre)
 */
function transformToTreeStructure(results: any[]): ProjectsTreeResponse {
  // Extraer los 5 resultsets con los índices correctos
  const clientes = (results[0] || []) as ClienteData[];
  const proyectos = (results[1] || []) as ProyectoData[];
  const disciplinasRaw = (results[2] || []) as DisciplinaData[];
  const fasesRaw = (results[3] || []) as FaseData[];
  const procesosRaw = (results[4] || []) as ProcesoData[];

  console.log(`TCL ~ transformToTreeStructure ~ clientes:`, clientes.length);
  console.log(`TCL ~ transformToTreeStructure ~ proyectos:`, proyectos.length);
  console.log(`TCL ~ transformToTreeStructure ~ disciplinas:`, disciplinasRaw.length);
  console.log(`TCL ~ transformToTreeStructure ~ fases:`, fasesRaw.length);
  console.log(`TCL ~ transformToTreeStructure ~ procesos:`, procesosRaw.length);

  // Obtener cliente y proyecto (típicamente hay solo uno)
  const cliente = clientes[0] || { CodCli: 0, Cliente: '', NomCliente: '' };
  const proyecto = proyectos[0] || { 
    CodCli: 0, 
    Proyecto: 0, 
    NomProy: '', 
    Cerrado: false, 
    CMMI: false, 
    EsCM: false, 
    EsPET: false 
  };

  // Crear mapa de disciplinas por idDisciplina
  const disciplinasMap = new Map<number, DisciplinaNode>();
  
  for (const disc of disciplinasRaw) {
    if (!disciplinasMap.has(disc.IdDisciplina)) {
      disciplinasMap.set(disc.IdDisciplina, {
        idDisciplina: disc.IdDisciplina,
        nombre: disc.Disciplina,
        sinDisciplina: disc.SinDisciplina,
        orden: disc.Orden,
        fases: []
      });
    }
  }

  // Crear mapa de fases por fase
  const fasesMap = new Map<number, FaseNode>();
  
  for (const fase of fasesRaw) {
    fasesMap.set(fase.Fase, {
      fase: fase.Fase,
      nombre: fase.Nombre,
      cerrado: fase.Cerrado,
      orden: fase.Orden,
      procesos: []
    });
  }

  // Asignar fases a disciplinas (por Disciplina de la fase = IdDisciplina)
  for (const fase of fasesRaw) {
    const faseNode = fasesMap.get(fase.Fase);
    const disciplinaNode = disciplinasMap.get(fase.Disciplina);
    if (faseNode && disciplinaNode) {
      disciplinaNode.fases.push(faseNode);
    }
  }

  // Asignar procesos a fases (por Fase del proceso)
  for (const proc of procesosRaw) {
    const faseNode = fasesMap.get(proc.Fase);
    if (faseNode) {
      faseNode.procesos.push({
        proceso: proc.Proceso,
        nombre: proc.Nombre
      });
    }
  }

  // Convertir mapa de disciplinas a array, ordenado por orden
  const disciplinas = Array.from(disciplinasMap.values()).sort((a, b) => a.orden - b.orden);

  return {
    cliente,
    proyecto,
    disciplinas
  };
}

// ============================================
// Phase 2: Endpoint /api/projects-tree
// ============================================

app.post('/api/projects-tree', async (req: Request, res: Response) => {
  const { codCli, proyecto, fecha, modo, server, database, username, password } = req.body;
  console.log(`TCL ~ req.body:`, req.body)

  // Parámetros de conexión desde body o usar valores por defecto
  const dbServer = server || process.env.DB_SERVER || 'localhost';
  const dbDatabase = database || process.env.DB_NAME || 'Tiempos';
  const dbUser = username || process.env.DB_USER || '';
  const dbPassword = password || process.env.DB_PASSWORD || '';

  try {
    const config: sql.config = {
        server,
        database,
        user: username,
        password,
        options: {
            encrypt: true,
            trustServerCertificate: true,
            language: 'Spanish',
            dateFormat: 'dmy',
            useUTC: false
        }
    };

    const currentPool = new sql.ConnectionPool(config);
    await currentPool.connect();
    
    try {
      // Preparar parámetros para el SP
      const pCodCli = codCli || null;
      const pProyecto = proyecto || null;
      const pFecha = fecha || new Date().toISOString().split('T')[0];
      const pModo = modo ? parseInt(modo, 10) : 1;

      // Convertir fecha a formato YYYYMMDD (inambiguo en cualquier idioma de sesión SQL Server)
      let pFechaYYYYMMDD: string | null = null;
      if (pFecha) {
        // Normalizar separadores a guion
        const normalizedFecha = pFecha.replace(/\//g, '-');
        const parts = normalizedFecha.split('-');
        
        if (parts.length === 3) {
          const firstPart = parseInt(parts[0], 10);
          const secondPart = parseInt(parts[1], 10);
          const thirdPart = parseInt(parts[2], 10);
          
          let year: string, month: string, day: string;
          
          if (firstPart > 99) {
            // Formato YYYY-MM-DD
            year = parts[0]; month = parts[1]; day = parts[2];
          } else if (secondPart > 12) {
            // Formato MM/DD/YYYY
            year = parts[2]; month = parts[0]; day = parts[1];
          } else if (thirdPart > 99) {
            // Formato DD/MM/YYYY
            year = parts[2]; month = parts[1]; day = parts[0];
          } else {
            // Ambiguo - asumir YYYY-MM-DD (el más común desde JS)
            year = parts[0]; month = parts[1]; day = parts[2];
          }
          
          pFechaYYYYMMDD = `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
        }
      }

      // Llamar al SP con los 5 resultados
      // YYYYMMDD es inambiguo - no necesita SET LANGUAGE ni SET DATEFORMAT
      const query = `
        EXEC spNETProyectos_TreeProyectos 
          @pClientes = ${pCodCli ? `'${pCodCli.toString().replace(/'/g, "''")}'` : 'NULL'}, 
          @pProyectos = ${pProyecto ? `'${pProyecto.toString().replace(/'/g, "''")}'` : 'NULL'}, 
          @pFecha = ${pFechaYYYYMMDD ? `'${pFechaYYYYMMDD}'` : 'NULL'}, 
          @pModo = ${pModo};
      `;
      
      console.log(`TCL ~ /api/projects-tree ejecutando:`, query);
      
      const result = await currentPool.request().query(query);
      console.log(`TCL ~ result:`, result)
      
      // mssql retorna varios recordsets cuando el SP ejecuta múltiples SELECTs
      // result.recordsets puede ser un array o un objeto con propiedades numéricas
      const rawRecordsets = result.recordsets;
      const recordsets: any[] = Array.isArray(rawRecordsets) 
        ? rawRecordsets 
        : Object.values(rawRecordsets || {});
      console.log(`TCL ~ /api/projects-tree recordsets count:`, recordsets.length);
      
      // Transformar los resultados a estructura jerárquica
      const treeData = transformToTreeStructure(recordsets);
      console.log(`TCL ~ treeData:`, treeData)
      
      res.json({
        success: true,
        data: treeData
      });
    } finally {
      await currentPool.close();
    }
  } catch (error: any) {
    console.error('Projects Tree Error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
