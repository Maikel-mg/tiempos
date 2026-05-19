import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TreeNodeInfo, TreeNodeType } from './ProjectTree';
import type { 
  ProjectTreeDisciplina, 
  ProjectTreeFase, 
  ProjectTreeProceso 
} from '../types';
import { Folder, Layers, FileText, Hash, GripHorizontal } from 'lucide-react';

interface NodeInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: TreeNodeInfo | null;
}

function getNodeIcon(type: TreeNodeType) {
  switch (type) {
    case 'disciplina':
      return <Folder className="h-5 w-5" />;
    case 'fase':
      return <Layers className="h-5 w-5" />;
    case 'proceso':
      return <FileText className="h-5 w-5" />;
  }
}

function getNodeColor(type: TreeNodeType) {
  switch (type) {
    case 'disciplina':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30';
    case 'fase':
      return 'text-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
    case 'proceso':
      return 'text-green-600 bg-green-50 dark:bg-green-950/30';
  }
}

function getTypeLabel(type: TreeNodeType): string {
  switch (type) {
    case 'disciplina':
      return 'Disciplina';
    case 'fase':
      return 'Fase';
    case 'proceso':
      return 'Proceso';
  }
}

function renderDisciplinaInfo(disciplina: ProjectTreeDisciplina) {
  const totalFases = disciplina.fases.length;
  const totalProcesos = disciplina.fases.reduce((acc, f) => acc + f.procesos.length, 0);
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground">ID Disciplina</label>
          <p className="flex items-center gap-2 font-mono">
            <Hash className="h-3 w-3" />
            {disciplina.idDisciplina}
          </p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Orden</label>
          <p className="flex items-center gap-2">
            <GripHorizontal className="h-3 w-3" />
            {disciplina.orden}
          </p>
        </div>
      </div>
      
      <Separator />
      
      <div>
        <label className="text-xs text-muted-foreground">Estado</label>
        <div className="mt-1">
          {disciplina.sinDisciplina ? (
            <Badge variant="outline">Sin Disciplina</Badge>
          ) : (
            <Badge variant="secondary">Activa</Badge>
          )}
        </div>
      </div>
      
      <Separator />
      
      <div>
        <label className="text-xs text-muted-foreground">Resumen</label>
        <p className="text-sm mt-1">
          {totalFases} {totalFases === 1 ? 'fase' : 'fases'} • {totalProcesos} {totalProcesos === 1 ? 'proceso' : 'procesos'}
        </p>
      </div>
      
      {disciplina.fases.length > 0 && (
        <>
          <Separator />
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Fases</label>
            <div className="space-y-2">
              {disciplina.fases.map((f) => (
                <div key={f.fase} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                  <span>{f.nombre}</span>
                  {f.cerrado && <Badge variant="secondary" className="text-xs">Cerrada</Badge>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function renderFaseInfo(fase: ProjectTreeFase, path: string[]) {
  const disciplinaName = path[0] || 'N/A';
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground">ID Fase</label>
          <p className="flex items-center gap-2 font-mono">
            <Hash className="h-3 w-3" />
            {fase.fase}
          </p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Orden</label>
          <p className="flex items-center gap-2">
            <GripHorizontal className="h-3 w-3" />
            {fase.orden}
          </p>
        </div>
      </div>
      
      <Separator />
      
      <div>
        <label className="text-xs text-muted-foreground">Disciplina Padre</label>
        <p className="text-sm mt-1">{disciplinaName}</p>
      </div>
      
      <Separator />
      
      <div>
        <label className="text-xs text-muted-foreground">Estado</label>
        <div className="mt-1">
          {fase.cerrado ? (
            <Badge variant="destructive">Cerrada</Badge>
          ) : (
            <Badge variant="secondary">Activa</Badge>
          )}
        </div>
      </div>
      
      <Separator />
      
      <div>
        <label className="text-xs text-muted-foreground">Procesos</label>
        <p className="text-sm mt-1">
          {fase.procesos.length} {fase.procesos.length === 1 ? 'proceso' : 'procesos'}
        </p>
      </div>
      
      {fase.procesos.length > 0 && (
        <>
          <Separator />
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Lista de Procesos</label>
            <div className="space-y-1">
              {fase.procesos.map((p) => (
                <div key={p.proceso} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                  <span>{p.nombre}</span>
                  <span className="text-xs text-muted-foreground">#{p.proceso}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function renderProcesoInfo(proceso: ProjectTreeProceso, path: string[]) {
  const disciplinaName = path[0] || 'N/A';
  const faseName = path[1] || 'N/A';
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground">ID Proceso</label>
        <p className="flex items-center gap-2 font-mono text-lg">
          <Hash className="h-4 w-4" />
          {proceso.proceso}
        </p>
      </div>
      
      <Separator />
      
      <div>
        <label className="text-xs text-muted-foreground">Nombre</label>
        <p className="text-sm mt-1">{proceso.nombre}</p>
      </div>
      
      <Separator />
      
      <div>
        <label className="text-xs text-muted-foreground">Ubicación</label>
        <div className="mt-1 space-y-1">
          <p className="text-sm">
            <span className="text-muted-foreground">Disciplina: </span>
            {disciplinaName}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Fase: </span>
            {faseName}
          </p>
        </div>
      </div>
    </div>
  );
}

export function NodeInfoDrawer({ open, onOpenChange, node }: NodeInfoDrawerProps) {
  if (!node) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Información</SheetTitle>
            <SheetDescription>
              Selecciona un nodo para ver su información
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const { type, label, rawData, path } = node;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <span className={`p-1.5 rounded ${getNodeColor(type)}`}>
              {getNodeIcon(type)}
            </span>
            {label}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <Badge variant="outline" className="mt-1">
              {getTypeLabel(type)}
            </Badge>
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-180px)]">
          {type === 'disciplina' && renderDisciplinaInfo(rawData as ProjectTreeDisciplina)}
          {type === 'fase' && renderFaseInfo(rawData as ProjectTreeFase, path)}
          {type === 'proceso' && renderProcesoInfo(rawData as ProjectTreeProceso, path)}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}