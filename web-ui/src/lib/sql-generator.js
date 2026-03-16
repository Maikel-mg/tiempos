/**
 * SQL Generator for browser
 * Generates SQL statements from CSV data and task mappings
 */
import { decimalHorasAMinutos } from './csv-parser';
import { formatToYYYYMMDD, getFirstDayOfMonthYYYYMMDD } from './utils';

/**
 * Genera SQL para creación de tarea/proceso
 * @param {Object} params - Parámetros de la tarea
 * @returns {string} SQL generado
 */
export function generateTaskSQL(params) {
    const {
        nombre,
        fechaInicio,
        fechaFin,
        minutos,
        usuario,
        fase = null,
        cliente = 'ELECNOR',
        tipoHora = 1,
        presencial = 1,
        disponible = 1
    } = params;

    const fechaIniPrevista = formatToYYYYMMDD(fechaInicio);
    const fechaFinPrevista = formatToYYYYMMDD(fechaFin);
    const fechaEstimacion = getFirstDayOfMonthYYYYMMDD(fechaInicio);

    const faseValue = fase || usuario;

    return `-- INSERT DE UN TAREA = PROCESO
DECLARE @p38 VARCHAR(200)
SET @p38 = NULL

EXEC spNETTiempos_Procesos_Mantenimiento
    @pAccion = 'I',
    @pProceso = NULL,
    @pNombre = '${escapeSQL(nombre)}',
    @pFechaIniPrevista = '${fechaIniPrevista}',
    @pFechaFinPrevista = '${fechaFinPrevista}',
    @pFechaIniReal = NULL,
    @pFechaFinReal = NULL,
    @pTiempoPrevisto = ${minutos},
    @pTecnicoPrev = ${minutos},
    @pObservaciones = NULL,
    @pRutaDOC = NULL,
    @pTipoDeHora = ${tipoHora},
    @pPresencial = ${presencial},
    @pDisponible = ${disponible},
    @pCosteEmpresa = 1,
    @pFechaAviso = NULL,
    @pHoraAviso = NULL,
    @pUsuredAviso = NULL,
    @pUsuredResp = 'BR00',
    @pUsuredRespRev = 'BR00',
    @pRecursos = NULL,
    @pDiseño = 'N',
    @pTecnicos = '${escapeSQL(usuario)}',
    @pIdDpto = 5,
    @pFase = ${faseValue},
    @pComentarioOblig = 0,
    @pCliente = '${escapeSQL(cliente)}',
    @pIdDptoClte = NULL,
    @pIdAplicacion = NULL,
    @pFechaEstimacion = '${fechaEstimacion}',
    @pTareaTecnica = 1,
    @pObservacionEstExt = NULL,
    @pHito = 0,
    @pDesplazamientoPS = 0,
    @pHerramienta = NULL,
    @pProtegida = 0,
    @pFaseAnterior = NULL,
    @Resultado = @p38 OUTPUT`;
}

/**
 * Valida formato de fecha (DD/MM/AAAA)
 * @param {string} fecha - Fecha a validar
 * @returns {string} Fecha validada
 */
export function validarFecha(fecha) {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(fecha)) {
        throw new Error(`Formato de fecha inválido: ${fecha}. Se esperaba DD/MM/AAAA`);
    }
    return fecha;
}

/**
 * Valida formato de hora (HH:MM:SS)
 * @param {string} hora - Hora a validar
 * @returns {string} Hora validada
 */
export function validarHora(hora) {
    const regex = /^\d{2}:\d{2}:\d{2}$/;
    if (!regex.test(hora)) {
        throw new Error(`Formato de hora inválido: ${hora}. Se esperaba HH:MM:SS`);
    }
    return hora;
}

/**
 * Valida que el valor no contenga SQL injection
 * @param {string} valor - Valor a validar
 * @returns {string} Valor validado
 */
export function validarSeguroSQL(valor) {
    const peligroso = /(--|\/\*|\*\/|;|\b(drop|delete|insert|update|exec|execute|union|select)\b)/i;
    if (peligroso.test(valor)) {
        throw new Error(`El valor contiene caracteres no permitidos: ${valor.substring(0, 50)}`);
    }
    return valor;
}

/**
 * Escapa valores para SQL
 * @param {string} valor - Valor a escapar
 * @returns {string} Valor escapado
 */
