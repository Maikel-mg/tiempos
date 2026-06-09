import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type PeriodType = 'today' | 'week' | 'month' | 'last-month' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

interface PeriodSelectorProps {
  value: PeriodType;
  customRange?: DateRange;
  onChange: (period: PeriodType, customRange?: DateRange) => void;
}

export function PeriodSelector({ value, customRange, onChange }: PeriodSelectorProps) {
  const [localCustomRange, setLocalCustomRange] = useState<DateRange>(
    customRange || {
      start: new Date(new Date().setHours(0, 0, 0, 0)),
      end: new Date()
    }
  );

  const handleCustomRangeChange = (field: 'start' | 'end', dateStr: string) => {
    const date = new Date(dateStr);
    const newRange = { ...localCustomRange, [field]: date };
    setLocalCustomRange(newRange);
    onChange('custom', newRange);
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const tabs: { value: PeriodType; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mes' },
    { value: 'last-month', label: 'Mes Pasado' },
    { value: 'custom', label: 'Personalizado' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Período:</span>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.value}
              variant={value === tab.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {value === 'custom' && (
        <div className="flex items-end gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-sm">Fecha inicio</Label>
            <Input
              id="startDate"
              type="date"
              value={formatDateForInput(localCustomRange.start)}
              onChange={(e) => handleCustomRangeChange('start', e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-sm">Fecha fin</Label>
            <Input
              id="endDate"
              type="date"
              value={formatDateForInput(localCustomRange.end)}
              onChange={(e) => handleCustomRangeChange('end', e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      )}
    </div>
  );
}
