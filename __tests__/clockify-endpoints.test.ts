import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import app from '../server';

// Mock fetch globally BEFORE importing the app
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to simulate HTTP requests via Express app
function callEndpoint(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: any
): Promise<{ status: number; body: any }> {
    return new Promise((resolve) => {
        const server = app.listen(0, () => {
            const addr = server.address();
            if (!addr || typeof addr === 'string') {
                server.close();
                resolve({ status: 500, body: { error: 'Server failed' } });
                return;
            }

            const testData = JSON.stringify(body);
            const req = http.request(
                {
                    hostname: 'localhost',
                    port: addr.port,
                    path,
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': testData ? Buffer.byteLength(testData) : 0
                    }
                },
                (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        server.close();
                        try {
                            resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
                        } catch {
                            resolve({ status: res.statusCode || 500, body: data });
                        }
                    });
                }
            );

            req.on('error', (err) => {
                server.close();
                resolve({ status: 500, body: { error: err.message } });
            });

            if (testData) req.write(testData);
            req.end();
        });
    });
}

describe('Clockify Endpoints', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.CLOCKIFY_API_KEY = 'test-api-key';
        process.env.CLOCKIFY_WORKSPACE_ID = '507f1f77bcf86cd799439011';
        process.env.CLOCKIFY_USER_ID = '507f1f77bcf86cd799439012';
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('POST /api/clockify/create-task', () => {
        it('should return 400 when projectId is missing', async () => {
            const res = await callEndpoint('POST', '/api/clockify/create-task', {
                name: 'Test Task'
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('projectId');
        });

        it('should return 400 when name is missing', async () => {
            const res = await callEndpoint('POST', '/api/clockify/create-task', {
                projectId: '507f1f77bcf86cd799439011'
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('name');
        });

        it('should return 400 when both fields are missing', async () => {
            const res = await callEndpoint('POST', '/api/clockify/create-task', {});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 500 when CLOCKIFY_API_KEY is not set', async () => {
            delete process.env.CLOCKIFY_API_KEY;

            const res = await callEndpoint('POST', '/api/clockify/create-task', {
                projectId: '507f1f77bcf86cd799439011',
                name: 'Test Task'
            });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
        });

        it('should return 500 when CLOCKIFY_WORKSPACE_ID is invalid', async () => {
            process.env.CLOCKIFY_WORKSPACE_ID = 'invalid-id';

            const res = await callEndpoint('POST', '/api/clockify/create-task', {
                projectId: '507f1f77bcf86cd799439011',
                name: 'Test Task'
            });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('CLOCKIFY_WORKSPACE_ID');
        });

        it('should create a task successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 'task-123', name: 'Test Task' })
            });

            const res = await callEndpoint('POST', '/api/clockify/create-task', {
                projectId: '507f1f77bcf86cd799439011',
                name: 'Test Task'
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.taskId).toBe('task-123');
            expect(res.body.message).toBe('Tarea creada');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.clockify.me/api/v1/workspaces/507f1f77bcf86cd799439011/projects/507f1f77bcf86cd799439011/tasks',
                {
                    method: 'POST',
                    headers: {
                        'X-Api-Key': 'test-api-key',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: 'Test Task' })
                }
            );
        });

        it('should handle Clockify 401 error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ message: 'Unauthorized' })
            });

            const res = await callEndpoint('POST', '/api/clockify/create-task', {
                projectId: '507f1f77bcf86cd799439011',
                name: 'Test Task'
            });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('API key inválida');
        });

        it('should handle Clockify 403 error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => ({ message: 'Forbidden' })
            });

            const res = await callEndpoint('POST', '/api/clockify/create-task', {
                projectId: '507f1f77bcf86cd799439011',
                name: 'Test Task'
            });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('permisos');
        });

        it('should handle Clockify 404 error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({ message: 'Not Found' })
            });

            const res = await callEndpoint('POST', '/api/clockify/create-task', {
                projectId: '507f1f77bcf86cd799439011',
                name: 'Test Task'
            });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Proyecto no encontrado');
        });

        it('should handle Clockify 429 error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                json: async () => ({ message: 'Rate Limited' })
            });

            const res = await callEndpoint('POST', '/api/clockify/create-task', {
                projectId: '507f1f77bcf86cd799439011',
                name: 'Test Task'
            });

            expect(res.status).toBe(429);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Límite de peticiones');
        });
    });

    describe('PUT /api/clockify/bulk-update-entries', () => {
        it('should return 400 when entries is missing', async () => {
            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                taskId: 'task-123'
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('entries');
        });

        it('should return 400 when entries is empty array', async () => {
            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries: [],
                taskId: 'task-123'
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('entries');
        });

        it('should return 400 when entries is not an array', async () => {
            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries: 'not-an-array',
                taskId: 'task-123'
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('entries');
        });

        it('should return 400 when taskId is missing', async () => {
            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries: [{ id: 'entry-1', start: '2026-05-29T12:15:00Z', end: '2026-05-29T13:15:00Z', projectId: 'proj-1' }, { id: 'entry-2', start: '2026-05-29T13:00:00Z', end: '2026-05-29T14:00:00Z', projectId: 'proj-1' }]
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('taskId');
        });

        it('should return 500 when CLOCKIFY_API_KEY is not set', async () => {
            delete process.env.CLOCKIFY_API_KEY;

            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries: [{ id: 'entry-1', start: '2026-05-29T12:15:00Z', end: '2026-05-29T13:15:00Z', projectId: 'proj-1' }],
                taskId: 'task-123'
            });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
        });

        it('should return 500 when CLOCKIFY_WORKSPACE_ID is invalid', async () => {
            process.env.CLOCKIFY_WORKSPACE_ID = 'invalid-id';

            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries: [{ id: 'entry-1', start: '2026-05-29T12:15:00Z', end: '2026-05-29T13:15:00Z', projectId: 'proj-1' }],
                taskId: 'task-123'
            });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('CLOCKIFY_WORKSPACE_ID');
        });

        it('should return 500 when CLOCKIFY_USER_ID is invalid', async () => {
            process.env.CLOCKIFY_USER_ID = 'invalid-id';

            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries: [{ id: 'entry-1', start: '2026-05-29T12:15:00Z', end: '2026-05-29T13:15:00Z', projectId: 'proj-1' }],
                taskId: 'task-123'
            });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('CLOCKIFY_USER_ID');
        });

        it('should update entries successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            });

            const entries = [
                { id: 'entry-1', start: '2026-05-29T12:15:00Z', end: '2026-05-29T13:15:00Z', projectId: 'proj-1' },
                { id: 'entry-2', start: '2026-05-29T13:00:00Z', end: '2026-05-29T14:00:00Z', projectId: 'proj-1' },
                { id: 'entry-3', start: '2026-05-29T14:30:00Z', end: '2026-05-29T15:30:00Z', projectId: 'proj-1' },
            ];
            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries,
                taskId: 'task-123'
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.updated).toBe(3);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.clockify.me/api/v1/workspaces/507f1f77bcf86cd799439011/user/507f1f77bcf86cd799439012/time-entries',
                {
                    method: 'PUT',
                    headers: {
                        'X-Api-Key': 'test-api-key',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify([
                        { id: 'entry-1', start: '2026-05-29T12:15:00Z', end: '2026-05-29T13:15:00Z', taskId: 'task-123', projectId: 'proj-1' },
                        { id: 'entry-2', start: '2026-05-29T13:00:00Z', end: '2026-05-29T14:00:00Z', taskId: 'task-123', projectId: 'proj-1' },
                        { id: 'entry-3', start: '2026-05-29T14:30:00Z', end: '2026-05-29T15:30:00Z', taskId: 'task-123', projectId: 'proj-1' }
                    ])
                }
            );
        });

        it('should handle single entry update', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            });

            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries: [{ id: 'entry-1', start: '2026-05-29T12:15:00Z', end: '2026-05-29T13:15:00Z', projectId: 'proj-1' }],
                taskId: 'task-123'
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.updated).toBe(1);
        });

        it('should handle Clockify 401 error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ message: 'Unauthorized' })
            });

            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries: [{ id: 'entry-1', start: '2026-05-29T12:15:00Z', end: '2026-05-29T13:15:00Z', projectId: 'proj-1' }],
                taskId: 'task-123'
            });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('API key inválida');
        });

        it('should handle Clockify 403 error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => ({ message: 'Forbidden' })
            });

            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries: [{ id: 'entry-1', start: '2026-05-29T12:15:00Z', end: '2026-05-29T13:15:00Z', projectId: 'proj-1' }],
                taskId: 'task-123'
            });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('permisos');
        });

        it('should handle Clockify 404 error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({ message: 'Not Found' })
            });

            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries: [{ id: 'entry-1', start: '2026-05-29T12:15:00Z', end: '2026-05-29T13:15:00Z', projectId: 'proj-1' }],
                taskId: 'task-123'
            });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('entradas o la tarea no fueron encontradas');
        });

        it('should handle Clockify 429 error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                json: async () => ({ message: 'Rate Limited' })
            });

            const res = await callEndpoint('PUT', '/api/clockify/bulk-update-entries', {
                entries: [{ id: 'entry-1', start: '2026-05-29T12:15:00Z', end: '2026-05-29T13:15:00Z', projectId: 'proj-1' }],
                taskId: 'task-123'
            });

            expect(res.status).toBe(429);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Límite de peticiones');
        });
    });
});
