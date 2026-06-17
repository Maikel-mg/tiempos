import { useRef, useEffect } from 'react';
import { ProjectsTable } from '@/features/projects/components/ProjectsTable';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useTableKeyboardNavigation } from '@/hooks/useTableKeyboardNavigation';
import type { Project } from '@/features/projects/types';

export function ProjectsPage() {
  const { data, isLoading, error, refetch } = useProjects();
  const tableRef = useRef<HTMLTableElement>(null);

  const projects: Project[] = data ?? [];

  const { activeIndex, getRowProps, focusFirst } = useTableKeyboardNavigation({
    containerRef: tableRef,
    items: projects,
    getRowId: (project: Project) => `${project.CodCli}-${project.Proyecto}`,
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
    <div className="container mx-auto px-4 py-4">
      <ProjectsTable 
        projects={projects}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        activeIndex={activeIndex}
        getRowProps={getRowProps}
        tableRef={tableRef}
      />
    </div>
  );
}
