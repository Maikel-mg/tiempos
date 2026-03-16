import express from 'express';
import cors from 'cors';
import sql from 'mssql';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Test connection endpoint
app.post('/api/test-connection', async (req, res) => {
  const { server, database, username, password } = req.body;
  
  try {
    const testConfig = {
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
  } catch (error) {
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

// Execute SQL endpoint
app.post('/api/execute-sql', async (req, res) => {
  const { server, database, username, password, sqlStatements } = req.body;

  try {
    const config = {
        server,
        database,
        user: username,
        password,
        options: {
            encrypt: true,
            trustServerCertificate: true
        }
    };

    // Close old pool if config changed (simplified for now: always reconnect or check config)
    // For this specialized CLI tool, we'll create a new pool per batch execution to ensure clean state
    const currentPool = new sql.ConnectionPool(config);
    await currentPool.connect();
    
    try {
      const results = [];
      let totalRowsAffected = 0;

      console.log(`Ejecutando ${sqlStatements.length} sentencias SQL...`);
      if (sqlStatements.length > 0) {
        console.log('Primera sentencia:', sqlStatements[0]);
      }

      for (const statement of sqlStatements) {
        const result = await currentPool.request().query(statement);
        results.push({
          success: true,
          rowsAffected: result.rowsAffected[0] || 0
        });
        totalRowsAffected += result.rowsAffected[0] || 0;
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
  } catch (error) {
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

// Endpoint para obtener time entries

// Helper para construir URL con query params
const buildUrl = (baseUrl, params) => {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });
    return url.toString();
};

app.get('/api/get-workspace-id', async (req, res) => {
  try {
      console.log(`TCL ~ process.env.CLOCKIFY_API_KEY:`, process.env.CLOCKIFY_API_KEY)
        const response = await fetch('https://api.clockify.me/api/v1/user', {
            headers: { 'X-Api-Key': process.env.CLOCKIFY_API_KEY }
        });
        
        if (!response.ok) throw new Error('API Key inválida o error de conexión');
        
        const userData = await response.json();
        
        res.json({
            success: true,
            message: 'Copia el ID del workspace que quieras usar',
            workspaces: userData.workspaces.map(w => ({
                id: w.id,
                name: w.name,
                idLength: w.id.length // Debería ser 24
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener time entries
app.get('/api/time-entries', async (req, res) => {
    try {
        const { startDate, endDate, userId } = req.query;
        console.log(`TCL ~ endDate:`, endDate)
        console.log(`TCL ~ startDate:`, startDate)
        
        // Validar startDate
        if (!startDate) {
            return res.status(400).json({ 
                error: 'El parámetro startDate es requerido (formato: YYYY-MM-DD)' 
            });
        }

        // Parámetros para Clockify API
        const apiParams = {
            start: startDate,
            end: endDate || new Date().toISOString().split('T')[0],
            hydrate: 'true'
        };

        if (userId) {
            apiParams.userId = userId;
        }
        

        // Construir URL completa
        const targetUser = userId || 'me';
        const url = buildUrl(
            `https://api.clockify.me/api/v1/workspaces/${process.env.CLOCKIFY_WORKSPACE_ID}/user/${process.env.CLOCKIFY_USER_ID}/time-entries`,
            apiParams
        );

        // Petición con fetch nativo
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Api-Key': process.env.CLOCKIFY_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        // Manejar errores HTTP
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Responder al cliente
        res.json({
            success: true,
            count: Array.isArray(data) ? data.length : 0,
            data: data
        });

    } catch (error) {
        console.error('Error al obtener time entries:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de Clockify',
            details: error.message
        });
    }
});

// POST /api/clockify/report
app.post('/api/clockify/report', async (req, res) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
        const { startDate, endDate } = req.body;
         let { onlyMe } = req.body;
        
        // 2. Forzar valor por defecto si es undefined o null
        if (onlyMe === undefined || onlyMe === null) {
            onlyMe = true;
        }
        console.log(`TCL ~ endDate :`, endDate)
        console.log(`TCL ~ startDate:`, startDate)

        // Validación de fechas
        // const isValidDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
        
        // if (!startDate || !isValidDate(startDate)) {
        //     return res.status(400).json({
        //         success: false,
        //         error: 'startDate requerido en formato YYYY-MM-DD'
        //     });
        // }

        // if (endDate && !isValidDate(endDate)) {
        //     return res.status(400).json({
        //         success: false,
        //         error: 'endDate inválido. Use formato YYYY-MM-DD'
        //     });
        // }

        const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID?.trim();
        if (!workspaceId || !/^[0-9a-f]{24}$/i.test(workspaceId)) {
            return res.status(500).json({
                success: false,
                error: 'CLOCKIFY_WORKSPACE_ID inválido en .env'
            });
        }
        
        // 3. 🔑 OBTENER TU USER ID (necesario para Reports API)
        const userResponse = await fetch('https://api.clockify.me/api/v1/user', {
            headers: { 'X-Api-Key': process.env.CLOCKIFY_API_KEY }
        });

        if (!userResponse.ok) {
            throw new Error('No se pudo obtener información del usuario de Clockify');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        if (!userId) {
            throw new Error('No se pudo obtener el User ID de Clockify');
        }

        // 4. URL CORRECTA para Reports API
        const url = `https://reports.api.clockify.me/v1/workspaces/${workspaceId}/reports/detailed`;

        // 5. ✅ Payload con userIds (filtro obligatorio)
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
                // sortOrder: "DESCENDING"
            } // ← FILTRO OBLIGATORIO CON TU USER ID
        };

        console.log('📊 Enviando reporte para usuario:', userId);



        // Petición con fetch nativo
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Api-Key': process.env.CLOCKIFY_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        // console.log(`TCL ~ response:`, response.json())

// // 🔍 DEBUG TOTAL - ver la respuesta RAW completa
// const rawText = await response.text();
// console.log('📥 Status:', response.status);
// console.log('📥 Raw response:', rawText);

// // Luego parsear
// const json = JSON.parse(rawText);
// console.log('📥 Keys en data:', Object.keys(json));
// console.log('📥 data completa:', JSON.stringify(json, null, 2));

        clearTimeout(timeout);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                success: false,
                error: errorData.message || `Error ${response.status} de Clockify`
            });
        }

        const data = await response.json();
        console.log(`TCL ~ data:`, data.timeentries)

        // Respuesta limpia
        res.json({
            success: true,
            count: data.timeentries?.length || 0,
            data: data.timeentries || []
        });

    } catch (error) {
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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
