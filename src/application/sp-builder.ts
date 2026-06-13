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
