/**
 * Tree transformer module — pure function that converts 5 SP resultsets
 * into a hierarchical projects tree structure.
 *
 * Extracted from server.ts (issue #86).
 */

// ---------------------------------------------------------------------------
// Input types (resultset shapes from SP)
// ---------------------------------------------------------------------------

interface ClienteData {
  CodCli: number;
  Cliente: string;
  NomCliente: string;
}

interface ProyectoData {
  CodCli: number;
  Proyecto: number;
  NomProy: string;
  Cerrado: boolean;
  CMMI: boolean;
  EsCM: boolean;
  EsPET: boolean;
}

interface DisciplinaData {
  Proyecto: number;
  IdDisciplina: number;
  Disciplina: string;
  SinDisciplina: boolean;
  Orden: number;
}

interface FaseData {
  Proyecto: number;
  Fase: number;
  Nombre: string;
  Cerrado: boolean;
  Disciplina: number;
  Orden: number;
}

interface ProcesoData {
  Fase: number;
  Proceso: number;
  Nombre: string;
}

// ---------------------------------------------------------------------------
// Output types (hierarchical tree)
// ---------------------------------------------------------------------------

interface ProcesoNode {
  proceso: number;
  nombre: string;
}

interface FaseNode {
  fase: number;
  nombre: string;
  cerrado: boolean;
  orden: number;
  procesos: ProcesoNode[];
}

interface DisciplinaNode {
  idDisciplina: number;
  nombre: string;
  sinDisciplina: boolean;
  orden: number;
  fases: FaseNode[];
}

interface ProjectsTreeResponse {
  cliente: ClienteData;
  proyecto: ProyectoData;
  disciplinas: DisciplinaNode[];
}

// ---------------------------------------------------------------------------
// Transformer
// ---------------------------------------------------------------------------

/**
 * Transforma los 5 resultsets del SP a estructura jerárquica.
 *
 * @param results - Array de 5 recordsets del SP:
 *   [0] Cliente  (CodCli, Cliente, NomCliente)
 *   [1] Proyecto (CodCli, Proyecto, NomProy, Cerrado, CMMI, EsCM, EsPET)
 *   [2] Disciplinas (Proyecto, IdDisciplina, Disciplina, SinDisciplina, Orden)
 *   [3] Fases (Proyecto, Fase, Nombre, Cerrado, Disciplina, Orden)
 *   [4] Procesos (Fase, Proceso, Nombre)
 *
 * @returns Estructura jerárquica de proyectos
 */
export function transformToTreeStructure(results: any[]): ProjectsTreeResponse {
  // Extraer los 5 resultsets con los índices correctos
  const clientes = (results[0] || []) as ClienteData[];
  const proyectos = (results[1] || []) as ProyectoData[];
  const disciplinasRaw = (results[2] || []) as DisciplinaData[];
  const fasesRaw = (results[3] || []) as FaseData[];
  const procesosRaw = (results[4] || []) as ProcesoData[];

  // Obtener cliente y proyecto (típicamente hay solo uno)
  const cliente = clientes[0] || { CodCli: 0, Cliente: '', NomCliente: '' };
  const proyecto = proyectos[0] || {
    CodCli: 0,
    Proyecto: 0,
    NomProy: '',
    Cerrado: false,
    CMMI: false,
    EsCM: false,
    EsPET: false,
  };

  // Crear mapa de disciplinas por idDisciplina
  const disciplinasMap = new Map<number, DisciplinaNode>();

  for (const disc of disciplinasRaw) {
    if (!disciplinasMap.has(disc.IdDisciplina)) {
      disciplinasMap.set(disc.IdDisciplina, {
        idDisciplina: disc.IdDisciplina,
        nombre: disc.Disciplina,
        sinDisciplina: disc.SinDisciplina,
        orden: disc.Orden,
        fases: [],
      });
    }
  }

  // Crear mapa de fases por fase
  const fasesMap = new Map<number, FaseNode>();

  for (const fase of fasesRaw) {
    fasesMap.set(fase.Fase, {
      fase: fase.Fase,
      nombre: fase.Nombre,
      cerrado: fase.Cerrado,
      orden: fase.Orden,
      procesos: [],
    });
  }

  // Asignar fases a disciplinas (por Disciplina de la fase = IdDisciplina)
  for (const fase of fasesRaw) {
    const faseNode = fasesMap.get(fase.Fase);
    const disciplinaNode = disciplinasMap.get(fase.Disciplina);
    if (faseNode && disciplinaNode) {
      disciplinaNode.fases.push(faseNode);
    }
  }

  // Asignar procesos a fases (por Fase del proceso)
  for (const proc of procesosRaw) {
    const faseNode = fasesMap.get(proc.Fase);
    if (faseNode) {
      faseNode.procesos.push({
        proceso: proc.Proceso,
        nombre: proc.Nombre,
      });
    }
  }

  // Convertir mapa de disciplinas a array, ordenado por orden
  const disciplinas = Array.from(disciplinasMap.values()).sort(
    (a, b) => a.orden - b.orden,
  );

  return {
    cliente,
    proyecto,
    disciplinas,
  };
}

// Re-export types for consumers
export type {
  ProjectsTreeResponse,
  DisciplinaNode,
  FaseNode,
  ProcesoNode,
};
