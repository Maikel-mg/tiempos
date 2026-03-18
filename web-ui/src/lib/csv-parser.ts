/**
 * CSV Parser adapted for browser FileReader API
 * Based on csv-utils.js logic but adapted for browser use
 */

export interface CSVIndices {
  tarea: number;
  descripcion: number;
  fechaInicio: number;
  horaInicio: number;
  fechaFin: number;
  horaFin: number;
  duracionDecimal: number;
  [key: string]: number;
}

export interface ParsedData {
  headers: string[];
  rows: string[][];
  separador: string;
}

export interface UniqueTask {
  name: string;
  fechaInicio: string;
  fechaFin: string;
  totalMinutes: number;
}

/**
 * Detecta automáticamente el separador del CSV (tabs vs comas)
 * @param linea - Primera línea del archivo CSV
 * @returns Separador detectado ('\t' o ',')
 */
export function detectarSeparador(linea: string): string {
    const tabs = (linea.match(/\t/g) || []).length;
    const comas = (linea.match(/,/g) || []).length;
    return tabs > comas ? '\t' : ',';
}

/**
 * Parsea una línea CSV respetando comillas
 * Maneja correctamente campos entrecomillados con comas internas
 * @param linea - Línea del CSV
 * @param separador - Carácter separador
 * @returns Array de valores
 */
export function parseCSVLine(linea: string, separador: string): string[] {
    const resultado: string[] = [];
    let valorActual = '';
    let dentroComillas = false;

    for (let i = 0; i < linea.length; i++) {
        const char = linea[i];

        if (char === '"') {
            dentroComillas = !dentroComillas;
        } else if (char === separador && !dentroComillas) {
            resultado.push(limpiarValor(valorActual));
            valorActual = '';
        } else {
            valorActual += char;
        }
    }
    // Agregar último valor
    resultado.push(limpiarValor(valorActual));

    return resultado;
}

/**
 * Limpia un valor CSV (quita comillas y espacios)
 * @param valor - Valor a limpiar
 * @returns Valor limpio
 */
export function limpiarValor(valor: string): string {
    if (!valor) return '';
    return valor.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
}

/**
 * Convierte duración (decimal o HH:MM:SS) a minutos
 * @param valor - Valor de duración (ej: "0.25", "1,95" o "00:15:00")
 * @returns Minutos enteros
 */
export function decimalHorasAMinutos(valor: string | number): number {
    if (valor === undefined || valor === null || valor === '') return 0;
    const str = valor.toString().trim();

    // Caso 1: Formato HH:MM:SS (o HH:MM)
    if (str.includes(':')) {
        const partes = str.split(':');
        const horas = parseInt(partes[0]) || 0;
        const minutos = parseInt(partes[1]) || 0;
        const segundos = partes[2] ? parseInt(partes[2]) || 0 : 0;
        
        // Redondear minutos según segundos (si hay segundos >= 30, sumar 1 minuto)
        return (horas * 60) + minutos + (segundos >= 30 ? 1 : 0);
    }

    // Caso 2: Formato decimal (ej: "1,25" o "1.25")
    const horasDecimal = parseFloat(str.replace(',', '.'));
    if (isNaN(horasDecimal) || horasDecimal < 0 || horasDecimal > 24) {
        throw new Error(`Duración inválida: ${valor}. Debe ser un número entre 0 y 24 o formato HH:MM:SS.`);
    }
    return Math.round(horasDecimal * 60);
}

/**
 * Parsea un archivo CSV usando FileReader API
 * @param file - Archivo File del input
 * @param encoding - Codificación (default: utf8)
 * @returns Promise con headers, rows y separador
 */
