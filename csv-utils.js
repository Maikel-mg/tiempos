const fs = require('fs');

/**
 * Detecta automáticamente el separador del CSV (tabs vs comas)
 * @param {string} linea - Primera línea del archivo CSV
 * @returns {string} Separador detectado ('\t' o ',')
 */
function detectarSeparador(linea) {
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
function parseCSVLine(linea, separador) {
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
function limpiarValor(valor) {
    if (!valor) return '';
    return valor.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
}

/**
 * Lee y parsea un archivo CSV completo
 * @param {string} filePath - Ruta del archivo
 * @param {string} encoding - Codificación (default: utf8)
 * @returns {Object} { headers: string[], rows: string[][] }
 */
function leerCSV(filePath, encoding = 'utf8') {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, encoding);
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

    return { headers, rows, separador };
}

/**
 * Convierte duración (decimal o HH:MM:SS) a minutos
 * @param {string|number} valor - Valor de duración (ej: "0.25", "1,95" o "00:15:00")
 * @returns {number} Minutos enteros
 */
function decimalHorasAMinutos(valor) {
    if (!valor) return 0;
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

module.exports = {
    detectarSeparador,
    parseCSVLine,
    limpiarValor,
    leerCSV,
    decimalHorasAMinutos
};
