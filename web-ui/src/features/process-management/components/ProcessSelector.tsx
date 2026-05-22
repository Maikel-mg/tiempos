import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useProjectTree } from '@/features/projects/hooks/use-project-tree';
import type { ProjectTreeDisciplina, ProjectTreeFase, ProjectTreeProceso } from '@/features/projects/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, X } from 'lucide-react';
import type { Project } from '@/features/projects/types';

export interface ProcessSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (projectCode: string, processName: string) => void;
  usuario?: string;
}

export function ProcessSelector({ open, onOpenChange, usuario }: ProcessSelectorProps) {
  const [view, setView] = useState<'projects' | 'processes'>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [processSearchTerm, setProcessSearchTerm] = useState('');
  
  const queryResult = useProjects(usuario ? { usured: usuario } : undefined);
  const projects = (queryResult.data as Project[] | undefined) ?? [];
  const isLoadingProjects = queryResult.isLoading;
  const isErrorProjects = queryResult.isError;

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('ProcessSelector projects:', projects);
  }

  const { data: treeResponse, isLoading: isLoadingTree, isError: isErrorTree, error: treeError } = useProjectTree({
    codCli: selectedProject?.CodCli || '',
    proyecto: selectedProject?.Proyecto || ''
  });

  // Extract the actual tree data from the response wrapper
  const projectTree = treeResponse ?? { disciplinas: [] as any[] };
  console.log(`TCL ~ ProcessSelector ~ projectTree ~ ssss:`, projectTree)
  console.log(`TCL ~ ProcessSelector ~ treeResponse ~ ssss:`, treeResponse)

   const flattenedProcesses = useMemo(() => {
    console.log(`TCL ~ ProcessSelector ~ flattenedProcesses ~ projectTree:`, projectTree)
    const disciplinas = projectTree?.disciplinas;
    if (!disciplinas) return [];
     
    const flat: Array<{ id: number; nombre: string; ruta: string }> = [];
     
    disciplinas.forEach((disciplina: ProjectTreeDisciplina) => {
      disciplina.fases.forEach((fase: ProjectTreeFase) => {
        fase.procesos.forEach((proceso: ProjectTreeProceso) => {
          flat.push({
            id: proceso.proceso,
            nombre: proceso.nombre,
            ruta: `${disciplina.nombre} / ${fase.nombre}`
          });
        });
      });
    });
     
    return flat;
  }, [projectTree]);

   const filteredProjects = useMemo(() => {
     if (!projectSearchTerm.trim()) return projects;
     const term = projectSearchTerm.toLowerCase();
     return projects.filter(p =>
       p?.NomProy?.toLowerCase().includes(term) ||
       p?.Proyecto?.toString().toLowerCase().includes(term)
     );
   }, [projects, projectSearchTerm]);

   const filteredProcesses = useMemo(() => {
     if (!processSearchTerm.trim()) return flattenedProcesses;
     const term = processSearchTerm.toLowerCase();
     return flattenedProcesses.filter(proc =>
       proc.id.toString().includes(term) ||
       proc.nombre.toLowerCase().includes(term) ||
       proc.ruta.toLowerCase().includes(term)
     );
   }, [flattenedProcesses, processSearchTerm]);

  const handleEscape = useCallback(() => {
    if (view === 'processes') {
      setView('projects');
      setSelectedProject(null);
    } else {
      onOpenChange(false);
    }
  }, [view, onOpenChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleEscape();
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleEscape]);

   // Reset view when opening
   useEffect(() => {
     if (open) {
       setView('projects');
       setSelectedProject(null);
       setProjectSearchTerm('');
       setProcessSearchTerm('');
     }
   }, [open]);

   // Reset search term of opposite view when view changes
   useEffect(() => {
     if (view === 'projects') {
       setProcessSearchTerm('');
     } else {
       setProjectSearchTerm('');
     }
   }, [view]);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setView('processes');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Seleccionar ID de Tarea</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {view === 'projects' ? (
            <div className="space-y-4">
              {isLoadingProjects ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Cargando proyectos...</span>
                </div>
              ) : isErrorProjects ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error al cargar proyectos</AlertTitle>
                  <AlertDescription>
                    No se pudieron cargar los proyectos. Verifique su configuración de base de datos.
                  </AlertDescription>
                 </Alert>
               ) : (
                 <>
                   <div className="flex items-center gap-2">
                     <Input
                       id="project-search"
                       placeholder="Buscar proyectos..."
                       value={projectSearchTerm}
                       onChange={(e) => setProjectSearchTerm(e.target.value)}
                       aria-label="Buscar proyectos por nombre o código"
                       className="max-w-sm"
                     />
                     {projectSearchTerm && (
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => setProjectSearchTerm('')}
                         aria-label="Limpiar búsqueda de proyectos"
                       >
                         <X className="h-4 w-4" />
                       </Button>
                     )}
                   </div>
                   <ScrollArea className="h-[400px] border rounded-lg">
                     <Table>
                       <TableHeader className="sticky top-0 bg-background z-10">
                         <TableRow>
                           <TableHead>Cliente</TableHead>
                           <TableHead>Proyecto</TableHead>
                           <TableHead>Código</TableHead>
                      </TableRow>
                    </TableHeader>
                      <TableBody>
                        {filteredProjects.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              No se encontraron proyectos
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredProjects.map((project: Project) => (
                            <TableRow
                              key={`${project.CodCli}-${project.Proyecto}`}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleProjectClick(project)}
                            >
                              <TableCell>{project.NomCliente}</TableCell>
                              <TableCell>{project.NomProy}</TableCell>
                              <TableCell>{project.Proyecto}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                   </Table>
                 </ScrollArea>
                 </>
               )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground">
                  Procesos para: {selectedProject?.NomProy}
                </h3>
                <button 
                  onClick={() => {
                    setView('projects');
                    setSelectedProject(null);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Volver a proyectos
                </button>
              </div>

              {isLoadingTree ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Cargando procesos...</span>
                </div>
              ) : isErrorTree ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error al cargar los procesos</AlertTitle>
                  <AlertDescription>
                    {treeError instanceof Error ? treeError.message : String(treeError)}
                  </AlertDescription>
                </Alert>
               ) : (
                 <>
                   <div className="flex items-center gap-2">
                     <Input
                       id="process-search"
                       placeholder="Buscar procesos..."
                       value={processSearchTerm}
                       onChange={(e) => setProcessSearchTerm(e.target.value)}
                       aria-label="Buscar procesos por ID, nombre o ruta"
                       className="max-w-sm"
                     />
                     {processSearchTerm && (
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => setProcessSearchTerm('')}
                         aria-label="Limpiar búsqueda de procesos"
                       >
                         <X className="h-4 w-4" />
                       </Button>
                     )}
                   </div>
                   <ScrollArea className="h-[400px] border rounded-lg">
                     <Table>
                       <TableHeader className="sticky top-0 bg-background z-10">
                         <TableRow>
                           <TableHead className="w-[80px]">ID</TableHead>
                           <TableHead>Proceso</TableHead>
                           <TableHead>Ruta</TableHead>
                      </TableRow>
                    </TableHeader>
                      <TableBody>
                        {filteredProcesses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              No se encontraron procesos
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredProcesses.map((proc) => (
                            <TableRow
                              key={proc.id}
                              className="cursor-pointer hover:bg-muted/50"
                            >
                              <TableCell className="font-mono text-xs">{proc.id}</TableCell>
                              <TableCell>{proc.nombre}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{proc.ruta}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                   </Table>
                 </ScrollArea>
                 </>
               )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
