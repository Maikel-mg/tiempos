"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mssql_1 = __importDefault(require("mssql"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/api/health', (_req, res) => {
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
        const testPool = new mssql_1.default.ConnectionPool(testConfig);
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
    }
    catch (error) {
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
        const currentPool = new mssql_1.default.ConnectionPool(config);
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
        }
        finally {
            await currentPool.close();
        }
    }
    catch (error) {
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
const buildUrl = (baseUrl, params) => {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });
    return url.toString();
};
app.get('/api/get-workspace-id', async (_req, res) => {
    try {
        const apiKey = process.env.CLOCKIFY_API_KEY;
        if (!apiKey)
            throw new Error('CLOCKIFY_API_KEY no configurado');
        const response = await fetch('https://api.clockify.me/api/v1/user', {
            headers: { 'X-Api-Key': apiKey }
        });
        if (!response.ok)
            throw new Error('API Key inválida o error de conexión');
        const userData = await response.json();
        res.json({
            success: true,
            message: 'Copia el ID del workspace que quieras usar',
            workspaces: userData.workspaces.map((w) => ({
                id: w.id,
                name: w.name,
                idLength: w.id.length
            }))
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Endpoint para obtener time entries
app.get('/api/time-entries', async (req, res) => {
    try {
        const { startDate, endDate, userId } = req.query;
        if (!startDate) {
            return res.status(400).json({
                error: 'El parámetro startDate es requerido (formato: YYYY-MM-DD)'
            });
        }
        const apiKey = process.env.CLOCKIFY_API_KEY;
        if (!apiKey)
            throw new Error('CLOCKIFY_API_KEY no configurado');
        const apiParams = {
            start: startDate,
            end: endDate || new Date().toISOString().split('T')[0],
            hydrate: 'true'
        };
        const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID;
        const envUserId = process.env.CLOCKIFY_USER_ID;
        const url = buildUrl(`https://api.clockify.me/api/v1/workspaces/${workspaceId}/user/${envUserId}/time-entries`, apiParams);
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
    }
    catch (error) {
        console.error('Error al obtener time entries:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de Clockify',
            details: error.message
        });
    }
});
app.post('/api/clockify/report', async (req, res) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
        const { startDate, endDate } = req.body;
        const apiKey = process.env.CLOCKIFY_API_KEY;
        if (!apiKey)
            throw new Error('CLOCKIFY_API_KEY no configurado');
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
    }
    catch (error) {
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
