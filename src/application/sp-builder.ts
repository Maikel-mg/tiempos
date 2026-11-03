import { parseAmbiguousDate } from '../domain/date-parser';

function escapeSQL(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildProjectsQuery(params: {
  fecha?: string;
  modoProc?: number;
  usured?: string;
}): string {
  const fechaInput = params.fecha || new Date().toISOString().split('T')[0];
  const pModoProc = params.modoProc ?? 1;
  const pUsured = params.usured || 'MG01';

  const [year, month, day] = fechaInput.split('-');
  const pFechaSpanish = `${day}/${month}/${year}`;

  return `SET LANGUAGE Spanish; SET DATEFORMAT dmy; EXEC spNETProyectos_SeleccionProyectos @pFecha = '${pFechaSpanish}', @pModoProc = ${pModoProc}, @pUsured = '${escapeSQL(pUsured)}';`;
}

export function buildProjectsTreeQuery(params: {
  codCli?: string;
  proyecto?: string;
  fecha?: string;
  modo?: number;
}): string {
  const pCodCli = params.codCli || null;
  const pProyecto = params.proyecto || null;
  const pFecha = params.fecha || new Date().toISOString().split('T')[0];
  const pModo = params.modo ?? 1;

  let pFechaYYYYMMDD: string | null = null;
  if (pFecha) {
    const parsed = parseAmbiguousDate(pFecha);
    if (parsed) {
      pFechaYYYYMMDD = parsed.yyyymmdd;
    }
  }

  const codCliSql = pCodCli ? `'${escapeSQL(String(pCodCli))}'` : 'NULL';
  const proyectoSql = pProyecto ? `'${escapeSQL(String(pProyecto))}'` : 'NULL';
  const fechaSql = pFechaYYYYMMDD ? `'${pFechaYYYYMMDD}'` : 'NULL';

  return `SET LANGUAGE Spanish; SET DATEFORMAT dmy; EXEC spNETProyectos_TreeProyectos @pClientes = ${codCliSql}, @pProyectos = ${proyectoSql}, @pFecha = ${fechaSql}, @pModo = ${pModo};`;
}

export function buildProcessesQuery(params: { usured: string }): string {
  const usuredSanitized = params.usured.trim().replace(/'/g, "''");
  return `SET LANGUAGE Spanish; SET DATEFORMAT dmy; EXEC spNETTiempos_SEL_TraerProcesos @pUsured = '${usuredSanitized}';`;
}

/** El SP de marcajes espera las fechas como YYMMDD sin separadores. */
function toYYMMDD(key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error(`Fecha inválida: ${key}`);
  return key.slice(2).replace(/-/g, '');
}

export function buildMarcajesQuery(params: {
  fechaDesde: string; // YYYY-MM-DD
  fechaHasta: string; // YYYY-MM-DD
  usured: string;
}): string {
  return `SET LANGUAGE Spanish; SET DATEFORMAT dmy; EXEC [dbo].[spControlHorario_VerUltimosMarcajesPersonal] @pFechaDesde = '${toYYMMDD(
    params.fechaDesde,
  )}', @pFechaHasta = '${toYYMMDD(params.fechaHasta)}', @pUsers = '${escapeSQL(params.usured.trim())}';`;
}

export interface TimeEntry {
  entryId: string;
  Usured: string;
  Fecha: string;       // YYYYMMDD
  HoraDesde: string;
  HoraHasta: string;
  Minutos: number;
  Proceso: number;
  pTipoHora?: number;
  Comentario?: string;
}

export interface CreateProcessDTO {
  nombre: string;
  fechaInicio: string;  // DD/MM/YYYY
  fechaFin: string;     // DD/MM/YYYY
  fechaEstimacion: string; // DD/MM/YYYY
  minutos: number;
  usuario: string;
  fase: string;
}

/**
 * Fecha en YYYYMMDD: el único formato que SQL Server interpreta igual con
 * cualquier DATEFORMAT. Acepta DD/MM/YYYY (lo que manda el formulario) e ISO
 * `YYYY-MM-DD`, con o sin hora: así están guardadas las tareas creadas sin
 * conexión por versiones anteriores. Una fecha que no existe en el calendario
 * (31/11/2026) o que no se reconoce va como cadena vacía: el alta no puede
 * morir con "Error al convertir el tipo de datos varchar a datetime".
 */
function toSQLDate(value: string | undefined): string {
  const raw = (value ?? '').slice(0, 10).trim();
  if (!raw) return '';
  const parsed = parseAmbiguousDate(raw);
  if (!parsed) return '';
  const day = Number(parsed.day);
  const month = Number(parsed.month);
  const date = new Date(Number(parsed.year), month - 1, day);
  const existe = date.getDate() === day && date.getMonth() === month - 1;
  return existe ? parsed.yyyymmdd : '';
}

export function buildCreateProcessSQL(dto: CreateProcessDTO): string {
  const nombre = escapeSQL(dto.nombre);
  const usured = escapeSQL(dto.usuario);
  const fase = escapeSQL(dto.fase);
  const minutos = dto.minutos;
  const fechaInicio = toSQLDate(dto.fechaInicio);
  const fechaFin = toSQLDate(dto.fechaFin);
  const fechaEstimacion = toSQLDate(dto.fechaEstimacion);

  return `SET LANGUAGE Spanish;\nSET DATEFORMAT dmy;\n\nDECLARE @p38 VARCHAR(200)\nSET @p38 = NULL\n\nEXEC spNETTiempos_Procesos_Mantenimiento\n    @pAccion = 'I',\n    @pProceso = NULL,\n    @pNombre = '${nombre}',\n    @pFechaIniPrevista = '${fechaInicio}',\n    @pFechaFinPrevista = '${fechaFin}',\n    @pFechaIniReal = NULL,\n    @pFechaFinReal = NULL,\n    @pTiempoPrevisto = ${minutos},\n    @pTecnicoPrev = ${minutos},\n    @pObservaciones = NULL,\n    @pRutaDOC = NULL,\n    @pTipoDeHora = 1,\n    @pPresencial = 1,\n    @pDisponible = 1,\n    @pCosteEmpresa = 1,\n    @pFechaAviso = NULL,\n    @pHoraAviso = NULL,\n    @pUsuredAviso = NULL,\n    @pUsuredResp = 'BR00',\n    @pUsuredRespRev = 'BR00',\n    @pRecursos = NULL,\n    @pDiseño = 'N',\n    @pTecnicos = '${usured}',\n    @pIdDpto = 5,\n    @pFase = '${fase}',\n    @pComentarioOblig = 0,\n    @pCliente = 'ELECNOR',\n    @pIdDptoClte = NULL,\n    @pIdAplicacion = NULL,\n    @pFechaEstimacion = '${fechaEstimacion}',\n    @pTareaTecnica = 1,\n    @pObservacionEstExt = NULL,\n    @pHito = 0,\n    @pDesplazamientoPS = 0,\n    @pHerramienta = NULL,\n    @pProtegida = 0,\n    @pFaseAnterior = NULL,\n    @Resultado = @p38 OUTPUT;\n\n-- El SP no devuelve el id: usa @Resultado como canal de resultado\n-- ('0|<mensaje>' si fue bien, '<código>|<error>' y ROLLBACK si no). El id se\n-- recupera por Fase + Nombre, que es la fila que acaba de insertar (Proceso es identidad).\n-- Ojo: @pFase y @pNombre son parámetros del SP, no variables de este batch.\nSELECT\n    CASE WHEN @p38 LIKE '0|%' THEN\n        (SELECT MAX(Proceso) FROM ProyectosFasesProcesos WHERE Fase = '${fase}' AND Nombre = '${nombre}')\n    END AS Proceso,\n    @p38 AS Mensaje;`;
}

export function buildExecuteTimeEntriesSQL(entries: TimeEntry[]): string {
  if (!entries || entries.length === 0) {
    return 'SET LANGUAGE Spanish;\nSET DATEFORMAT dmy;';
  }

  const execStatements = entries.map((entry) => {
    const usured = entry.Usured.replace(/'/g, "''");
    const comentario = (entry.Comentario ?? '').replace(/'/g, "''");
    const pTipoHora = entry.pTipoHora ?? 11;

    return `EXEC spNETTiempos_Alta @Usured='${usured}', @Fecha='${entry.Fecha}', @HoraDesde='${entry.HoraDesde}', @HoraHasta='${entry.HoraHasta}', @Minutos=${entry.Minutos}, @Proceso=${entry.Proceso}, @pParteSalida=NULL, @pGastos=0, @pKms=0, @pTipoHora=${pTipoHora}, @ClienteComercial=NULL, @Comentario='${comentario}', @pCambio=NULL, @pTeleTrabajo=0, @ObservacionesCalidad=NULL, @Rapport=0, @RapportCheck=0, @VBPermisoUsured=NULL, @VBPermisoFechaHora=NULL, @ObservacionesPermiso=NULL, @Ticket=NULL, @EsTeleTrabajo=1, @pMarcajeIP_INI=0, @pMarcajeIP_FIN=0, @pObservacionesPseudoMarcaje=NULL, @pTiempoNoReconocido=0, @pObservacionesRegistroHorario=NULL`;
  });

  return `SET LANGUAGE Spanish;\nSET DATEFORMAT dmy;\n\n${execStatements.join('\n\n')}`;
}
