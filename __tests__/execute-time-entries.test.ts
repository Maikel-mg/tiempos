import { describe, it, expect, vi, beforeEach } from 'vitest';
import http from 'http';

// --- Mock mssql BEFORE importing the app ---
const mockQuery = vi.fn();
const mockClose = vi.fn();
const mockConnect = vi.fn();
const mockRequest = vi.fn().mockReturnValue({ query: mockQuery });
const mockTransactionBegin = vi.fn();
const mockTransactionCommit = vi.fn();
const mockTransactionRollback = vi.fn();
const mockTransactionRequest = vi.fn().mockReturnValue({ query: mockQuery });

vi.mock('mssql', () => ({
    default: {
        ConnectionPool: vi.fn().mockImplementation(function () {
            return {
                connect: mockConnect,
                close: mockClose,
                request: mockRequest,
            };
        }),
        Transaction: vi.fn().mockImplementation(function () {
            return {
                begin: mockTransactionBegin,
                commit: mockTransactionCommit,
                rollback: mockTransactionRollback,
                request: mockTransactionRequest,
            };
        }),
    },
}));

import app from '../server';

// ---------------------------------------------------------------------------
// Helper — identical pattern to sync-time-entries.test.ts
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

function makeEntry(overrides: Partial<{
    entryId: string;
    Usured: string;
    Fecha: string;
    HoraDesde: string;
    HoraHasta: string;
    Minutos: number;
    Proceso: number;
    pTipoHora: number;
    Comentario: string;
}> = {}) {
    return {
        entryId: 'entry-1',
        Usured: 'MG01',
        Fecha: '20260115',
        HoraDesde: '09:00',
        HoraHasta: '10:00',
        Minutos: 60,
        Proceso: 100,
        pTipoHora: 11,
        Comentario: 'Test entry',
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/execute-time-entries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConnect.mockResolvedValue(undefined);
        mockClose.mockResolvedValue(undefined);
        mockQuery.mockResolvedValue({ recordset: [{ Id: 1 }] });
        mockTransactionBegin.mockResolvedValue(undefined);
        mockTransactionCommit.mockResolvedValue(undefined);
        mockTransactionRollback.mockResolvedValue(undefined);
    });

    // ===== 400 — Validation ================================================
    describe('400 validation', () => {
        it('returns 400 when entries is missing', async () => {
            const res = await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 when entries is not an array', async () => {
            const res = await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries: 'not-an-array',
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 when server is missing', async () => {
            const res = await callEndpoint('POST', '/api/execute-time-entries', {
                database: 'test-db',
                username: 'test-user',
                password: 'test-pass',
                entries: [makeEntry()],
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 when database is missing', async () => {
            const res = await callEndpoint('POST', '/api/execute-time-entries', {
                server: 'test-server',
                username: 'test-user',
                password: 'test-pass',
                entries: [makeEntry()],
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    // ===== 200 — Happy path ================================================
    describe('happy path', () => {
        it('returns success with serverIds when all entries succeed', async () => {
            mockQuery
                .mockResolvedValueOnce({ recordset: [] }) // SET LANGUAGE + SET DATEFORMAT (single call)
                .mockResolvedValueOnce({ recordset: [{ Id: 42 }] }) // SP entry 1
                .mockResolvedValueOnce({ recordset: [{ Id: 43 }] }); // SP entry 2

            const entries = [makeEntry({ entryId: 'e1' }), makeEntry({ entryId: 'e2', Proceso: 200 })];

            const res = await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries,
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.results).toHaveLength(2);
            expect(res.body.results[0]).toEqual({ entryId: 'e1', success: true, serverId: 42 });
            expect(res.body.results[1]).toEqual({ entryId: 'e2', success: true, serverId: 43 });
        });
    });

    // ===== Partial failure ================================================
    describe('partial failure', () => {
        it('returns mixed results when some entries fail', async () => {
            mockTransactionRequest
                .mockReturnValueOnce({ query: mockQuery.mockResolvedValueOnce({ recordset: [] }) }) // setup
                .mockReturnValueOnce({ query: mockQuery.mockResolvedValueOnce({ recordset: [{ Id: 1 }] }) }) // entry 1 ok
                .mockReturnValueOnce({ query: mockQuery.mockRejectedValueOnce(new Error('Duplicate key')) }) // entry 2 fail
                .mockReturnValueOnce({ query: mockQuery.mockResolvedValueOnce({ recordset: [{ Id: 3 }] }) }); // entry 3 ok

            const entries = [
                makeEntry({ entryId: 'e1' }),
                makeEntry({ entryId: 'e2' }),
                makeEntry({ entryId: 'e3' }),
            ];

            const res = await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries,
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.results).toHaveLength(3);
            expect(res.body.results[0].success).toBe(true);
            expect(res.body.results[1].success).toBe(false);
            expect(res.body.results[1].error).toBeDefined();
            expect(res.body.results[2].success).toBe(true);
        });
    });

    // ===== All entries fail ================================================
    describe('all entries fail', () => {
        it('returns all errors when every SP call fails', async () => {
            mockQuery.mockResolvedValueOnce({ recordset: [] }); // setup succeeds
            mockQuery.mockRejectedValue(new Error('SP error')); // SP calls fail

            const entries = [makeEntry({ entryId: 'e1' }), makeEntry({ entryId: 'e2' })];

            const res = await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries,
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.results).toHaveLength(2);
            expect(res.body.results.every((r: any) => r.success === false)).toBe(true);
        });
    });

    // ===== 500 — DB connection error ========================================
    describe('DB connection error', () => {
        it('returns 500 when pool.connect() rejects', async () => {
            mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));

            const res = await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries: [makeEntry()],
            });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
        });
    });

    // ===== Transaction behaviour ============================================
    describe('transaction behaviour', () => {
        it('calls BEGIN TRAN before inserts', async () => {
            await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries: [makeEntry()],
            });

            expect(mockTransactionBegin).toHaveBeenCalled();
        });

        it('calls COMMIT after all inserts', async () => {
            await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries: [makeEntry()],
            });

            expect(mockTransactionCommit).toHaveBeenCalled();
        });
    });

    // ===== SQL session settings =============================================
    describe('SQL session settings', () => {
        it('uses SET LANGUAGE Spanish', async () => {
            await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries: [makeEntry()],
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SET LANGUAGE Spanish')
            );
        });

        it('uses SET DATEFORMAT dmy', async () => {
            await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries: [makeEntry()],
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SET DATEFORMAT dmy')
            );
        });
    });

    // ===== SP call ==========================================================
    describe('SP call', () => {
        it('calls spNETTiempos_Alta for each entry', async () => {
            const entries = [makeEntry({ entryId: 'e1' }), makeEntry({ entryId: 'e2', Proceso: 200 })];

            await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries,
            });

            // 2 SET statements + 2 SP calls
            const spCalls = mockQuery.mock.calls.filter((c: any) =>
                c[0].includes('spNETTiempos_Alta')
            );
            expect(spCalls).toHaveLength(2);
        });

        it('passes correct parameters to spNETTiempos_Alta', async () => {
            await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries: [makeEntry({ entryId: 'e1', Usured: 'JP01', Fecha: '20260115', Proceso: 100 })],
            });

            const spCall = mockQuery.mock.calls.find((c: any) =>
                c[0].includes('spNETTiempos_Alta')
            );
            expect(spCall).toBeDefined();
            expect(spCall[0]).toContain("@Usured='JP01'");
            expect(spCall[0]).toContain("@Fecha='20260115'");
            expect(spCall[0]).toContain('@Proceso=100');
        });
    });

    // ===== Pool closed on error =============================================
    describe('pool cleanup', () => {
        it('closes the pool even on error', async () => {
            mockQuery.mockRejectedValue(new Error('boom'));

            await callEndpoint('POST', '/api/execute-time-entries', {
                ...VALID_DB,
                entries: [makeEntry()],
            });

            expect(mockClose).toHaveBeenCalled();
        });
    });
});
