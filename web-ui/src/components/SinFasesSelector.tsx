import { useState, useMemo } from 'react';
import { Loader2, AlertCircle, Flag, Edit2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useProjectTree } from '@/features/projects/hooks/use-project-tree';
import type {
  Project,
  ProjectTreeDisciplina,
  ProjectTreeFase,
} from '@/features/projects/types';

export interface SinFasesSelectorProps {
  config: { usuario: string; fase: string } | null;
  onTaskChange: (updates: Partial<{ proyecto: string; fase: string }>) => void;
  disabled?: boolean;
}

export function SinFasesSelector({
  config,
  onTaskChange,
  disabled = false,
}: SinFasesSelectorProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');

  const {
    data: projects,
    isLoading: isLoadingProjects,
    isError: isErrorProjects,
  } = useProjects(config?.usuario ? { usured: config.usuario } : undefined);

  const {
    data: treeResponse,
    isLoading: isLoadingTree,
    isError: isErrorTree,
    error: treeError,
  } = useProjectTree({
    codCli: selectedProject?.CodCli || '',
    proyecto: selectedProject?.Proyecto || '',
  });

  const projectTree = treeResponse?.data ?? { disciplinas: [] };

  const phases = useMemo(() => {
    const disciplinas = (projectTree as { disciplinas?: ProjectTreeDisciplina[] })?.disciplinas;
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
            label: `${disciplina.nombre} / ${fase.nombre}`,
          });
        }
      });
    });

    return result;
  }, [projectTree]);

  const projectList = (projects as Project[] | undefined) ?? [];

  const handleProjectChange = (projectId: string) => {
    const project = projectList.find((p) => p.Proyecto === projectId) || null;
    setSelectedProject(project);
    setSelectedPhaseId('');
    if (project) {
      onTaskChange({ proyecto: project.Proyecto, fase: '' });
    }
  };

  const handlePhaseChange = (phaseId: string) => {
    setSelectedPhaseId(phaseId);
    onTaskChange({ fase: phaseId });
  };

  return (
    <div className="space-y-4" data-testid="sin-fases-selector">
      {/* Project selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Edit2 className="w-4 h-4" />
          Proyecto
        </Label>
        {isLoadingProjects ? (
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            data-testid="projects-loading"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando proyectos...
          </div>
        ) : isErrorProjects ? (
          <Alert variant="destructive" data-testid="projects-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error al cargar proyectos</AlertTitle>
            <AlertDescription>
              No se pudieron cargar los proyectos. Verifique su configuración
              de base de datos.
            </AlertDescription>
          </Alert>
        ) : projectList.length === 0 ? (
          <div
            className="text-sm text-muted-foreground"
            data-testid="projects-empty"
          >
            No hay proyectos disponibles
          </div>
        ) : (
          <Select
            value={selectedProject?.Proyecto || ''}
            onValueChange={handleProjectChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projectList.map((project) => (
                <SelectItem key={project.Proyecto} value={project.Proyecto}>
                  {project.NomCliente} / {project.NomProy} ({project.Proyecto})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Phase selector (only shown after a project is selected) */}
      {selectedProject && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Fase <span className="text-destructive">*</span>
          </Label>
          {isLoadingTree ? (
            <div
              className="flex items-center gap-2 text-sm text-muted-foreground"
              data-testid="phases-loading"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando fases...
            </div>
          ) : isErrorTree ? (
            <Alert variant="destructive" data-testid="phases-error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error al cargar fases</AlertTitle>
              <AlertDescription>
                {treeError instanceof Error
                  ? treeError.message
                  : String(treeError)}
              </AlertDescription>
            </Alert>
          ) : phases.length === 0 ? (
            <div
              className="text-sm text-muted-foreground"
              data-testid="phases-empty"
            >
              Este proyecto no tiene fases
            </div>
          ) : (
            <Select
              value={selectedPhaseId}
              onValueChange={handlePhaseChange}
              disabled={disabled}
            >
              <SelectTrigger aria-invalid={!selectedPhaseId}>
                <SelectValue placeholder="Selecciona una fase" />
              </SelectTrigger>
              <SelectContent>
                {phases.map((phase) => (
                  <SelectItem key={phase.id} value={phase.id}>
                    {phase.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
