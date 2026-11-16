import { db } from './IndexedDBStorage';
import type { MarcajeDiaRow, MarcajeRow } from './IndexedDBStorage';
import { marcajeKey, type Marcaje } from '../../features/agenda/lib/marcajes';

/**
 * Caché local de los Marcajes de la intranet.
 *
 * Se guarda el histórico completo y se escribe de forma incremental: una lectura
 * del período visible nunca borra los Marcajes ya guardados de ese rango, y los
 * de la intranet no se pueden editar. Los Marcajes manuales viven en la misma
 * tabla y son los únicos que se corrigen y se borran desde la app.
 */

const MANUAL_ORIGEN = 'manual';

function toRow(marcaje: Marcaje): MarcajeRow {
  return {
    key: marcajeKey(marcaje),
    date: marcaje.date,
    time: marcaje.time,
    origen: marcaje.origen,
    manual: marcaje.manual || undefined,
    savedAt: new Date().toISOString(),
  };
}

/** Guarda los Marcajes leídos de la intranet y marca los días como leídos ahora. */
export async function saveMarcajesLeidos(marcajes: Marcaje[], days: string[]): Promise<void> {
  const readAt = new Date().toISOString();
  await db.transaction('rw', db.marcajes, db.marcajeDias, async () => {
    if (marcajes.length > 0) {
      await db.marcajes.bulkPut(marcajes.map(toRow));
    }
    await db.marcajeDias.bulkPut(days.map((date) => ({ date, readAt })));
  });
}

/** Marcajes y estado de los días del rango, desde la caché local. */
export async function readMarcajesCache(
  from: string,
  to: string,
): Promise<{ marcajes: Marcaje[]; dias: MarcajeDiaRow[] }> {
  const [rows, dias] = await Promise.all([
    db.marcajes.where('date').between(from, to, true, true).toArray(),
    db.marcajeDias.where('date').between(from, to, true, true).toArray(),
  ]);

  return {
    marcajes: rows.map((row) => ({
      date: row.date,
      time: row.time,
      origen: row.origen,
      manual: row.manual || undefined,
    })),
    dias,
  };
}

/** Añade un Marcaje manual. Solo se permite en días pasados (lo decide la UI). */
export async function addMarcajeManual(date: string, time: string): Promise<void> {
  await db.marcajes.put({
    key: marcajeKey({ date, time, origen: MANUAL_ORIGEN }),
    date,
    time,
    origen: MANUAL_ORIGEN,
    manual: true,
    savedAt: new Date().toISOString(),
  });
}

/** Corrige la hora de un Marcaje manual. Solo toca filas manuales. */
export async function updateMarcajeManual(date: string, fromTime: string, toTime: string): Promise<void> {
  const key = marcajeKey({ date, time: fromTime, origen: MANUAL_ORIGEN });
  const row = await db.marcajes.get(key);
  if (!row?.manual) return;

  await db.transaction('rw', db.marcajes, async () => {
    await db.marcajes.delete(key);
    await db.marcajes.put(toRow({ date, time: toTime, origen: MANUAL_ORIGEN, manual: true }));
  });
}

/** Borra un Marcaje manual. Los de la intranet no se borran desde la app. */
export async function deleteMarcajeManual(date: string, time: string): Promise<void> {
  const key = marcajeKey({ date, time, origen: MANUAL_ORIGEN });
  const row = await db.marcajes.get(key);
  if (!row?.manual) return;
  await db.marcajes.delete(key);
}

/** Excluye el día del cuadre, o deshace la exclusión. */
export async function setMarcajesIgnorado(date: string, ignored: boolean): Promise<void> {
  const existing = await db.marcajeDias.get(date);
  await db.marcajeDias.put({ ...existing, date, ignored });
}
