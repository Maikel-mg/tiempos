import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock } from 'lucide-react';
import type { TaskSummary } from '../types';

interface TaskBreakdownTableProps {
  tasks: TaskSummary[];
}

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
}

export function TaskBreakdownTable({ tasks }: TaskBreakdownTableProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desglose por Tarea</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay tareas registradas en este período</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desglose por Tarea</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarea</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="text-right">Porcentaje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.name}>
                  <TableCell className="font-medium max-w-xs truncate">
                    {task.name}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDuration(task.seconds)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted">
                      {task.percentage}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
