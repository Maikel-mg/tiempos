import { describe, expect, it } from 'vitest';
import { estimateExit } from '../estimatedExit';

describe('estimateExit', () => {
  it('suma lo que falta del objetivo a la hora actual', () => {
    // Objetivo 8h, 3h ya trabajadas, son las 13:10 → faltan 5h → 18:10.
    const result = estimateExit(8 * 3600, 3 * 3600, new Date(2026, 0, 15, 13, 10));
    expect(result).toEqual({ remainingMinutes: 300, exitMinutes: 18 * 60 + 10 });
  });

  it('redondea el restante hacia arriba al minuto', () => {
    // Falta 1s → cuenta como un minuto entero.
    const result = estimateExit(3600, 3599, new Date(2026, 0, 15, 9, 0));
    expect(result).toEqual({ remainingMinutes: 1, exitMinutes: 9 * 60 + 1 });
  });

  it('no estima nada si el objetivo ya está cumplido', () => {
    expect(estimateExit(3600, 3600, new Date(2026, 0, 15, 9, 0))).toBeNull();
    expect(estimateExit(3600, 7200, new Date(2026, 0, 15, 9, 0))).toBeNull();
  });

  it('no estima nada si el día no tiene objetivo', () => {
    expect(estimateExit(0, 0, new Date(2026, 0, 15, 9, 0))).toBeNull();
  });
});
