import { ProjectsTable } from '@/features/projects/components/ProjectsTable';
import { useProjects } from '@/features/projects/hooks/use-projects';

export function ProjectsPage() {
  const { data, isLoading, error, refetch } = useProjects();
  console.log(`TCL ~ ProjectsPage ~ data:`, data)

  return (
    <div className="container mx-auto px-4 py-4">
      <ProjectsTable 
        projects={data || []}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
      />
    </div>
  );
}
