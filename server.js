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

    // Create connection pool if not exists
    if (!pool) {
      pool = new sql.ConnectionPool(config);
      await pool.connect();
    } else if (!pool.connected) {
      await pool.connect();
    }

    const results = [];
    let totalRowsAffected = 0;

    for (const statement of sqlStatements) {
      const result = await pool.request().query(statement);
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
  } catch (error) {
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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
