/**
 * CSV Parser adapted for browser FileReader API
 * Based on csv-utils.js logic but adapted for browser use
 */

/**
 * Detecta automáticamente el separador del CSV (tabs vs comas)
 * @param {string} linea - Primera línea del archivo CSV
 * @returns {string} Separador detectado ('\t' o ',')
 */
export function detectarSeparador(linea) {
    const tabs = (linea.match(/\t/g) || []).length;
    const comas = (linea.match(/,/g) || []).length;
    return tabs > comas ? '\t' : ',';
}

/**
 * Parsea una línea CSV respetando comillas
 * Maneja correctamente campos entrecomillados con comas internas
 * @param {string} linea - Línea del CSV
 * @param {string} separador - Carácter separador
 * @returns {string[]} Array de valores
 */
export function parseCSVLine(linea, separador) {
    const resultado = [];
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
 * @param {string} valor - Valor a limpiar
 * @returns {string} Valor limpio
 */
export function limpiarValor(valor) {
    if (!valor) return '';
    return valor.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
}

/**
 * Convierte horas decimales a minutos
 * @param {string|number} decimal - Valor en horas decimales (ej: "1,95")
 * @returns {number} Minutos enteros
 */
export function decimalHorasAMinutos(decimal) {
    if (!decimal) return 0;
    const horas = parseFloat(decimal.toString().replace(',', '.'));
    if (isNaN(horas) || horas < 0 || horas > 24) {
        throw new Error(`Duración inválida: ${decimal}. Debe ser un número entre 0 y 24.`);
    }
    return Math.round(horas * 60);
}

/**
 * Parsea un archivo CSV usando FileReader API
 * @param {File} file - Archivo File del input
 * @param {string} encoding - Codificación (default: utf8)
 * @returns {Promise<{ headers: string[], rows: string[][], separador: string }>} 
 */
export function parseCSV(file, encoding = 'utf8') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const lines = content.split('\n').filter(line => line.trim());

                if (lines.length < 2) {
                    throw new Error('El CSV está vacío o no tiene datos');
                }

                const separador = detectarSeparador(lines[0]);
                const headers = parseCSVLine(lines[0], separador);
                const rows = [];

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
 * Extrae tareas únicas del CSV
 * @param {string[][]} rows - Filas del CSV
 * @param {number} tareaIndex - Índice de la columna Tarea
 * @returns {string[]} Tareas únicas
 */
export function extractUniqueTasks(rows, tareaIndex) {
    const tareas = new Set();
    
    for (const row of rows) {
        if (row.length > tareaIndex) {
            const tarea = row[tareaIndex]?.trim();
            if (tarea) {
                tareas.add(tarea);
            }
        }
    }
    
    return Array.from(tareas).sort();
}

/**
 * Normaliza nombre de columna para búsqueda
 * @param {string} header - Nombre de columna
 * @returns {string} Nombre normalizado
 */
export function normalizarHeader(header) {
    return header.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
        .replace(/\s+/g, ' '); // normalizar espacios
}

/**
 * Encuentra índices de columnas relevantes
 * @param {string[]} headers - Encabezados del CSV
 * @returns {Object} Índices de columnas
 */
export function findColumnIndices(headers) {
    const indices = {
        tarea: headers.findIndex(h => normalizarHeader(h) === 'tarea'),
        descripcion: headers.findIndex(h => normalizarHeader(h) === 'descripcion'),
        fechaInicio: headers.findIndex(h => normalizarHeader(h) === 'fecha de inicio'),
        horaInicio: headers.findIndex(h => normalizarHeader(h) === 'hora de inicio'),
        fechaFin: headers.findIndex(h => normalizarHeader(h) === 'fecha de finalizacion'),
        horaFin: headers.findIndex(h => normalizarHeader(h) === 'hora de finalizacion'),
        duracionDecimal: headers.findIndex(h => {
            const hNorm = normalizarHeader(h);
            return hNorm === 'duracion (decimal)' || hNorm === 'duracion (h)';
        }),
    };
    
    return indices;
}

/**
 * Valida que el CSV tenga todas las columnas requeridas
 * @param {Object} indices - Índices de columnas
 * @returns {string[]|null} Columnas faltantes o null si todo está bien
 */
export function validateRequiredColumns(indices) {
    const columnasRequeridas = ['tarea', 'fechaInicio', 'horaInicio', 'fechaFin', 'horaFin', 'duracionDecimal'];
    const columnasFaltantes = columnasRequeridas.filter(col => indices[col] === -1);
    return columnasFaltantes.length > 0 ? columnasFaltantes : null;
}