export function parseCSV(file: File, encoding: string = 'utf8'): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                if (!content) {
                    throw new Error('No se pudo leer el contenido del archivo');
                }
                const lines = content.split('\n').filter(line => line.trim());

                if (lines.length < 2) {
                    throw new Error('El CSV está vacío o no tiene datos');
                }

                const separador = detectarSeparador(lines[0]);
                const headers = parseCSVLine(lines[0], separador);
                const rows: string[][] = [];

                for (let i = 1; i < lines.length; i++) {
                    const columns = parseCSVLine(lines[i], separador);
                    rows.push(columns);
                }

                resolve({ headers, rows, separador });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Error al leer el archivo'));
        };

        reader.readAsText(file, encoding);
    });
}

/**
 * Extrae tareas únicas del CSV con sus fechas teóricas de inicio y fin
 * @param rows - Filas del CSV
 * @param indices - Índices de columnas del CSV (de findColumnIndices)
 * @returns Tareas únicas con fechas
 */
export function extractUniqueTasks(rows: string[][], indices: CSVIndices): UniqueTask[] {
  const tareasMap = new Map<string, UniqueTask>();

  for (const row of rows) {
    if (row.length > indices.tarea) {
      const tarea = row[indices.tarea]?.trim();
      if (tarea) {
        const fechaInicioRaw = row[indices.fechaInicio]?.trim() || '';
        const fechaFinRaw = row[indices.fechaFin]?.trim() || '';
        const duracionRaw = row[indices.duracionDecimal]?.trim() || '0';
        let minutos = 0;
        try {
          minutos = decimalHorasAMinutos(duracionRaw);
        } catch (e) {
          // Ignore invalid duration for total calculation
        }

        if (!tareasMap.has(tarea)) {
          tareasMap.set(tarea, {
            name: tarea,
            fechaInicio: fechaInicioRaw,
            fechaFin: fechaFinRaw,
            totalMinutes: minutos
          });
        } else {
          const existing = tareasMap.get(tarea)!;
          if (fechaInicioRaw && fechaInicioRaw < existing.fechaInicio) {
            existing.fechaInicio = fechaInicioRaw;
          }
          if (fechaFinRaw && fechaFinRaw > existing.fechaFin) {
            existing.fechaFin = fechaFinRaw;
          }
          existing.totalMinutes += minutos;
        }
      }
    }
  }

  return Array.from(tareasMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Normaliza nombre de columna para búsqueda
 * @param header - Nombre de columna
 * @returns Nombre normalizado
 */
export function normalizarHeader(header: string): string {
    return header.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
        .replace(/\s+/g, ' '); // normalizar espacios
}

/**
 * Encuentra índices de columnas relevantes
 * @param headers - Encabezados del CSV
 * @returns Índices de columnas
 */
export function findColumnIndices(headers: string[]): CSVIndices {
    const indices: CSVIndices = {
        tarea: headers.findIndex(h => normalizarHeader(h) === 'tarea'),
        descripcion: headers.findIndex(h => normalizarHeader(h) === 'descripcion'),
        fechaInicio: headers.findIndex(h => normalizarHeader(h) === 'fecha de inicio'),
        horaInicio: headers.findIndex(h => normalizarHeader(h) === 'hora de inicio'),
        fechaFin: headers.findIndex(h => normalizarHeader(h) === 'fecha de finalizacion'),
        horaFin: headers.findIndex(h => normalizarHeader(h) === 'hora de finalizacion'),
        duracionDecimal: headers.findIndex(h => normalizarHeader(h) === 'duracion (decimal)') !== -1 
            ? headers.findIndex(h => normalizarHeader(h) === 'duracion (decimal)')
            : headers.findIndex(h => normalizarHeader(h) === 'duracion (h)'),
    };
    
    return indices;
}

/**
 * Valida que el CSV tenga todas las columnas requeridas
 * @param indices - Índices de columnas
 * @returns Columnas faltantes o null si todo está bien
 */
export function validateRequiredColumns(indices: CSVIndices): string[] | null {
    const columnasRequeridas = ['tarea', 'fechaInicio', 'horaInicio', 'fechaFin', 'horaFin', 'duracionDecimal'];
    const columnasFaltantes = columnasRequeridas.filter(col => indices[col] === -1);
    return columnasFaltantes.length > 0 ? columnasFaltantes : null;
}
