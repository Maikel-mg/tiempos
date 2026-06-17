import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { Project } from '../types';
import type { RefObject } from 'react';

export interface ProjectsTableProps {
  projects: Project[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyMessage?: string;
  activeIndex?: number;
  getRowProps?: (index: number) => Record<string, unknown>;
  tableRef?: RefObject<HTMLTableElement>;
}

export function ProjectsTable({
  projects,
  isLoading = false,
  error,
  onRetry,
  emptyMessage,
  activeIndex,
  getRowProps,
  tableRef,
}: ProjectsTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (project: Project) => {
    navigate(`/projects/${project.CodCli}/${project.Proyecto}`);
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Cargando proyectos...</span>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar los proyectos</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        )}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {emptyMessage || 'No se encontraron proyectos'}
      </div>
    );
  }

  // Definir columnas
  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: 'NomCliente',
      header: 'Cliente',
      cell: ({ row }) => <span>{row.getValue('NomCliente')}</span>
    },
    {
      accessorKey: 'NomProy',
      header: 'Proyecto',
      cell: ({ row }) => <span>{row.getValue('NomProy')}</span>
    },
    {
      accessorKey: 'Proyecto',
      header: 'Código',
      cell: ({ row }) => <span>{row.getValue('Proyecto')}</span>
    },
    {
      accessorKey: 'NomDpto',
      header: 'Departamento',
      cell: ({ row }) => <span>{row.getValue('NomDpto')}</span>
    },
    {
      accessorKey: 'Abierto',
      header: 'Estado',
      cell: ({ row }) => {
        const abierto = row.getValue('Abierto') as boolean;
        return <span>{abierto ? 'Sí' : 'No'}</span>;
      }
    },
    {
      accessorKey: 'UsuredRespRev',
      header: 'Responsable',
      cell: ({ row }) => <span>{row.getValue('UsuredRespRev')}</span>
    }
  ];

  // Generar rowId único
  const getRowId = (project: Project) => `${project.CodCli}-${project.Proyecto}`;

  return (
    <DataTable
      columns={columns}
      data={projects}
      getRowId={getRowId}
      onRowClick={handleRowClick}
      activeIndex={activeIndex}
      getRowProps={getRowProps}
      tableRef={tableRef}
    />
  );
}