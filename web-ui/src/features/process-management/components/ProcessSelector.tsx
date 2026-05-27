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
  onCreateNew?: (data: { fases: Array<{ id: string; label: string }>; usuario: string; projectInfo?: Project }) => void;
  usuario?: string;
  value?: string;
}

export function ProcessSelector({ open, onOpenChange, onSelect, onCreateNew, usuario, value }: ProcessSelectorProps) {
  const [view, setView] = useState<'projects' | 'processes'>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [processSearchTerm, setProcessSearchTerm] = useState('');
  const [projectSelectedIndex, setProjectSelectedIndex] = useState(0);
  const [processSelectedIndex, setProcessSelectedIndex] = useState(0);
  
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
  const projectTree = treeResponse?.data ?? { disciplinas: [] as any[] };

   const phases = useMemo(() => {
    const disciplinas = projectTree?.disciplinas;
    if (!disciplinas) return [];

    const seen = new Set<string>();
    const result: Array<{ id: string; label: string }> = [];

    disciplinas.forEach((disciplina: ProjectTreeDisciplina) => {
      disciplina.fases.forEach((fase: ProjectTreeFase) => {
        const id = fase.fase.toString();
        if (!seen.has(id)) {
          seen.add(id);
          result.push({
            id,
            label: `${disciplina.nombre} / ${fase.nombre}`
          });
        }
      });
    });

    return result;
  }, [projectTree]);

   const flattenedProcesses = useMemo(() => {
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

  // Reset view when opening
   useEffect(() => {
     if (open) {
       setView('projects');
       setSelectedProject(null);
       setProjectSearchTerm('');
       setProcessSearchTerm('');
       setProjectSelectedIndex(0);
       setProcessSelectedIndex(0);
     }
   }, [open]);

   // When changing views, clear the search term of the view being left
   useEffect(() => {
     if (view === 'processes') {
       // Going from L1 to L2 - clear L1 search
       setProjectSearchTerm('');
     } else {
       // Going from L2 to L1 - clear L2 search
       setProcessSearchTerm('');
     }
   }, [view]);

   // Reset project selection index when filter changes
   useEffect(() => {
     setProjectSelectedIndex(0);
   }, [projectSearchTerm]);

   // Reset process selection index when filter changes
   useEffect(() => {
     setProcessSelectedIndex(0);
   }, [processSearchTerm]);

   const handleProjectClick = (project: Project, _index?: number) => {
     setSelectedProject(project);
     setView('processes');
     setProcessSelectedIndex(0);
   };

    const handleProcessSelect = useCallback((proc: { id: number; nombre: string; ruta: string }) => {
      if (selectedProject) {
        onSelect(selectedProject.Proyecto, proc.id.toString());
      }
    }, [selectedProject, onSelect]);

// Keyboard navigation handler
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (!open) return;
       
       // Handle Escape in input fields
       if (e.target instanceof HTMLInputElement) {
         if (e.key === 'Escape') {
           e.preventDefault();
           e.stopPropagation();
           
           // Get the input value
           const inputValue = (e.target as HTMLInputElement).value;
           
           if (inputValue) {
             // Has value - ask for confirmation before clearing
             if (window.confirm('¿Limpiar valor?')) {
               // Clear the appropriate search state based on input id
               if (e.target.id === 'project-search') {
                 setProjectSearchTerm('');
               } else if (e.target.id === 'process-search') {
                 setProcessSearchTerm('');
               }
             }
           } else {
             // Empty input - close dialog
             handleEscape();
           }
         }
         return;
       }

       if (e.key === 'ArrowDown') {
         e.preventDefault();
         if (view === 'projects') {
           setProjectSelectedIndex(prev => Math.min(prev + 1, Math.max(0, filteredProjects.length - 1)));
         } else {
           setProcessSelectedIndex(prev => Math.min(prev + 1, Math.max(0, filteredProcesses.length - 1)));
         }
       } else if (e.key === 'ArrowUp') {
         e.preventDefault();
         if (view === 'projects') {
           setProjectSelectedIndex(prev => Math.max(prev - 1, 0));
         } else {
           setProcessSelectedIndex(prev => Math.max(prev - 1, 0));
         }
       } else if (e.key === 'Enter') {
         e.preventDefault();
         if (view === 'projects' && filteredProjects.length > 0) {
           const project = filteredProjects[projectSelectedIndex];
           setSelectedProject(project);
           setView('processes');
           setProcessSelectedIndex(0);
         } else if (view === 'processes' && filteredProcesses.length > 0) {
           const proc = filteredProcesses[processSelectedIndex];
           handleProcessSelect(proc);
         }
       } else if (e.key === 'Escape') {
         handleEscape();
       }
     };

     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, [open, view, filteredProjects, filteredProcesses, projectSelectedIndex, processSelectedIndex, handleProcessSelect, handleEscape]);

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
                          onClick={() => {
                            if (window.confirm('¿Limpiar valor?')) {
                              setProjectSearchTerm('');
                            }
                          }}
                          aria-label="Limpiar búsqueda de proyectos"
                          className="opacity-0 focus:opacity-100 hover:opacity-100"
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
                          filteredProjects.map((project: Project, idx: number) => (
                            <TableRow
                              key={`${project.CodCli}-${project.Proyecto}`}
                              className="cursor-pointer hover:bg-muted/50"
                              data-state={idx === projectSelectedIndex ? 'selected' : undefined}
                              onClick={() => handleProjectClick(project, idx)}
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
                          onClick={() => {
                            if (window.confirm('¿Limpiar valor?')) {
                              setProcessSearchTerm('');
                            }
                          }}
                          aria-label="Limpiar búsqueda de procesos"
                          className="opacity-0 focus:opacity-100 hover:opacity-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {onCreateNew && (
                        <Button
                          variant="outline"
                          onClick={() => onCreateNew({ fases: phases, usuario: usuario || '', projectInfo: selectedProject || undefined })}
                        >
                          Nueva tarea
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
                          filteredProcesses.map((proc, idx: number) => (
                            <TableRow
                              key={proc.id}
                              className="cursor-pointer hover:bg-muted/50"
                              data-state={idx === processSelectedIndex ? 'selected' : undefined}
                              onClick={() => {
                                setProcessSelectedIndex(idx);
                                handleProcessSelect(proc);
                              }}
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
