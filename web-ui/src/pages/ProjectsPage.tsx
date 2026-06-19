import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import { ProjectsTable } from '@/features/projects/components/ProjectsTable';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useTableKeyboardNavigation } from '@/hooks/useTableKeyboardNavigation';
import type { Project } from '@/features/projects/types';

export function ProjectsPage() {
  const { data, isLoading, error, refetch } = useProjects();
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const projects: Project[] = data ?? [];

  const { activeIndex, getRowProps, focusFirst } = useTableKeyboardNavigation({
    containerRef: tableRef,
    items: projects,
    getRowId: (project: Project) => `${project.CodCli}-${project.Proyecto}`,
    onActivate: (project) => {
      navigate(`/projects/${project.CodCli}/${project.Proyecto}`);
    },
  });

  // Auto-focus first table row on mount
  useEffect(() => {
    if (projects.length === 0) return;
    if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'TEXTAREA' ||
      document.activeElement.tagName === 'SELECT' ||
      document.activeElement.getAttribute('contenteditable') === 'true'
    )) return;
    if (document.querySelector('[role="dialog"][data-state="open"]')) return;
    if (document.querySelector('[cmdk-dialog]')) return;
    focusFirst();
  }, [projects.length, focusFirst]);

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 py-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <FolderKanban className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Explorá y gestioná los proyectos del sistema
          </p>
        </div>
      </div>

      <ProjectsTable 
        projects={projects}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        activeIndex={activeIndex}
        getRowProps={getRowProps}
        tableRef={tableRef}
      />
    </main>
  );
}
