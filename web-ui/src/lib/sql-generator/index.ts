export interface SpParameterConfig {
  required: string[];
  optional: Record<string, any>;
}

export const SP_PARAMETERS: Record<string, SpParameterConfig> = {
  'spNETTiempos_Alta': {
    required: ['Usured', 'Fecha', 'HoraDesde', 'HoraHasta', 'Minutos', 'Proceso', 'pTipoHora'],
    optional: {
      ParteSalida: null,
      Gastos: 0,
      Kms: 0,
      ClienteComercial: null,
      Comentario: '',
      Cambio: null,
      TeleTrabajo: 0,
      ObservacionesCalidad: null,
      Rapport: 0,
      RapportCheck: 0,
      VBPermisoUsured: null,
      VBPermisoFechaHora: null,
      ObservacionesPermiso: null,
      Ticket: null,
      EsTeleTrabajo: 1,
      MarcajeIP_INI: 0,
      MarcajeIP_FIN: 0,
      ObservacionesPseudoMarcaje: null,
      TiempoNoReconocido: 0,
      ObservacionesRegistroHorario: null
    }
  },
  'spNETTiempos_Procesos_Mantenimiento': {
    required: ['Accion', 'Nombre', 'FechaIniPrevista', 'FechaFinPrevista', 'Tecnicos', 'Fase'],
    optional: {
      Proceso: null,
      FechaIniReal: null,
      FechaFinReal: null,
      TiempoPrevisto: 0,
      TecnicoPrev: 0,
      Observaciones: null,
      RutaDOC: null,
      TipoDeHora: 1,
      Presencial: 1,
      Disponible: 1,
      CosteEmpresa: 1,
      FechaAviso: null,
      HoraAviso: null,
      UsuredAviso: null,
      UsuredResp: 'BR00',
      UsuredRespRev: 'BR00',
      Recursos: null,
      Diseno: 'N',
      IdDpto: 5,
      ComentarioOblig: 0,
      Cliente: 'ELECNOR',
      IdDptoClte: null,
      IdAplicacion: null,
      FechaEstimacion: null,
      TareaTecnica: 1,
      ObservacionEstExt: null,
      Hito: 0,
      DesplazamientoPS: 0,
      Herramienta: null,
      Protegida: 0,
      FaseAnterior: null
    }
  }
};

