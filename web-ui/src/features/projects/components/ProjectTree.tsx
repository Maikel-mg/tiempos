import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Layers, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { 
  ProjectTreeResponse, 
  ProjectTreeDisciplina, 
  ProjectTreeFase, 
  ProjectTreeProceso 
} from '../types';

interface ProjectTreeProps {
  data: ProjectTreeResponse;
  onNodeClick?: (node: TreeNodeInfo) => void;
}

export type TreeNodeType = 'disciplina' | 'fase' | 'proceso';

export interface TreeNodeInfo {
  type: TreeNodeType;
  id: string;
  label: string;
  rawData: ProjectTreeDisciplina | ProjectTreeFase | ProjectTreeProceso;
  path: string[];
}

export function ProjectTree({ data, onNodeClick }: ProjectTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleNodeClick = useCallback((
    type: TreeNodeType,
    id: string | number,
    label: string,
    rawData: ProjectTreeDisciplina | ProjectTreeFase | ProjectTreeProceso,
    path: string[]
  ) => {
    if (onNodeClick) {
      onNodeClick({
        type,
        id: String(id),
        label,
        rawData,
        path,
      });
    }
  }, [onNodeClick]);

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estructura del Proyecto</CardTitle>
          <CardDescription>No hay datos del proyecto</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calcular estadísticas
  const totalDisciplinas = data.disciplinas.length;
  const totalFases = data.disciplinas.reduce((acc, d) => acc + d.fases.length, 0);
  const totalProcesos = data.disciplinas.reduce(
    (acc, d) => acc + d.fases.reduce((_fa, f) => acc + f.procesos.length, 0),
    0
  );

  // Inicializar todos los nodos expandidos por defecto
  const initialExpanded = new Set<string>();
  data.disciplinas.forEach((d) => {
    initialExpanded.add(`disciplina-${d.idDisciplina}`);
    d.fases.forEach((f) => {
      initialExpanded.add(`fase-${f.fase}`);
    });
  });
  
  // Si no hay nada expandido, expandir todo
  if (expandedNodes.size === 0) {
    setExpandedNodes(initialExpanded);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{data.proyecto.nomProy}</CardTitle>
            <CardDescription className="mt-1">
              {data.cliente.nomCliente}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {data.proyecto.cerrado && (
              <Badge variant="destructive">Cerrado</Badge>
            )}
            {data.proyecto.cmmi && (
              <Badge variant="outline">CMMI</Badge>
            )}
            {data.proyecto.esCM && (
              <Badge variant="secondary">CM</Badge>
            )}
            {data.proyecto.esPET && (
              <Badge variant="outline">PET</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          <span>{totalDisciplinas} disciplinas</span>
          <span>•</span>
          <span>{totalFases} fases</span>
          <span>•</span>
          <span>{totalProcesos} procesos</span>
        </div>
      </CardHeader>
      
      <ScrollArea className="h-[500px]">
        <div className="p-4 pt-0 space-y-2">
          {data.disciplinas.map((disciplina) => (
            <DisciplinaNode
              key={disciplina.idDisciplina}
              disciplina={disciplina}
              isExpanded={expandedNodes.has(`disciplina-${disciplina.idDisciplina}`)}
              onToggle={() => toggleNode(`disciplina-${disciplina.idDisciplina}`)}
              onNodeClick={handleNodeClick}
            />
          ))}
          
          {data.disciplinas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No hay disciplinas definidas para este proyecto
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

interface DisciplinaNodeProps {
  disciplina: ProjectTreeDisciplina;
  isExpanded: boolean;
  onToggle: () => void;
  onNodeClick: (
    type: TreeNodeType,
    id: string | number,
    label: string,
    rawData: ProjectTreeDisciplina | ProjectTreeFase | ProjectTreeProceso,
    path: string[]
  ) => void;
}

function DisciplinaNode({ disciplina, isExpanded, onToggle, onNodeClick }: DisciplinaNodeProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Disciplina Header - click to expand/collapse */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-blue-600" />
          ) : (
            <ChevronRight className="h-5 w-5 text-blue-600" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-5 w-5 text-blue-600" />
          ) : (
            <Folder className="h-5 w-5 text-blue-600" />
          )}
          <span className="font-semibold">{disciplina.nombre}</span>
          {disciplina.sinDisciplina && (
            <Badge variant="outline" className="ml-1 text-xs">Sin Disciplina</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {disciplina.fases.length} {disciplina.fases.length === 1 ? 'fase' : 'fases'}
          </span>
        </div>
      </button>

      {/* Click on label área to show info - separate from expand toggle */}
      <div className="relative">
        <button
          onClick={() => onNodeClick('disciplina', disciplina.idDisciplina, disciplina.nombre, disciplina, [disciplina.nombre])}
          className="absolute right-3 top-[-36px] p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600"
          title="Ver información"
        >
          <span className="text-xs font-medium">Info</span>
        </button>
      </div>
      
      {/* Fases container */}
      {isExpanded && disciplina.fases.length > 0 && (
        <div className="border-t bg-background">
          <div className="divide-y">
            {disciplina.fases.map((fase) => (
              <FaseNode
                key={fase.fase}
                fase={fase}
                disciplinaNombre={disciplina.nombre}
                onNodeClick={onNodeClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface FaseNodeProps {
  fase: ProjectTreeFase;
  disciplinaNombre: string;
  onNodeClick: (
    type: TreeNodeType,
    id: string | number,
    label: string,
    rawData: ProjectTreeDisciplina | ProjectTreeFase | ProjectTreeProceso,
    path: string[]
  ) => void;
}

function FaseNode({ fase, disciplinaNombre, onNodeClick }: FaseNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="border-l-2 border-blue-200 ml-4">
      {/* Fase Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Layers className="h-4 w-4 text-blue-400" />
          <span className="font-medium">{fase.nombre}</span>
          {fase.cerrado && (
            <Badge variant="secondary" className="ml-1 text-xs">Cerrada</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {fase.procesos.length} {fase.procesos.length === 1 ? 'proceso' : 'procesos'}
          </span>
        </div>
      </button>

      {/* Click on label to show info */}
      <div className="relative">
        <button
          onClick={() => onNodeClick('fase', fase.fase, fase.nombre, fase, [disciplinaNombre, fase.nombre])}
          className="absolute right-3 top-[-28px] p-1 rounded hover:bg-muted text-muted-foreground"
          title="Ver información"
        >
          <span className="text-xs">Info</span>
        </button>
      </div>
      
      {/* Procesos container */}
      {isExpanded && fase.procesos.length > 0 && (
        <div className="border-t bg-muted/20">
          <div className="divide-y">
            {fase.procesos.map((proceso) => (
              <ProcesoNode
                key={proceso.proceso}
                proceso={proceso}
                disciplinaNombre={disciplinaNombre}
                faseNombre={fase.nombre}
                onNodeClick={onNodeClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ProcesoNodeProps {
  proceso: ProjectTreeProceso;
  disciplinaNombre: string;
  faseNombre: string;
  onNodeClick: (
    type: TreeNodeType,
    id: string | number,
    label: string,
    rawData: ProjectTreeDisciplina | ProjectTreeFase | ProjectTreeProceso,
    path: string[]
  ) => void;
}

function ProcesoNode({ proceso, disciplinaNombre, faseNombre, onNodeClick }: ProcesoNodeProps) {
  return (
    <button
      onClick={() => onNodeClick('proceso', proceso.proceso, proceso.nombre, proceso, [disciplinaNombre, faseNombre, proceso.nombre])}
      className="w-full flex items-center gap-2 p-2 pl-8 hover:bg-muted/50 transition-colors text-left"
    >
      <FileText className="h-4 w-4 text-green-400" />
      <span className="font-normal text-sm">{proceso.nombre}</span>
      <span className="text-xs text-muted-foreground ml-auto">#{proceso.proceso}</span>
    </button>
  );
}