export function escapeSQL(valor) {
    if (!valor) return '';
    validarSeguroSQL(valor);
    return valor.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

/**
 * Valida ID de proceso
 * @param {string|number} id - ID a validar
 * @returns {number} ID como número
 */
export function validarIdProceso(id) {
    const num = parseInt(id);
    if (isNaN(num) || num <= 0) {
        throw new Error(`ID de proceso inválido: ${id}`);
    }
    return num;
}

/**
 * Genera SQL para un registro
 * @param {Object} params - Parámetros del registro
 * @returns {string} SQL generado
 */
export function generateSQLStatement(params) {
  const {
    usuario,
    fechaInicio,
    horaInicio,
    horaFin,
    minutos,
    idProceso,
    tipoHora,
    descripcion
  } = params;

    return `SET DATEFORMAT dmy; exec spNETTiempos_Alta @Usured='${escapeSQL(usuario)}', @Fecha='${fechaInicio}', @HoraDesde='${horaInicio}', @HoraHasta='${horaFin}', @Minutos=${minutos}, @Proceso=${idProceso}, @pParteSalida=NULL, @pGastos=0, @pKms=0, @pTipoHora=${tipoHora}, @ClienteComercial=NULL, @Comentario='${escapeSQL(descripcion)}', @pCambio=NULL, @pTeleTrabajo=0, @ObservacionesCalidad=NULL, @Rapport=0, @RapportCheck=0, @VBPermisoUsured=NULL, @VBPermisoFechaHora=NULL, @ObservacionesPermiso=NULL, @Ticket=NULL, @EsTeleTrabajo=1, @pMarcajeIP_INI=0, @pMarcajeIP_FIN=0, @pObservacionesPseudoMarcaje=NULL, @pTiempoNoReconocido=0, @pObservacionesRegistroHorario=NULL`;
}

/**
 * Genera todas las sentencias SQL
 * @param {Object} params - Parámetros de generación
 * @returns {Object} Resultado de la generación
 */
export function generateSQL(params) {
    const {
        rows,
        headers,
        taskMapping,
        config,
        indices
    } = params;

    const sqlStatements = [];
    const errors = [];
    let processed = 0;

    const columnasRequeridas = ['tarea', 'fechaInicio', 'horaInicio', 'fechaFin', 'horaFin', 'duracionDecimal'];
    const maxIndex = Math.max(...columnasRequeridas.map(col => indices[col]));

    for (let i = 0; i < rows.length; i++) {
        const columns = rows[i];
        const lineaNum = i + 2;

        try {
            // Verificar columnas suficientes
            if (columns.length < maxIndex + 1) {
                errors.push({
                    line: lineaNum,
                    message: `Formato incorrecto (columnas insuficientes - tiene ${columns.length}, necesita ${maxIndex + 1})`
                });
                continue;
            }

            const tarea = columns[indices.tarea]?.trim();
            const descripcion = indices.descripcion !== -1 ? columns[indices.descripcion]?.trim() || '' : '';
            const fechaInicio = columns[indices.fechaInicio]?.trim();
            const horaInicio = columns[indices.horaInicio]?.trim();
            const fechaFin = columns[indices.fechaFin]?.trim();
            const horaFin = columns[indices.horaFin]?.trim();
            const duracionDecimal = columns[indices.duracionDecimal]?.trim();

            // Validar que la tarea exista en el mapeo
            if (!taskMapping[tarea]) {
                errors.push({
                    line: lineaNum,
                    message: `Tarea no encontrada en mapeo: "${tarea?.substring(0, 30)}..."`
                });
                continue;
            }

            // Validar todos los valores
            const idProceso = validarIdProceso(taskMapping[tarea]);
            const minutos = decimalHorasAMinutos(duracionDecimal);
            const fechaInicioValidada = validarFecha(fechaInicio);
            const horaInicioValidada = validarHora(horaInicio);
            const fechaFinValidada = validarFecha(fechaFin);
            const horaFinValidada = validarHora(horaFin);

            // Generar SQL
const sql = generateSQLStatement({
      usuario: config.usuario,
      fechaInicio: fechaInicioValidada,
      horaInicio: horaInicioValidada,
      horaFin: horaFinValidada,
      minutos,
      idProceso,
      tipoHora: parseInt(config.tipoHora) || 11,
      descripcion
    });

            sqlStatements.push(sql);
            processed++;
        } catch (error) {
            errors.push({
                line: lineaNum,
                message: error.message
            });
        }
    }

    return {
        sql: sqlStatements.join('\nGO\n'),
        statements: sqlStatements,
        processed,
        errors,
        total: rows.length
    };
}

/**
 * Descarga el SQL como archivo
 * @param {string} sql - Contenido SQL
 * @param {string} filename - Nombre del archivo
 */
export function downloadSQL(sql, filename = 'tiempos.sql') {
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

/**
 * Copia el SQL al portapapeles
 * @param {string} sql - Contenido SQL
 * @returns {Promise<boolean>} Éxito de la operación
 */
export async function copyToClipboard(sql) {
    try {
        await navigator.clipboard.writeText(sql);
        return true;
    } catch (error) {
        console.error('Error al copiar:', error);
        return false;
    }
}

/**
 * Formatea SQL para syntax highlighting
 * @param {string} sql - SQL a formatear
 * @returns {string} HTML formateado
 */
export function formatSQLForHighlight(sql) {
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

/**
 * Convierte duración ISO 8601 (PT1H30M) a minutos
 * @param {string} isoDuration - Duración en formato ISO 8601
 * @returns {number} Minutos
 */
export function parseISO8601DurationToMinutes(isoDuration) {
    console.log(`TCL ~ parseISO8601DurationToMinutes ~ isoDuration:`, isoDuration)
    if (!isoDuration) return 0;
    console.log(`TCL ~ parseISO8601DurationToMinutes ~ !isoDuration:`, !isoDuration)
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    console.log(`TCL ~ parseISO8601DurationToMinutes ~ match:`, match)
    const match = isoDuration.match(regex);
    console.log(`TCL ~ parseISO8601DurationToMinutes ~ match:`, match)
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    
    return hours * 60 + minutes + Math.ceil(seconds / 60);
}

/**
 * Convierte fecha ISO a formato DD/MM/YYYY para SQL
 * @param {string} isoDateString - Fecha en formato ISO
 * @returns {string} Fecha en formato DD/MM/YYYY
 */
export function formatISOToSQLDate(isoDateString) {
    if (!isoDateString) return '';
    const date = new Date(isoDateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Convierte fecha ISO a formato HH:MM:SS para SQL
 * @param {string} isoDateString - Fecha en formato ISO
 * @returns {string} Hora en formato HH:MM:SS
 */
export function formatISOToSQLTime(isoDateString) {
    if (!isoDateString) return '';
    const date = new Date(isoDateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Adapta un objeto de Clockify al formato requerido por generateSQLStatement
 * @param {Object} entry - Entrada de Clockify
 * @param {Object} taskMapping - Mapeo de nombres de tarea a IDs
 * @param {Object} config - Configuración (usuario, tipoHora)
 * @returns {Object} Objeto adaptado
 */
export function adaptClockifyEntry(entry, taskMapping, config) {
    const projectName = entry.project?.name || entry.projectId || '';
    const taskName = entry.taskName || entry.task?.name || '';
    const description = entry.description || '';
    const timeInterval = entry.timeInterval || {};
    const start = timeInterval.start;
    const end = timeInterval.end;
    
    if (!taskName || !taskMapping[taskName]) {
        throw new Error(`Tarea no encontrada en mapeo: "${taskName}"`);
    }
    
    const idProceso = validarIdProceso(taskMapping[taskName]);
    const minutos = typeof timeInterval.duration === 'string' 
        ? parseISO8601DurationToMinutes(timeInterval.duration)
        : Math.ceil((timeInterval.duration || 0) / 60);
    const fechaInicio = formatISOToSQLDate(start);
    const horaInicio = formatISOToSQLTime(start);
    const fechaFin = formatISOToSQLDate(end);
    const horaFin = formatISOToSQLTime(end);
    
    return {
        usuario: config.usuario,
        fechaInicio,
        horaInicio,
        horaFin,
        minutos,
        idProceso,
        tipoHora: parseInt(config.tipoHora) || 11,
        descripcion : description
    };
}

/**
 * Genera SQL desde objetos de Clockify
 * @param {Object} params - Parámetros de generación
 * @returns {Object} Resultado de la generación
 */
export function generateSQLFromObjects(params) {
    const {
        entries,
        taskMapping,
        config
    } = params;
        console.log(`TCL ~ generateSQLFromObjects ~ entries:`, entries)
        console.log(`TCL ~ generateSQLFromObjects ~ taskMapping:`, taskMapping)

    const sqlStatements = [];
    const errors = [];
    let processed = 0;

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        console.log(`TCL ~ generateSQLFromObjects ~ entry:`, entry)

        try {
            const adaptedParams = adaptClockifyEntry(entry, taskMapping, config);
            console.log(`TCL ~ generateSQLFromObjects ~ adaptedParams:`, adaptedParams)
            
            if (!adaptedParams.fechaInicio || !adaptedParams.horaInicio) {
                errors.push({
                    index: i,
                    message: 'Faltan datos de fecha/hora'
                });
                continue;
            }

            const sql = generateSQLStatement(adaptedParams);
            sqlStatements.push(sql);
            processed++;
        } catch (error) {
            errors.push({
                index: i,
                message: error.message
            });
        }
    }

    return {
        sql: sqlStatements.join('\nGO\n'),
        statements: sqlStatements,
        processed,
        errors,
        total: entries.length
    };
}
