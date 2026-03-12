import express from 'express';
import cors from 'cors';
import sql from 'mssql';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connection pool configuration
let pool = null;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Test connection endpoint
app.post('/api/test-connection', async (req, res) => {
  const { server, database, username, password } = req.body;
  
  console.log(`TCL ~ process.env.CLOCKIFY_WORKSPACE_ID:`, process.env.CLOCKIFY_WORKSPACE_ID)
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
        console.log(`TCL ~ userData:`, userData)
        
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
        // const { startDate, endDate, userId } = req.query;
        const { startDate, endDate, userId } = {startDate : '2026-03-01T00:00:00Z', endDate : '2026-03-12T00:00:00Z'};
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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
