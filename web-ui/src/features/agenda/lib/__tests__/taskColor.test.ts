import { describe, expect, it } from 'vitest';
import { taskHue } from '../taskColor';

describe('taskHue', () => {
  it('es estable para el mismo nombre', () => {
    expect(taskHue('Soporte')).toBe(taskHue('Soporte'));
  });

  it('devuelve un tono múltiplo de 30 dentro de la rueda', () => {
    for (const name of ['Soporte', 'Desarrollo', 'Reunión', 'Implantación', 'Formación', '']) {
      const hue = taskHue(name);
      expect(hue % 30).toBe(0);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it('separa nombres parecidos', () => {
    expect(taskHue('Proceso A')).not.toBe(taskHue('Proceso B'));
  });
});
