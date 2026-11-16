import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { db } from '@/lib/storage/IndexedDBStorage';
import { readMarcajesCache, saveMarcajesLeidos } from '@/lib/storage/marcajesStorage';
import { dbConfig, wizardConfig } from '@/config/stores';
import { useMarcajesPeriodo } from '../useMarcajesPeriodo';

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn() },
}));

vi.mock('@/config/stores', () => ({
  dbConfig: { get: vi.fn() },
  wizardConfig: { get: vi.fn() },
}));

import { apiClient } from '@/lib/api/client';

const mockPost = vi.mocked(apiClient.post);
const mockDbConfig = vi.mocked(dbConfig.get);
const mockWizardConfig = vi.mocked(wizardConfig.get);

const DAYS = ['2026-11-02', '2026-11-03'];

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function marcajesResponse(data: Array<{ date: string; time: string }>) {
  return {
    success: true,
    data: {
      success: true,
      data: data.map((marcaje) => ({ ...marcaje, origen: 'MAIL' })),
    },
  } as never;
}

describe('useMarcajesPeriodo — caché primero, refresco en segundo plano', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete();
    await db.open();
    mockDbConfig.mockReturnValue({ server: 'srv', database: 'db', username: 'u', password: '' } as never);
    mockWizardConfig.mockReturnValue({ usuario: 'usured' } as never);
  });

  it('sin red y con marcajes en caché, el día se puede evaluar y no hay error bloqueante', async () => {
    await saveMarcajesLeidos(
      [
        { date: '2026-11-02', time: '06:43', origen: 'MAIL' },
        { date: '2026-11-02', time: '14:17', origen: 'MAIL' },
      ],
      DAYS,
    );
    mockPost.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useMarcajesPeriodo(DAYS), { wrapper });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.byDay.get('2026-11-02')?.times).toEqual(['06:43', '14:17']);
    expect(result.current.byDay.get('2026-11-02')?.coveredMinutes).toBe(7 * 60 + 34);
  });

  it('sin caché y sin red, los días quedan sin información, nunca descuadrados', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useMarcajesPeriodo(DAYS), { wrapper });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.byDay.get('2026-11-02')?.times).toEqual([]);
    expect(result.current.byDay.get('2026-11-03')?.times).toEqual([]);
  });

  it('lo que devuelve la intranet se guarda en local para la próxima vez', async () => {
    mockPost.mockResolvedValue(
      marcajesResponse([
        { date: '2026-11-02', time: '06:43' },
        { date: '2026-11-02', time: '14:17' },
      ]),
    );

    const { result } = renderHook(() => useMarcajesPeriodo(DAYS), { wrapper });

    await waitFor(() => expect(result.current.byDay.get('2026-11-02')?.times).toEqual(['06:43', '14:17']));
    const { marcajes } = await readMarcajesCache('2026-11-02', '2026-11-03');
    expect(marcajes).toHaveLength(2);
  });

  it('etiqueta como dato viejo lo leído hace más de un día, y no lo reciente', async () => {
    await saveMarcajesLeidos([{ date: '2026-11-02', time: '06:43', origen: 'MAIL' }], DAYS);
    // Simula una lectura antigua de todo el rango.
    await db.marcajeDias.bulkPut([
      { date: '2026-11-02', readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { date: '2026-11-03', readAt: new Date().toISOString() },
    ]);
    mockPost.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useMarcajesPeriodo(DAYS), { wrapper });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.byDay.get('2026-11-02')?.stale).toBe(true);
    expect(result.current.byDay.get('2026-11-03')?.stale).toBe(false);
  });

  it('pinta la caché antes de que responda la red', async () => {
    await saveMarcajesLeidos([{ date: '2026-11-02', time: '06:43', origen: 'MAIL' }], DAYS);
    let resolveRequest: (value: never) => void = () => undefined;
    mockPost.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve as (value: never) => void;
      }),
    );

    const { result } = renderHook(() => useMarcajesPeriodo(DAYS), { wrapper });

    await waitFor(() => expect(result.current.byDay.get('2026-11-02')?.times).toEqual(['06:43']));
    expect(result.current.isRefreshing).toBe(true);
    resolveRequest(marcajesResponse([]) as never);
  });

  it('un marcaje manual añadido se ve sin recargar y sobrevive al refresco del rango', async () => {
    mockPost.mockResolvedValue(marcajesResponse([]));

    const { result } = renderHook(() => useMarcajesPeriodo(DAYS), { wrapper });
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));

    await result.current.addManual('2026-11-02', '16:13');

    await waitFor(() =>
      expect(result.current.byDay.get('2026-11-02')?.marcajes).toEqual([
        { date: '2026-11-02', time: '16:13', origen: 'manual', manual: true },
      ]),
    );
  });
});

describe('useMarcajesPeriodo — día ignorado', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete();
    await db.open();
    mockDbConfig.mockReturnValue({ server: 'srv', database: 'db', username: 'u', password: '' } as never);
    mockWizardConfig.mockReturnValue({ usuario: 'usured' } as never);
    mockPost.mockRejectedValue(new Error('Network Error'));
  });

  it('el ignorado sobrevive a recargas y no toca los marcajes guardados', async () => {
    await saveMarcajesLeidos(
      [
        { date: '2026-11-02', time: '06:35', origen: 'MAIL' },
        { date: '2026-11-02', time: '13:30', origen: 'MAIL' },
      ],
      DAYS,
    );

    const primera = renderHook(() => useMarcajesPeriodo(DAYS), { wrapper });
    await waitFor(() => expect(primera.result.current.byDay.get('2026-11-02')?.times).toHaveLength(2));
    await primera.result.current.setIgnored('2026-11-02', true);
    await waitFor(() => expect(primera.result.current.byDay.get('2026-11-02')?.ignored).toBe(true));
    primera.unmount();

    // Otra sesión de la app, mismo navegador: el día sigue ignorado.
    const segunda = renderHook(() => useMarcajesPeriodo(DAYS), { wrapper });
    await waitFor(() => expect(segunda.result.current.byDay.get('2026-11-02')?.ignored).toBe(true));
    expect(segunda.result.current.byDay.get('2026-11-02')?.times).toEqual(['06:35', '13:30']);

    await segunda.result.current.setIgnored('2026-11-02', false);
    await waitFor(() => expect(segunda.result.current.byDay.get('2026-11-02')?.ignored).toBe(false));
    expect(segunda.result.current.byDay.get('2026-11-02')?.times).toEqual(['06:35', '13:30']);
  });
});
