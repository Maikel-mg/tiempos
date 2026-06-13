export function escapeSQL(valor: string | number | null | undefined): string {
  if (valor == null || valor === '') return '';
  const str = String(valor);
  validarSeguroSQL(str);
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

export function validarSeguroSQL(valor: string): string {
  const peligroso = /(--|\/\*|\*\/|;|\b(drop|delete|insert|update|exec|execute|union|select)\b)/i;
  if (peligroso.test(valor)) {
    throw new Error(`El valor contiene caracteres no permitidos: ${valor.substring(0, 50)}`);
  }
  return valor;
}

export function validarFecha(fecha: string): string {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(fecha)) {
    throw new Error(`Formato de fecha inválido: ${fecha}. Se esperaba DD/MM/AAAA`);
  }
  return fecha;
}

export function validarHora(hora: string): string {
  const regex = /^\d{2}:\d{2}:\d{2}$/;
  if (!regex.test(hora)) {
    throw new Error(`Formato de hora inválido: ${hora}. Se esperaba HH:MM:SS`);
  }
  return hora;
}

export function validarIdProceso(id: string | number): number {
  const num = typeof id === 'number' ? id : parseInt(id, 10);
  if (isNaN(num) || num <= 0) {
    throw new Error(`ID de proceso inválido: ${id}`);
  }
  return num;
}

export function decimalHorasAMinutos(valor: string | number | undefined | null): number {
  if (valor === undefined || valor === null || valor === '') return 0;
  const str = valor.toString().trim();

  if (str.includes(':')) {
    const partes = str.split(':');
    const horas = parseInt(partes[0]) || 0;
    const minutos = parseInt(partes[1]) || 0;
    const segundos = partes[2] ? parseInt(partes[2]) || 0 : 0;
    return (horas * 60) + minutos + (segundos >= 30 ? 1 : 0);
  }

  const horasDecimal = parseFloat(str.replace(',', '.'));
  if (isNaN(horasDecimal) || horasDecimal < 0 || horasDecimal > 24) {
    throw new Error(`Duración inválida: ${valor}. Debe ser un número entre 0 y 24 o formato HH:MM:SS.`);
  }
  return Math.round(horasDecimal * 60);
}

export function parseISO8601DurationToMinutes(isoDuration: string | undefined | null): number {
  if (!isoDuration) return 0;
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = isoDuration.match(regex);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 60 + minutes + Math.ceil(seconds / 60);
}

export function formatISOToSQLDate(isoDateString: string | undefined | null): string {
  if (!isoDateString) return '';
  const date = new Date(isoDateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatISOToSQLTime(isoDateString: string | undefined | null): string {
  if (!isoDateString) return '';
  const date = new Date(isoDateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function downloadSQL(sql: string, filename: string = 'tiempos.sql'): void {
  const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(sql: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(sql);
    return true;
  } catch (error) {
    console.error('Error al copiar:', error);
    return false;
  }
}

export function formatSQLForHighlight(sql: string): string {
  return sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(exec|spNETTiempos_Alta|spNETTiempos_Procesos_Mantenimiento)/gi, '<span class="text-purple-600 font-semibold">$1</span>')
    .replace(/(@\w+)/g, '<span class="text-blue-600">$1</span>')
    .replace(/('[^']*')/g, '<span class="text-green-600">$1</span>')
    .replace(/(\d+)/g, '<span class="text-orange-600">$1</span>')
    .replace(/,/g, '<span class="text-gray-400">,</span>')
    .replace(/GO/g, '<span class="text-purple-500 font-semibold">GO</span>')
    .replace(/(DECLARE|SET|NULL)/g, '<span class="text-purple-500 font-semibold">$1</span>');
}
