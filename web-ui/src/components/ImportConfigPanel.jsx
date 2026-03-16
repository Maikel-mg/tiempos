import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

const DEFAULT_CONFIG = {
    usuario: '',
    fase: '',
    tipoHora: '11'
};

const CONFIG_STORAGE_KEY = 'wizard_config';
const PHASE_BY_MONTH_KEY = 'phase_by_month';

export function ImportConfigPanel({ config, onUpdateConfig, selectedMonth }) {
    const [suggestedFase, setSuggestedFase] = useState('');
    const [faseHint, setFaseHint] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            onUpdateConfig({
                ...DEFAULT_CONFIG,
                ...parsed
            });
        }
    }, []);

    useEffect(() => {
        if (config.usuario || config.fase || config.tipoHora) {
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
        }
    }, [config]);

    useEffect(() => {
        if (selectedMonth) {
            const monthKey = selectedMonth.toISOString().slice(0, 7);
            const storedPhases = JSON.parse(localStorage.getItem(PHASE_BY_MONTH_KEY) || '{}');
            
            if (storedPhases[monthKey]) {
                setSuggestedFase(storedPhases[monthKey]);
                setFaseHint(`Fase guardada para ${getMonthName(selectedMonth)}: ${storedPhases[monthKey]}`);
            } else {
                const lastPhase = parseInt(Object.values(storedPhases).pop() || '0', 10);
                if (lastPhase > 0) {
                    const suggested = lastPhase + 1;
                    setSuggestedFase(suggested.toString());
                    setFaseHint(`Sugerido para ${getMonthName(selectedMonth)} (último + 1): ${suggested}`);
                } else {
                    setSuggestedFase('');
                    setFaseHint('');
                }
            }
        }
    }, [selectedMonth]);

    const handleFaseChange = (value) => {
        onUpdateConfig({ ...config, fase: value });
        
        if (selectedMonth && value) {
            const monthKey = selectedMonth.toISOString().slice(0, 7);
            const storedPhases = JSON.parse(localStorage.getItem(PHASE_BY_MONTH_KEY) || '{}');
            storedPhases[monthKey] = value;
            localStorage.setItem(PHASE_BY_MONTH_KEY, JSON.stringify(storedPhases));
        }
    };

    const applySuggestedFase = () => {
        if (suggestedFase) {
            handleFaseChange(suggestedFase);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                    <Label htmlFor="usuario">Usuario</Label>
                    <Input
                        id="usuario"
                        value={config.usuario}
                        onChange={(e) => onUpdateConfig({ ...config, usuario: e.target.value })}
                        placeholder="MG01"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fase">Fase (ID)</Label>
                    <div className="space-y-1">
                        <Input
                            id="fase"
                            type="number"
                            value={config.fase}
                            onChange={(e) => handleFaseChange(e.target.value)}
                            placeholder="38653"
                        />
                        {faseHint && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <AlertCircle className="w-3 h-3" />
                                <span>{faseHint}</span>
                                {suggestedFase && suggestedFase !== config.fase && (
                                    <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="h-auto p-0 text-xs"
                                        onClick={applySuggestedFase}
                                    >
                                        Aplicar
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tipoHora">Tipo de Hora</Label>
                    <Input
                        id="tipoHora"
                        type="number"
                        value={config.tipoHora}
                        onChange={(e) => onUpdateConfig({ ...config, tipoHora: e.target.value })}
                        placeholder="11"
                    />
                </div>
            </div>
        </div>
    );
}

function getMonthName(date) {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}
