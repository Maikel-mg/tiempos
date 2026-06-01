import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import type { TaskProposal } from '@/domain/proposals/extract-proposals';

export interface TaskProposalCardProps {
  proposals: TaskProposal[];
  onOpenModal: () => void;
}

export function TaskProposalCard({ proposals, onOpenModal }: TaskProposalCardProps) {
  const count = proposals.length;
  const totalHours = Math.round(proposals.reduce((sum, p) => sum + p.totalHours, 0));
  const [isExpanded, setIsExpanded] = useState(count > 0);

  const description = count > 0
    ? `${count} descripción(es) con ${totalHours}h acumuladas`
    : 'No hay propuestas pendientes';

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <button onClick={onOpenModal} className="w-full">
        <CardHeader className="py-6 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                {isExpanded ? <ChevronUp className="w-6 h-6 text-primary" /> : <ChevronDown className="w-6 h-6 text-primary" />}
              </div>
              <div className="text-left">
                <CardTitle className="flex items-center gap-3 text-xl font-bold">
                  <Lightbulb className="w-6 h-6 text-primary" />
                  Propuestas de Tareas
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  {description}
                </CardDescription>
              </div>
            </div>
            <Badge variant={count > 0 ? 'warning' : 'success'} className="text-lg px-4 py-1.5">
              {count}
            </Badge>
          </div>
        </CardHeader>
      </button>

      {isExpanded && (
        <CardContent className="pt-0 px-6 pb-6">
          {proposals.length > 0 && (
            <div className="space-y-3">
              {proposals.map((proposal, idx) => (
                <div
                  key={`${proposal.description}-${idx}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold truncate">{proposal.proposedName}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {proposal.entryCount} entradas · {Math.round(proposal.totalHours)}h · {proposal.projectCode}
                    </p>
                  </div>

                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
