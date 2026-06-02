import { describe, it, expect, vi, beforeEach } from 'vitest';
import http from 'http';

// --- Mock mssql BEFORE importing the app ---
const mockQuery = vi.fn();
const mockClose = vi.fn();
const mockConnect = vi.fn();
const mockRequest = vi.fn().mockReturnValue({ query: mockQuery });

vi.mock('mssql', () => ({
    default: {
        ConnectionPool: vi.fn().mockImplementation(function () {
            return {
                connect: mockConnect,
                close: mockClose,
                request: mockRequest,
            };
        }),
    },
}));

import app from '../server';

// ---------------------------------------------------------------------------
// Helper — identical pattern to clockify-endpoints.test.ts
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Factories & constants
// ---------------------------------------------------------------------------
const VALID_DB = {
    server: 'test-server',
    database: 'test-db',
    username: 'test-user',
    password: 'test-pass',
};

type EntryOverrides = Partial<{
    id: string;
    taskId: number;
    taskName: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    description: string;
    synced: boolean;
}>;

function makeEntry(overrides: EntryOverrides = {}) {
    return {
        id: 'entry-1',
        taskId: 100,
        taskName: 'Desarrollo',
        date: '2026-01-15',
        startTime: '09:00:00',
        endTime: '10:00:00',
        duration: 3600,
        description: 'Test entry',
        synced: false,
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/sync-time-entries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConnect.mockResolvedValue(undefined);
        mockClose.mockResolvedValue(undefined);
        mockQuery.mockResolvedValue({ recordset: [] });
    });

    // ===== 400 — Validation ================================================
    describe('400 validation', () => {
        it('returns 400 when entries is missing', async () => {
            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                usuario: 'MG01',
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 when entries is not an array', async () => {
            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: 'not-an-array',
                usuario: 'MG01',
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 when server is missing', async () => {
            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                database: 'test-db',
                username: 'test-user',
                password: 'test-pass',
                entries: [makeEntry()],
                usuario: 'MG01',
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 when database is missing', async () => {
            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                server: 'test-server',
                username: 'test-user',
                password: 'test-pass',
                entries: [makeEntry()],
                usuario: 'MG01',
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    // ===== 200 — Empty entries =============================================
    describe('empty entries list', () => {
        it('returns empty willInsert and alreadyExists', async () => {
            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [],
                usuario: 'MG01',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.willInsert).toEqual([]);
            expect(res.body.alreadyExists).toEqual([]);
        });
    });

    // ===== 200 — All new ===================================================
    describe('all entries are new (no DB match)', () => {
        it('places every entry in willInsert', async () => {
            mockQuery.mockResolvedValue({ recordset: [] });

            const entries = [
                makeEntry({ id: 'e1', taskId: 100, date: '2026-01-15', startTime: '09:00:00', endTime: '10:00:00' }),
                makeEntry({ id: 'e2', taskId: 101, date: '2026-01-15', startTime: '10:00:00', endTime: '11:00:00' }),
            ];

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries,
                usuario: 'MG01',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.willInsert).toHaveLength(2);
            expect(res.body.alreadyExists).toHaveLength(0);
        });
    });

    // ===== 200 — All exist ==================================================
    describe('all entries already exist in BD', () => {
        it('places every entry in alreadyExists', async () => {
            mockQuery.mockResolvedValue({
                recordset: [
                    { Fecha: '2026-01-15', Desde: '09:00', Hasta: '10:00', IdProceso: 100 },
                    { Fecha: '2026-01-15', Desde: '10:00', Hasta: '11:00', IdProceso: 101 },
                ],
            });

            const entries = [
                makeEntry({ id: 'e1', taskId: 100, date: '2026-01-15', startTime: '09:00:00', endTime: '10:00:00' }),
                makeEntry({ id: 'e2', taskId: 101, date: '2026-01-15', startTime: '10:00:00', endTime: '11:00:00' }),
            ];

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries,
                usuario: 'MG01',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.willInsert).toHaveLength(0);
            expect(res.body.alreadyExists).toHaveLength(2);
        });
    });

    // ===== 200 — Mixed ======================================================
    describe('mix of new and existing entries', () => {
        it('splits correctly into both buckets', async () => {
            // DB only has the first entry
            mockQuery.mockResolvedValue({
                recordset: [
                    { Fecha: '2026-01-15', Desde: '09:00', Hasta: '10:00', IdProceso: 100 },
                ],
            });

            const entries = [
                makeEntry({ id: 'e1', taskId: 100, date: '2026-01-15', startTime: '09:00:00', endTime: '10:00:00' }),
                makeEntry({ id: 'e2', taskId: 101, date: '2026-01-15', startTime: '10:00:00', endTime: '11:00:00' }),
            ];

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries,
                usuario: 'MG01',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.willInsert).toHaveLength(1);
            expect(res.body.alreadyExists).toHaveLength(1);
            expect(res.body.willInsert[0].id).toBe('e2');
            expect(res.body.alreadyExists[0].id).toBe('e1');
        });
    });

    // ===== 500 — DB error ===================================================
    describe('DB connection error', () => {
        it('returns 500 when pool.connect() rejects', async () => {
            mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry()],
                usuario: 'MG01',
            });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBeDefined();
        });

        it('returns 500 when query() rejects', async () => {
            mockQuery.mockRejectedValue(new Error('Invalid object name'));

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry()],
                usuario: 'MG01',
            });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
        });
    });

    // ===== SQL behaviour ====================================================
    describe('SQL query behaviour', () => {
        it('calls SET LANGUAGE Spanish in the batch', async () => {
            await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry({ date: '2026-01-15' })],
                usuario: 'MG01',
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SET LANGUAGE Spanish')
            );
        });

        it('calls SET DATEFORMAT dmy in the batch', async () => {
            await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry({ date: '2026-01-15' })],
                usuario: 'MG01',
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SET DATEFORMAT dmy')
            );
        });

        it('invokes spNETTiempos_ListaImputaciones', async () => {
            await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry({ date: '2026-01-15' })],
                usuario: 'MG01',
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('spNETTiempos_ListaImputaciones')
            );
        });

        it('calls the SP once per affected month', async () => {
            const entries = [
                makeEntry({ id: 'e1', date: '2026-01-15' }),
                makeEntry({ id: 'e2', date: '2026-02-10' }),
            ];

            await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries,
                usuario: 'MG01',
            });

            // Two distinct months → two SP calls
            expect(mockQuery).toHaveBeenCalledTimes(2);
        });

        it('closes the pool even on error', async () => {
            mockQuery.mockRejectedValue(new Error('boom'));

            await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry()],
                usuario: 'MG01',
            });

            expect(mockClose).toHaveBeenCalled();
        });
    });

    // ===== Matching logic ===================================================
    describe('matching logic', () => {
        it('matches when date + start + end + process all match', async () => {
            mockQuery.mockResolvedValue({
                recordset: [
                    { Fecha: '2026-01-15', Desde: '09:00', Hasta: '10:00', IdProceso: 100 },
                ],
            });

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry({ taskId: 100, date: '2026-01-15', startTime: '09:00:00', endTime: '10:00:00' })],
                usuario: 'MG01',
            });

            expect(res.body.alreadyExists).toHaveLength(1);
            expect(res.body.willInsert).toHaveLength(0);
        });

        it('does NOT match when process ID differs', async () => {
            mockQuery.mockResolvedValue({
                recordset: [
                    { Fecha: '2026-01-15', Desde: '09:00', Hasta: '10:00', IdProceso: 100 },
                ],
            });

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry({ taskId: 999, date: '2026-01-15', startTime: '09:00:00', endTime: '10:00:00' })],
                usuario: 'MG01',
            });

            expect(res.body.alreadyExists).toHaveLength(0);
            expect(res.body.willInsert).toHaveLength(1);
        });

        it('does NOT match when start time differs by one minute', async () => {
            mockQuery.mockResolvedValue({
                recordset: [
                    { Fecha: '2026-01-15', Desde: '09:00', Hasta: '10:00', IdProceso: 100 },
                ],
            });

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry({ taskId: 100, date: '2026-01-15', startTime: '09:01:00', endTime: '10:00:00' })],
                usuario: 'MG01',
            });

            expect(res.body.alreadyExists).toHaveLength(0);
            expect(res.body.willInsert).toHaveLength(1);
        });

        it('does NOT match when end time differs', async () => {
            mockQuery.mockResolvedValue({
                recordset: [
                    { Fecha: '2026-01-15', Desde: '09:00', Hasta: '10:00', IdProceso: 100 },
                ],
            });

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry({ taskId: 100, date: '2026-01-15', startTime: '09:00:00', endTime: '10:01:00' })],
                usuario: 'MG01',
            });

            expect(res.body.alreadyExists).toHaveLength(0);
            expect(res.body.willInsert).toHaveLength(1);
        });

        it('does NOT match when date differs', async () => {
            mockQuery.mockResolvedValue({
                recordset: [
                    { Fecha: '2026-01-15', Desde: '09:00', Hasta: '10:00', IdProceso: 100 },
                ],
            });

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry({ taskId: 100, date: '2026-01-16', startTime: '09:00:00', endTime: '10:00:00' })],
                usuario: 'MG01',
            });

            expect(res.body.alreadyExists).toHaveLength(0);
            expect(res.body.willInsert).toHaveLength(1);
        });

        it('matches using Proceso column as fallback for IdProceso', async () => {
            mockQuery.mockResolvedValue({
                recordset: [
                    { Fecha: '2026-01-15', Desde: '09:00', Hasta: '10:00', Proceso: 100 },
                ],
            });

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry({ taskId: 100, date: '2026-01-15', startTime: '09:00:00', endTime: '10:00:00' })],
                usuario: 'MG01',
            });

            expect(res.body.alreadyExists).toHaveLength(1);
            expect(res.body.willInsert).toHaveLength(0);
        });
    });

    // ===== Multiple months ==================================================
    describe('entries spanning multiple months', () => {
        it('queries each month and merges results for classification', async () => {
            // First call → January, second call → February
            mockQuery
                .mockResolvedValueOnce({
                    recordset: [
                        { Fecha: '2026-01-15', Desde: '09:00', Hasta: '10:00', IdProceso: 100 },
                    ],
                })
                .mockResolvedValueOnce({
                    recordset: [
                        { Fecha: '2026-02-10', Desde: '14:00', Hasta: '15:00', IdProceso: 200 },
                    ],
                });

            const entries = [
                makeEntry({ id: 'e1', taskId: 100, date: '2026-01-15', startTime: '09:00:00', endTime: '10:00:00' }),
                makeEntry({ id: 'e2', taskId: 100, date: '2026-01-15', startTime: '11:00:00', endTime: '12:00:00' }),
                makeEntry({ id: 'e3', taskId: 200, date: '2026-02-10', startTime: '14:00:00', endTime: '15:00:00' }),
            ];

            const res = await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries,
                usuario: 'MG01',
            });

            expect(res.status).toBe(200);
            expect(res.body.alreadyExists).toHaveLength(2); // e1 + e3
            expect(res.body.willInsert).toHaveLength(1);    // e2
            expect(res.body.willInsert[0].id).toBe('e2');
        });
    });

    // ===== SP uses usuario param ============================================
    describe('usuario parameter', () => {
        it('passes usuario as @pUsured in the SP call', async () => {
            await callEndpoint('POST', '/api/sync-time-entries', {
                ...VALID_DB,
                entries: [makeEntry({ date: '2026-01-15' })],
                usuario: 'JP01',
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("@pUsured='JP01'")
            );
        });
    });
});
