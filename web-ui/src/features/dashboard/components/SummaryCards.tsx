import { Card, CardContent } from '@/components/ui/card';

interface SummaryCardsProps {
  totalSeconds: number;
  entriesCount: number;
  avgPerDaySeconds: number;
}

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
}

function StatCard({ 
  title, 
  value, 
  subtitle
}: { 
  title: string; 
  value: string; 
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ totalSeconds, entriesCount, avgPerDaySeconds }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        title="Total Horas"
        value={formatDuration(totalSeconds)}
        subtitle="trabajadas"
      />
      <StatCard
        title="Entradas"
        value={entriesCount.toString()}
        subtitle="registros"
      />
      <StatCard
        title="Promedio/Día"
        value={formatDuration(avgPerDaySeconds)}
        subtitle="días laborables"
      />
    </div>
  );
}
