import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db, type MarcajeRow } from '../IndexedDBStorage';
import {
  addMarcajeManual,
  deleteMarcajeManual,
  readMarcajesCache,
  saveMarcajesLeidos,
  setMarcajesIgnorado,
  updateMarcajeManual,
} from '../marcajesStorage';

const leido = (date: string, time: string, origen = 'MAIL') => ({ date, time, origen });

async function marcajesOf(date: string) {
  const rows = await db.marcajes.where('date').equals(date).toArray();
  return rows
    .map((row: MarcajeRow) => `${row.time}${row.manual ? '*' : ''}`)
    .sort();
}

describe('caché de marcajes', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('guarda lo leído de forma incremental: ni duplica ni borra lo que ya estaba', async () => {
    await saveMarcajesLeidos([leido('2026-11-02', '06:43'), leido('2026-11-02', '14:17')], ['2026-11-02']);
    // Una segunda lectura del mismo rango, ahora solo con otra hora.
    await saveMarcajesLeidos([leido('2026-11-02', '15:15')], ['2026-11-02']);

    expect(await marcajesOf('2026-11-02')).toEqual(['06:43', '14:17', '15:15']);

    // Y leer otra vez lo mismo no crea filas nuevas.
    await saveMarcajesLeidos([leido('2026-11-02', '06:43')], ['2026-11-02']);
    expect(await marcajesOf('2026-11-02')).toHaveLength(3);
  });

  it('marca como leídos los días del rango, para poder etiquetar el dato como viejo', async () => {
    await saveMarcajesLeidos([], ['2026-11-03']);
    const { dias } = await readMarcajesCache('2026-11-03', '2026-11-03');

    expect(dias).toHaveLength(1);
    expect(Date.now() - new Date(dias[0].readAt!).getTime()).toBeLessThan(60_000);
  });

  it('devuelve solo el rango pedido, con el histórico completo detrás', async () => {
    await saveMarcajesLeidos(
      [leido('2026-10-30', '07:00'), leido('2026-11-02', '06:43'), leido('2026-11-09', '08:00')],
      ['2026-10-30', '2026-11-02', '2026-11-09'],
    );

    const { marcajes } = await readMarcajesCache('2026-11-01', '2026-11-07');
    expect(marcajes.map((marcaje) => marcaje.date)).toEqual(['2026-11-02']);
  });

  it('añade, corrige y borra los marcajes manuales', async () => {
    await addMarcajeManual('2026-11-02', '16:13');
    expect(await marcajesOf('2026-11-02')).toEqual(['16:13*']);

    await updateMarcajeManual('2026-11-02', '16:13', '16:20');
    expect(await marcajesOf('2026-11-02')).toEqual(['16:20*']);

    await deleteMarcajeManual('2026-11-02', '16:20');
    expect(await marcajesOf('2026-11-02')).toEqual([]);
  });

  it('no deja tocar los marcajes de la intranet', async () => {
    await saveMarcajesLeidos([leido('2026-11-02', '06:43')], ['2026-11-02']);

    await updateMarcajeManual('2026-11-02', '06:43', '07:00');
    await deleteMarcajeManual('2026-11-02', '06:43');

    expect(await marcajesOf('2026-11-02')).toEqual(['06:43']);
  });

  it('el manual sobrevive al refresco del mismo rango: conviven las dos versiones', async () => {
    await addMarcajeManual('2026-11-02', '14:17');
    // La intranet vuelca tarde ese mismo fichaje.
    await saveMarcajesLeidos([leido('2026-11-02', '14:17')], ['2026-11-02']);

    const { marcajes } = await readMarcajesCache('2026-11-02', '2026-11-02');
    expect(marcajes).toHaveLength(2);
    expect(marcajes.filter((marcaje) => marcaje.manual)).toHaveLength(1);
  });

  it('guarda y deshace el ignorado de un día sin tocar sus marcajes', async () => {
    await saveMarcajesLeidos([leido('2026-11-02', '06:43'), leido('2026-11-02', '14:17')], ['2026-11-02']);

    await setMarcajesIgnorado('2026-11-02', true);
    let { dias, marcajes } = await readMarcajesCache('2026-11-02', '2026-11-02');
    expect(dias[0].ignored).toBe(true);
    expect(marcajes).toHaveLength(2);

    await setMarcajesIgnorado('2026-11-02', false);
    ({ dias, marcajes } = await readMarcajesCache('2026-11-02', '2026-11-02'));
    expect(dias[0].ignored).toBe(false);
    expect(marcajes).toHaveLength(2);
    // La última lectura no se pierde al ignorar el día.
    expect(dias[0].readAt).toBeTruthy();
  });
});
