export interface TaskProposal {
  description: string;
  genericTask: string;
  totalHours: number;
  proposedName: string;
  projectCode: string;
  period: string;
  fechaInicio: string;
  fechaFin: string;
  entryCount: number;
  entryIds: string[];
  entries: { id: string; start: string }[];
}
