/**
 * Normalise a DB Fecha to YYYY-MM-DD string.
 * Handles: ISO strings, DD/MM/YYYY strings, Date objects, and passthrough.
 */
export const fechaToYMD = (fecha: any): string => {
  if (!fecha) return '';
  if (typeof fecha === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) return fecha.slice(0, 10);
    const parts = fecha.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    return fecha;
  }
  const d = new Date(fecha);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(fecha);
};

/**
 * Truncate HH:MM:SS to HH:MM.
 */
export const toHHMM = (time: string) => time.slice(0, 5);
