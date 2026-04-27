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
        trustServerCertificate: true
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
            trustServerCertificate: true
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
                error: 'CLOCKIFY_WORKSPACE_ID inválido en .env'
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
                error: errorData.message || `Error ${response.status} de Clockify`
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
            trustServerCertificate: true
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
        options: { encrypt: true, trustServerCertificate: true }
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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
