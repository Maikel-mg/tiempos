import type { CSVIndices } from './csv-parser';

export interface BackendTimeEntry {
  entryId: string;
  Usured: string;
  Fecha: string;       // YYYYMMDD
  HoraDesde: string;
  HoraHasta: string;
  Minutos: number;
  Proceso: number;
  pTipoHora: number;
  Comentario?: string;
}

function decimalHorasAMinutos(valor: string | number | undefined | null): number {
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
    throw new Error(`Duracion invalida: ${valor}`);
  }
  return Math.round(horasDecimal * 60);
}

function parseDateToYYYYMMDD(dateString: string | undefined | null): string {
  if (!dateString) return '';
  const parts = dateString.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    }
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}${m}${d}`;
}

export interface ConvertParams {
  rows: string[][];
  taskMapping: Record<string, string>;
  config: {
    usuario: string;
    tipoHora: string;
  };
  indices: CSVIndices;
}

export function convertCsvToTimeEntries(params: ConvertParams): BackendTimeEntry[] {
  const { rows, taskMapping, config, indices } = params;
  const entries: BackendTimeEntry[] = [];
  const tipoHora = parseInt(config.tipoHora, 10) || 11;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const taskName = row[indices.tarea]?.trim();
    if (!taskName || !taskMapping[taskName]) continue;

    const proceso = parseInt(taskMapping[taskName], 10);
    if (isNaN(proceso) || proceso <= 0) continue;

    const minutos = decimalHorasAMinutos(row[indices.duracionDecimal]?.trim());
    if (minutos <= 0) continue;

    const fechaInicio = row[indices.fechaInicio]?.trim();
    const fecha = parseDateToYYYYMMDD(fechaInicio);
    if (!fecha) continue;

    const horaInicio = row[indices.horaInicio]?.trim() || '00:00:00';
    const horaFin = row[indices.horaFin]?.trim() || horaInicio;
    const descripcion = indices.descripcion !== -1 ? row[indices.descripcion]?.trim() || '' : '';

    entries.push({
      entryId: `csv-${i}`,
      Usured: config.usuario,
      Fecha: fecha,
      HoraDesde: horaInicio,
      HoraHasta: horaFin,
      Minutos: minutos,
      Proceso: proceso,
      pTipoHora: tipoHora,
      Comentario: descripcion,
    });
  }

  return entries;
}
