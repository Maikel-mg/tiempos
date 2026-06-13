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
    const normalizedFecha = pFecha.replace(/\//g, '-');
    const parts = normalizedFecha.split('-');

    if (parts.length === 3) {
      const firstPart = parseInt(parts[0], 10);
      const secondPart = parseInt(parts[1], 10);
      const thirdPart = parseInt(parts[2], 10);

      let year: string, month: string, day: string;

      if (firstPart > 99) {
        year = parts[0]; month = parts[1]; day = parts[2];
      } else if (secondPart > 12) {
        year = parts[2]; month = parts[0]; day = parts[1];
      } else if (thirdPart > 99) {
        year = parts[2]; month = parts[1]; day = parts[0];
      } else {
        year = parts[0]; month = parts[1]; day = parts[2];
      }

      pFechaYYYYMMDD = `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
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