export function escapeSQL(valor: string | null | undefined): string {
  if (!valor) return '';
  validarSeguroSQL(valor);
  return valor.replace(/'/g, "''").replace(/\\/g, '\\\\');
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

function parseDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  // Try DD/MM/YYYY (Spanish format) first
  const parts = dateString.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  // Fallback to JS Date parsing (ISO format)
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

function formatToYYYYMMDD(dateString: string | undefined | null): string {
  const date = parseDate(dateString);
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

function getFirstDayOfMonthYYYYMMDD(dateString: string | undefined | null): string {
  const date = parseDate(dateString);
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}${month}01`;
}

export interface TimeEntryParams {
  usuario: string;
  fechaInicio: string;
  horaInicio: string;
  horaFin: string;
  minutos: number;
  idProceso: number;
  tipoHora: number;
  descripcion?: string;
}

export function generateSQLStatement(params: TimeEntryParams): string {
  const {
    usuario,
    fechaInicio,
    horaInicio,
    horaFin,
    minutos,
    idProceso,
    tipoHora,
    descripcion = ''
  } = params;

  return `SET DATEFORMAT dmy; exec spNETTiempos_Alta @Usured='${escapeSQL(usuario)}', @Fecha='${fechaInicio}', @HoraDesde='${horaInicio}', @HoraHasta='${horaFin}', @Minutos=${minutos}, @Proceso=${idProceso}, @pParteSalida=NULL, @pGastos=0, @pKms=0, @pTipoHora=${tipoHora}, @ClienteComercial=NULL, @Comentario='${escapeSQL(descripcion)}', @pCambio=NULL, @pTeleTrabajo=0, @ObservacionesCalidad=NULL, @Rapport=0, @RapportCheck=0, @VBPermisoUsured=NULL, @VBPermisoFechaHora=NULL, @ObservacionesPermiso=NULL, @Ticket=NULL, @EsTeleTrabajo=1, @pMarcajeIP_INI=0, @pMarcajeIP_FIN=0, @pObservacionesPseudoMarcaje=NULL, @pTiempoNoReconocido=0, @pObservacionesRegistroHorario=NULL`;
}

export interface TaskSQLParams {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  minutos: number;
  usuario: string;
  fase?: string | null;
  cliente?: string;
  tipoHora?: number;
  presencial?: number;
  disponible?: number;
}

export function generateTaskSQLInternal(params: TaskSQLParams): string {
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
  const faseValue = fase ? `'${escapeSQL(fase)}'` : `'${escapeSQL(usuario)}'`;

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
    @pDiseno = 'N',
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

export interface ImportConfig {
  usuario: string;
  tipoHora: string | number;
}

export function adaptClockifyEntry(entry: any, taskMapping: Record<string, string>, config: ImportConfig): TimeEntryParams {
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
  formatISOToSQLDate(end);
  const horaFin = formatISOToSQLTime(end);
  
  return {
    usuario: config.usuario,
    fechaInicio,
    horaInicio,
    horaFin,
    minutos,
    idProceso,
    tipoHora: typeof config.tipoHora === 'string' ? parseInt(config.tipoHora, 10) || 11 : config.tipoHora,
    descripcion: description
  };
}

export interface SQLError {
  line?: number;
  index?: number;
  message: string;
}

export interface SQLGenerationResult {
  sql: string;
  statements: string[];
  processed: number;
  errors: SQLError[];
  total: number;
}

export function generateTimeEntrySQL(entries: any[], taskMapping: Record<string, string>, config: ImportConfig): SQLGenerationResult {
  const sqlStatements: string[] = [];
  const errors: SQLError[] = [];
  let processed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const lineaNum = i + 2;

    try {
      const taskName = entry.task;
      if (!taskName || !taskMapping[taskName]) {
        errors.push({
          line: lineaNum,
          message: `Tarea no encontrada en mapeo: "${taskName?.substring(0, 30)}..."`
        });
        continue;
      }

      const idProceso = validarIdProceso(taskMapping[taskName]);
      const minutos = decimalHorasAMinutos(entry.duracionDecimal);
      const fechaInicioValidada = validarFecha(entry.fechaInicio);
      const horaInicioValidada = validarHora(entry.horaInicio);
      // const fechaFinValidada = validarFecha(entry.fechaFin);
      // const horaFinValidada = validarHora(entry.horaFin);

      const sql = generateSQLStatement({
        usuario: config.usuario,
        fechaInicio: fechaInicioValidada,
        horaInicio: horaInicioValidada,
        horaFin: entry.horaFin, // Not strictly validated by regex in original code if using simple gen
        minutos,
        idProceso,
        tipoHora: typeof config.tipoHora === 'string' ? parseInt(config.tipoHora, 10) || 11 : config.tipoHora,
        descripcion: entry.descripcion || ''
      });

      sqlStatements.push(sql);
      processed++;
    } catch (error: any) {
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
    total: entries.length
  };
}

export function generateTaskSQL(task: TaskSQLParams): string {
  return generateTaskSQLInternal(task);
}

export function generateFromSource(source: any, taskMapping: Record<string, string>, config: ImportConfig): SQLGenerationResult {
  if (source.timeInterval) {
    const adaptedParams = adaptClockifyEntry(source, taskMapping, config);
    const sql = generateSQLStatement(adaptedParams);
    return {
      sql,
      statements: [sql],
      processed: 1,
      errors: [],
      total: 1
    };
  }

  throw new Error('Unsupported source format');
}

export function generateSQLFromObjects(params: { entries: any[], taskMapping: Record<string, string>, config: ImportConfig }): SQLGenerationResult {
  const { entries, taskMapping, config } = params;
  
  const sqlStatements: string[] = [];
  const errors: SQLError[] = [];
  let processed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    try {
      const adaptedParams = adaptClockifyEntry(entry, taskMapping, config);
      
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
    } catch (error: any) {
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

export function generateSQL(params: { rows: string[][], taskMapping: Record<string, string>, config: ImportConfig, indices: any }): SQLGenerationResult {
  const { rows, taskMapping, config, indices } = params;
  
  const entries = rows.map(row => ({
    task: row[indices.tarea]?.trim(),
    descripcion: indices.descripcion !== -1 ? row[indices.descripcion]?.trim() || '' : '',
    fechaInicio: row[indices.fechaInicio]?.trim(),
    horaInicio: row[indices.horaInicio]?.trim(),
    fechaFin: row[indices.fechaFin]?.trim(),
    horaFin: row[indices.horaFin]?.trim(),
    duracionDecimal: row[indices.duracionDecimal]?.trim()
  }));

  return generateTimeEntrySQL(entries, taskMapping, config);
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
