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

function callEndpoint(method: 'POST', path: string, body?: any): Promise<{ status: number; body: any }> {
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
                        'Content-Length': testData ? Buffer.byteLength(testData) : 0,
                    },
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

const DB = { server: 'srv', database: 'db', username: 'u', password: 'p' };

const DTO = {
    nombre: 'IPKWEB. 2026-10. Errores',
    fechaInicio: '01/10/2026',
    fechaFin: '31/10/2026',
    fechaEstimacion: '01/10/2026',
    minutos: 480,
    usuario: 'MG01',
    fase: '39785',
};

/** Respuesta tal y como la devuelve el driver: SET LANGUAGE + SELECT del batch. */
function respuestaSp(fila: Record<string, unknown>) {
    return {
        rowsAffected: [1],
        recordset: [{ Idioma: 'Español' }],
        recordsets: [[{ Idioma: 'Español' }], [fila]],
    };
}

describe('POST /api/create-process', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // El batch empieza con SET LANGUAGE, que devuelve su propio recordset: la fila
    // del SP llega en el segundo y leer solo el primero la perdía.
    it('devuelve el id del SELECT del batch, no el recordset del SET LANGUAGE', async () => {
        mockQuery.mockResolvedValue(
            respuestaSp({ Proceso: 4242, Mensaje: '0|Tarea insertada correctamente.' })
        );

        const { status, body } = await callEndpoint('POST', '/api/create-process', { ...DB, dto: DTO });

        expect(status).toBe(200);
        expect(body).toMatchObject({ success: true, resultado: 4242 });
    });

    // El SP no devuelve el id: informa por @Resultado y hace ROLLBACK si algo falla.
    it('si el SP rechaza el alta, propaga su mensaje en vez de dar éxito', async () => {
        mockQuery.mockResolvedValue(
            respuestaSp({ Proceso: null, Mensaje: '1|El Responsable de facturación no es válido.' })
        );

        const { status, body } = await callEndpoint('POST', '/api/create-process', { ...DB, dto: DTO });

        expect(status).toBe(400);
        expect(body).toMatchObject({
            success: false,
            message: 'El Responsable de facturación no es válido.',
        });
    });

    it('si el alta fue bien pero no se pudo recuperar el id, responde resultado null', async () => {
        mockQuery.mockResolvedValue(
            respuestaSp({ Proceso: null, Mensaje: '0|Tarea insertada correctamente.' })
        );

        const { body } = await callEndpoint('POST', '/api/create-process', { ...DB, dto: DTO });

        expect(body).toMatchObject({ success: true, resultado: null });
    });

    it('manda las fechas en YYYYMMDD y descarta las que no existen', async () => {
        mockQuery.mockResolvedValue(
            respuestaSp({ Proceso: 1, Mensaje: '0|Tarea insertada correctamente.' })
        );

        await callEndpoint('POST', '/api/create-process', {
            ...DB,
            dto: { ...DTO, fechaFin: '31/11/2026' },
        });

        const sql = mockQuery.mock.calls[0][0] as string;
        expect(sql).toContain("@pFechaIniPrevista = '20261001'");
        expect(sql).toContain("@pFechaFinPrevista = ''");
    });

    // @pFase y @pNombre son parámetros del SP: usarlos fuera del EXEC no compila.
    it('recupera el id con el nombre y la fase literales', async () => {
        mockQuery.mockResolvedValue(
            respuestaSp({ Proceso: 1, Mensaje: '0|Tarea insertada correctamente.' })
        );

        await callEndpoint('POST', '/api/create-process', { ...DB, dto: DTO });

        const sql = mockQuery.mock.calls[0][0] as string;
        const selectFinal = sql.slice(sql.lastIndexOf('SELECT'));
        expect(selectFinal).toContain("Fase = '39785'");
        expect(selectFinal).toContain("Nombre = 'IPKWEB. 2026-10. Errores'");
        expect(selectFinal).not.toContain('@pFase');
        expect(selectFinal).not.toContain('@pNombre');
    });
});
