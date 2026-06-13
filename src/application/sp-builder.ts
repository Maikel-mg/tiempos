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
