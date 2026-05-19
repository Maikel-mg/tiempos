import { useState } from 'react';
import { ProjectTree, TreeNodeInfo } from './components/ProjectTree';
import { NodeInfoDrawer } from './components/NodeInfoDrawer';

export { ProjectTree, NodeInfoDrawer };
export type { TreeNodeInfo } from './components/ProjectTree';

// Integration component that combines ProjectTree with NodeInfoDrawer
interface ProjectTreeViewerProps {
  treeData: any;
  isLoading?: boolean;
  error?: Error | null;
}

export function ProjectTreeViewer({ treeData, isLoading, error }: ProjectTreeViewerProps) {
  const [selectedNode, setSelectedNode] = useState<TreeNodeInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNodeClick = (node: TreeNodeInfo) => {
    setSelectedNode(node);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando estructura del proyecto...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center text-destructive">
          <p>Error al cargar el proyecto</p>
          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center text-muted-foreground">
          <p>No hay datos del proyecto</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ProjectTree data={treeData} onNodeClick={handleNodeClick} />
      <NodeInfoDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        node={selectedNode}
      />
    </div>
  );
}