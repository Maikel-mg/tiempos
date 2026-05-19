import { useParams, useNavigate } from 'react-router-dom';
import { ProjectTreeViewer } from '@/features/projects/ProjectTreeViewer';
import { useProjectTree } from '@/features/projects/hooks/use-project-tree';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function ProjectDetailPage() {
  const { codCli, proyecto } = useParams<{ codCli: string; proyecto: string }>();
  const navigate = useNavigate();
  
  const { data, isLoading, error } = useProjectTree({
    codCli: codCli || '',
    proyecto: proyecto || '',
  });

  const handleGoBack = () => {
    navigate('/projects');
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={handleGoBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>
      
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Detalle del Proyecto</h1>
        <p className="text-muted-foreground">
          Cliente: {codCli} | Proyecto: {proyecto}
        </p>
      </div>

      <ProjectTreeViewer 
        treeData={data} 
        isLoading={isLoading} 
        error={error}
      />
    </div>
  );
}