import { useRef } from 'react';
import { ProjectsTable } from '@/features/projects/components/ProjectsTable';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { useTableKeyboardNavigation } from '@/hooks/useTableKeyboardNavigation';

export function ProjectsPage() {
  const { data, isLoading, error, refetch } = useProjects();
  const tableRef = useRef<HTMLTableElement>(null);

  const projects = data || [];

  const { activeIndex, getRowProps } = useTableKeyboardNavigation({
    containerRef: tableRef,
    items: projects,
    getRowId: (project, index) => `${project.CodCli}-${project.Proyecto}`,
  });

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
