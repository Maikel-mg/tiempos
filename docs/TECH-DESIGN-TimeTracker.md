# Diseño Técnico - Mi TimeTracker

## 1. Arquitectura General

### 1.1 Patrón Strategy para Almacenamiento

```
┌─────────────────────────────────────────────────────────────────┐
│                         TimeTrackingPage                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useTimeTracking (Hook)                      │
│  - useTimer()                                                    │
│  - useTimeEntries()                                             │
│  - useTasks()                                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TimeTrackingService                             │
│  - createEntry()                                                │
│  - updateEntry()                                                │
│  - deleteEntry()                                                │
│  - getEntries()                                                 │
│  - startTimer()                                                 │
│  - stopTimer()                                                  │
│  - syncEntries()                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   StorageStrategy (Interfaz)                    │
│  + save(entry)                                                  │
│  + get(id)                                                      │
│  + getAll()                                                     │
│  + update(entry)                                                │
│  + delete(id)                                                   │
│  + saveTimerState(state)                                        │
│  + getTimerState()                                              │
│  + clearTimerState()                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│    IndexedDBStorage     │   │   (Futuro)              │
│    (Implementación)     │   │   RemoteStorage         │
└─────────────────────────┘   └─────────────────────────┘
```

---

## 2. Estructura de Archivos

```
web-ui/src/
├── pages/
│   └── TimeTrackingPage.tsx          # Página principal
│
├── features/time-tracker/
│   ├── components/
│   │   ├── TimerWidget.tsx            # Widget del temporizador
│   │   ├── TimeEntryForm.tsx          # Formulario entrada manual
│   │   ├── TimeEntryList.tsx         # Listado de registros
│   │   ├── TimeEntryRow.tsx          # Fila individual del listado
│   │   ├── OverlapAlert.tsx          # Alerta de solapamiento
│   │   ├── TaskSelector.tsx          # Selector de tareas
│   │   └── SyncPanel.tsx             # Panel de sincronización SQL
│   │
│   ├── hooks/
│   │   ├── useTimer.ts               # Lógica del temporizador
│   │   ├── useTimeEntries.ts         # CRUD de registros
│   │   ├── useTasks.ts               # Carga de tareas/procesos
│   │   └── useSync.ts                # Lógica de sincronización
│   │
│   ├── services/
│   │   └── timeTrackingService.ts    # Lógica de negocio
│   │
│   └── types/
│       └── index.ts                  # Tipos TypeScript
│
└── lib/storage/
    ├── StorageStrategy.ts            # Interfaz abstracta
    └── IndexedDBStorage.ts           # Implementación IndexedDB
```

---

## 3. Modelo de Datos

### 3.1 TimeEntry

```typescript
// web-ui/src/features/time-tracker/types/index.ts

export interface TimeEntry {
  id: string;                    // UUID v4
  taskId: string;                // ID del proceso (de ProcessMappingTable)
  taskName: string;              // Nombre para mostrar
  date: string;                  // YYYY-MM-DD
  startTime: string;            // HH:MM (24h)
  endTime: string;              // HH:MM (24h)
  duration: number;             // Duración en segundos
  description?: string;         // Descripción opcional
  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp
  synced: boolean;              // true si está en BBDD empresa
  syncedAt?: string;            // ISO timestamp de sincronización
}
```

### 3.2 TimerState

```typescript
export interface TimerState {
  isRunning: boolean;
  taskId: string;
  taskName: string;
  startTime: string;            // ISO timestamp
  elapsed: number;              // Segundos acumulados (para recover)
}
```

### 3.3 Task (del sistema existente)

```typescript
// Reutilizar de process-management
import type { Process } from '@/features/process-management';

export interface Task extends Process {
  // Ya tiene: id, name, processId, etc.
}
```

---

## 4. Interfaces de Storage

### 4.1 StorageStrategy (Interfaz Abstracta)

```typescript
// web-ui/src/lib/storage/StorageStrategy.ts

import type { TimeEntry, TimerState } from '@/features/time-tracker/types';

export interface StorageStrategy {
  // TimeEntries
  saveEntry(entry: TimeEntry): Promise<void>;
  getEntry(id: string): Promise<TimeEntry | null>;
  getAllEntries(): Promise<TimeEntry[]>;
  getEntriesByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]>;
  updateEntry(entry: TimeEntry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  markAsSynced(ids: string[], syncedAt: string): Promise<void>;

  // Timer State
  saveTimerState(state: TimerState): Promise<void>;
  getTimerState(): Promise<TimerState | null>;
  clearTimerState(): Promise<void>;
}
```

### 4.2 IndexedDBStorage (Implementación)

```typescript
// web-ui/src/lib/storage/IndexedDBStorage.ts

import Dexie, { type Table } from 'dexie';
import type { StorageStrategy } from './StorageStrategy';
import type { TimeEntry, TimerState } from '@/features/time-tracker/types';

class TimeTrackerDB extends Dexie {
  timeEntries!: Table<TimeEntry, string>;
  timerState!: Table<TimerState, string>;

  constructor() {
    super('TimeTrackerDB');
    this.version(1).stores({
      timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt',
      timerState: 'id'
    });
  }
}

const db = new TimeTrackerDB();

export class IndexedDBStorage implements StorageStrategy {
  // Implementación de todos los métodos de StorageStrategy
  // usando db.timeEntries y db.timerState
}
```

---

## 5. TimeTrackingService

```typescript
// web-ui/src/features/time-tracker/services/timeTrackingService.ts

import type { StorageStrategy } from '@/lib/storage/StorageStrategy';
import type { TimeEntry, TimerState } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class TimeTrackingService {
  constructor(private storage: StorageStrategy) {}

  async createEntry(data: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<TimeEntry> {
    const now = new Date().toISOString();
    const entry: TimeEntry = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      synced: false
    };
    await this.storage.saveEntry(entry);
    return entry;
  }

  async updateEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry | null> {
    const existing = await this.storage.getEntry(id);
    if (!existing) return null;
    
    const updated: TimeEntry = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    };
    await this.storage.updateEntry(updated);
    return updated;
  }

  async deleteEntry(id: string): Promise<void> {
    await this.storage.deleteEntry(id);
  }

  async getEntries(startDate?: string, endDate?: string): Promise<TimeEntry[]> {
    if (startDate && endDate) {
      return this.storage.getEntriesByDateRange(startDate, endDate);
    }
    return this.storage.getAllEntries();
  }

  async startTimer(taskId: string, taskName: string): Promise<TimerState> {
    const state: TimerState = {
      isRunning: true,
      taskId,
      taskName,
      startTime: new Date().toISOString(),
      elapsed: 0
    };
    await this.storage.saveTimerState(state);
    return state;
  }

  async stopTimer(): Promise<TimeEntry | null> {
    const state = await this.storage.getTimerState();
    if (!state || !state.isRunning) return null;

    const start = new Date(state.startTime);
    const end = new Date();
    
    const entry = await this.createEntry({
      taskId: state.taskId,
      taskName: state.taskName,
      date: start.toISOString().split('T')[0],
      startTime: formatTime(start),
      endTime: formatTime(end),
      duration: Math.floor((end.getTime() - start.getTime()) / 1000)
    });

    await this.storage.clearTimerState();
    return entry;
  }

  async recoverTimerState(): Promise<TimerState | null> {
    const state = await this.storage.getTimerState();
    if (!state || !state.isRunning) return null;

    // Calcular tiempo transcurrido desde startTime
    const elapsed = Math.floor((Date.now() - new Date(state.startTime).getTime()) / 1000);
    return { ...state, elapsed };
  }
}

// Helper
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5); // HH:MM
}
```

---

## 6. Componentes UI

### 6.1 TimeTrackingPage (Contenedor Principal)

```typescript
// web-ui/src/pages/TimeTrackingPage.tsx

import { useState, useEffect } from 'react';
import { Clock, Settings } from 'lucide-react';
import { TimerWidget } from '@/features/time-tracker/components/TimerWidget';
import { TimeEntryForm } from '@/features/time-tracker/components/TimeEntryForm';
import { TimeEntryList } from '@/features/time-tracker/components/TimeEntryList';
import { SyncPanel } from '@/features/time-tracker/components/SyncPanel';
import { OverlapAlert } from '@/features/time-tracker/components/OverlapAlert';
import { useTimeEntries } from '@/features/time-tracker/hooks/useTimeEntries';
import { useTimer } from '@/features/time-tracker/hooks/useTimer';

export function TimeTrackingPage() {
  const { entries, loading, createEntry, deleteEntry, markSynced } = useTimeEntries();
  const { timerState, isRunning, start, stop, elapsed } = useTimer();
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold">Mi TimeTracker</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Timer Widget */}
        <TimerWidget
          isRunning={isRunning}
          elapsed={elapsed}
          timerTask={timerState?.taskName}
          onStart={start}
          onStop={stop}
        />

        {/* Overlap Alert - Siempre visible si hay solapamientos */}
        <OverlapAlert entries={entries} />

        {/* Tabs: Nuevo Registro / Listado */}
        <Tabs>
          <Tab title="Nuevo Registro">
            <TimeEntryForm onSubmit={createEntry} onCancel={() => setShowForm(false)} />
          </Tab>
          <Tab title="Mis Registros">
            <TimeEntryList
              entries={entries}
              selectedIds={selectedIds}
              onSelect={setSelectedIds}
              onDelete={deleteEntry}
            />
          </Tab>
        </Tabs>

        {/* Sync Panel - Solo visible si hay seleccionados */}
        {selectedIds.size > 0 && (
          <SyncPanel
            selectedEntries={entries.filter(e => selectedIds.has(e.id))}
            onSyncComplete={(ids) => markSynced(ids)}
          />
        )}
      </main>
    </div>
  );
}
```

### 6.2 TimerWidget

```typescript
// web-ui/src/features/time-tracker/components/TimerWidget.tsx

import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskSelector } from './TaskSelector';

interface TimerWidgetProps {
  isRunning: boolean;
  elapsed: number;
  timerTask?: string;
  onStart: (taskId: string, taskName: string) => void;
  onStop: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function TimerWidget({ isRunning, elapsed, timerTask, onStart, onStop }: TimerWidgetProps) {
  const [selectedTask, setSelectedTask] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="card border rounded-lg p-6">
      <div className="flex items-center gap-4">
        {/* Timer Display */}
        <div className="text-4xl font-mono font-bold">
          {formatDuration(elapsed)}
        </div>

        {/* Task selector - disabled mientras corre */}
        {!isRunning && (
          <TaskSelector
            value={selectedTask}
            onChange={setSelectedTask}
            className="flex-1"
          />
        )}

        {isRunning && timerTask && (
          <div className="flex-1 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-600 font-medium">Trabajando en: {timerTask}</span>
          </div>
        )}

        {/* Start/Stop Button */}
        {!isRunning ? (
          <Button
            onClick={() => selectedTask && onStart(selectedTask.id, selectedTask.name)}
            disabled={!selectedTask}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar
          </Button>
        ) : (
          <Button
            onClick={onStop}
            variant="destructive"
          >
            <Square className="w-4 h-4 mr-2" />
            Parar
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 6.3 TimeEntryForm

```typescript
// web-ui/src/features/time-tracker/components/TimeEntryForm.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskSelector } from './TaskSelector';
import type { TimeEntry } from '../types';

interface TimeEntryFormProps {
  onSubmit: (data: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => void;
  onCancel?: () => void;
  initialData?: Partial<TimeEntry>;
}

function calculateDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export function TimeEntryForm({ onSubmit, onCancel, initialData }: TimeEntryFormProps) {
  const today = new Date().toISOString().split('T')[0];
  
  const [task, setTask] = useState<{ id: string; name: string } | null>(
    initialData?.taskId ? { id: initialData.taskId, name: initialData.taskName || '' } : null
  );
  const [date, setDate] = useState(initialData?.date || today);
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [error, setError] = useState<string | null>(null);

  const duration = startTime && endTime ? calculateDuration(startTime, endTime) : 0;
  const isValid = task && date && startTime && endTime && duration > 0;

  const handleSubmit = () => {
    if (!isValid || !task) return;
    
    if (duration <= 0) {
      setError('La hora de salida debe ser mayor que la de entrada');
      return;
    }

    onSubmit({
      taskId: task.id,
      taskName: task.name,
      date,
      startTime,
      endTime,
      duration: duration * 60, // Convertir a segundos
      description: description || undefined
    });
    
    // Reset form
    setStartTime('09:00');
    setEndTime('');
    setDescription('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo Registro Manual</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Task Selector */}
        <div>
          <Label>Tarea</Label>
          <TaskSelector value={task} onChange={setTask} />
        </div>

        {/* Date */}
        <div>
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Hora inicio</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <Label>Hora fin</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* Duration preview */}
        {duration > 0 && (
          <div className="text-sm text-muted-foreground">
            Duración: {Math.floor(duration / 60)}h {duration % 60}m
          </div>
        )}

        {/* Description */}
        <div>
          <Label>Descripción (opcional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas sobre el trabajo..."
          />
        </div>

        {/* Error */}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={!isValid}>
            Guardar
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 6.4 TimeEntryList

```typescript
// web-ui/src/features/time-tracker/components/TimeEntryList.tsx

import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TimeEntryRow } from './TimeEntryRow';
import type { TimeEntry } from '../types';

interface TimeEntryListProps {
  entries: TimeEntry[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
  onDelete: (id: string) => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function TimeEntryList({ entries, selectedIds, onSelect, onDelete }: TimeEntryListProps) {
  const [filterDate, setFilterDate] = useState('');
  const [filterTask, setFilterTask] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'task'>('date');

  const filtered = useMemo(() => {
    let result = [...entries];
    
    if (filterDate) {
      result = result.filter(e => e.date === filterDate);
    }
    if (filterTask) {
      result = result.filter(e => 
        e.taskName.toLowerCase().includes(filterTask.toLowerCase())
      );
    }
    
    result.sort((a, b) => {
      if (sortBy === 'date') return b.date.localeCompare(a.date);
      if (sortBy === 'duration') return b.duration - a.duration;
      return a.taskName.localeCompare(b.taskName);
    });
    
    return result;
  }, [entries, filterDate, filterTask, sortBy]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    onSelect(newSet);
  };

  const selectAll = () => {
    const unsynced = filtered.filter(e => !e.synced).map(e => e.id);
    onSelect(new Set(unsynced));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{entries.length} registros</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Seleccionar sin sincronizar
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div>
            <Label className="text-xs">Filtrar por fecha</Label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label className="text-xs">Filtrar por tarea</Label>
            <Input
              placeholder="Buscar tarea..."
              value={filterTask}
              onChange={(e) => setFilterTask(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label className="text-xs">Ordenar por</Label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 px-3 rounded-md border"
            >
              <option value="date">Fecha</option>
              <option value="duration">Duración</option>
              <option value="task">Tarea</option>
            </select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Tarea</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => (
              <TimeEntryRow
                key={entry.id}
                entry={entry}
                selected={selectedIds.has(entry.id)}
                onToggle={() => toggleSelect(entry.id)}
                onDelete={() => onDelete(entry.id)}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

### 6.5 OverlapAlert

```typescript
// web-ui/src/features/time-tracker/components/OverlapAlert.tsx

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { TimeEntry } from '../types';

interface OverlapAlertProps {
  entries: TimeEntry[];
}

function findOverlaps(entries: TimeEntry[]): Array<[TimeEntry, TimeEntry]> {
  const overlaps: Array<[TimeEntry, TimeEntry]> = [];
  const byDate = new Map<string, TimeEntry[]>();

  // Group by date
  entries.forEach(e => {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  });

  // Check overlaps per day
  byDate.forEach((dayEntries) => {
    for (let i = 0; i < dayEntries.length; i++) {
      for (let j = i + 1; j < dayEntries.length; j++) {
        const a = dayEntries[i];
        const b = dayEntries[j];
        
        // Convert HH:MM to minutes
        const toMin = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        
        const aStart = toMin(a.startTime);
        const aEnd = toMin(a.endTime);
        const bStart = toMin(b.startTime);
        const bEnd = toMin(b.endTime);

        // Check if overlaps (not just touching)
        if (aStart < bEnd && bStart < aEnd) {
          overlaps.push([a, b]);
        }
      }
    }
  });

  return overlaps;
}

export function OverlapAlert({ entries }: OverlapAlertProps) {
  const overlaps = findOverlaps(entries);
  
  if (overlaps.length === 0) return null;

  return (
    <Alert variant="warning" className="border-yellow-500 bg-yellow-50">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Registros solapados detectados</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4 mt-2 space-y-1">
          {overlaps.map(([a, b], idx) => (
            <li key={idx}>
              <strong>{a.date}</strong>: {a.taskName} ({a.startTime}-{a.endTime}) 
              {' '}con{' '}
              {b.taskName} ({b.startTime}-{b.endTime})
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
```

### 6.6 SyncPanel

```typescript
// web-ui/src/features/time-tracker/components/SyncPanel.tsx

import { useState } from 'react';
import { Copy, Download, Play, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateSQLFromObjects } from '@/lib/sql-generator';
import { loadMappings } from '@/lib/task-mapping-storage';
import type { TimeEntry } from '../types';
import type { ImportConfig } from '@/components/ImportConfigPanel';

interface SyncPanelProps {
  selectedEntries: TimeEntry[];
  onSyncComplete: (ids: string[]) => void;
}

export function SyncPanel({ selectedEntries, onSyncComplete }: SyncPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [autoSync, setAutoSync] = useState(false); // Por defecto OFF

  // Generate SQL
  const config: ImportConfig = JSON.parse(localStorage.getItem('wizard_config') || '{}');
  const taskMapping = loadMappings();
  
  const sqlResult = generateSQLFromObjects({
    entries: selectedEntries,
    taskMapping,
    config
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sqlResult.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sqlResult.sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-entries-${new Date().toISOString().split('T')[0]}.sql`;
    a.click();
  };

  const handleExecute = async () => {
    const dbConfig = JSON.parse(localStorage.getItem('db_connection_config') || '{}');
    if (!dbConfig.server || !dbConfig.database) {
      setResult({ success: false, message: 'Configura la conexión a la BBDD primero' });
      return;
    }

    setIsExecuting(true);
    try {
      const response = await fetch('http://localhost:3001/api/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          server: dbConfig.server,
          database: dbConfig.database,
          username: dbConfig.username,
          password: atob(dbConfig.password),
          sqlStatements: sqlResult.statements
        }
      });
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        onSyncComplete(selectedEntries.map(e => e.id));
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sincronizar {selectedEntries.length} registros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-sync toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoSync"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
          />
          <Label htmlFor="autoSync">Sincronización automática al crear registro</Label>
        </div>

        {/* SQL Preview */}
        <ScrollArea className="h-[200px] border rounded-lg">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
            {sqlResult.sql}
          </pre>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copiado' : 'Copiar SQL'}
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
          <Button onClick={handleExecute} disabled={isExecuting}>
            {isExecuting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Ejecutar en BBDD
          </Button>
        </div>

        {/* Result */}
        {result && (
          <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={result.success ? 'text-green-800' : 'text-red-800'}>
              {result.success ? 'Sincronización exitosa' : 'Error:'} {result.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 6.7 TaskSelector

```typescript
// web-ui/src/features/time-tracker/components/TaskSelector.tsx

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTasks } from '../hooks/useTasks';

interface TaskSelectorProps {
  value: { id: string; name: string } | null;
  onChange: (task: { id: string; name: string } | null) => void;
  className?: string;
}

export function TaskSelector({ value, onChange, className }: TaskSelectorProps) {
  const { tasks, loading } = useTasks();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return tasks;
    const lower = search.toLowerCase();
    return tasks.filter(t => 
      t.name.toLowerCase().includes(lower) || 
      (t.processId || '').toLowerCase().includes(lower)
    );
  }, [tasks, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`justify-between ${className}`}
        >
          {value ? value.name : 'Seleccionar tarea...'}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Buscar tarea..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No hay tareas</p>
          ) : (
            filtered.map((task) => (
              <button
                key={task.id}
                className="w-full px-3 py-2 text-left hover:bg-muted"
                onClick={() => {
                  onChange({ id: task.id, name: task.name });
                  setOpen(false);
                  setSearch('');
                }}
              >
                <div className="font-medium">{task.name}</div>
                {task.processId && (
                  <div className="text-xs text-muted-foreground">ID: {task.processId}</div>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## 7. Hooks

### 7.1 useTimer

```typescript
// web-ui/src/features/time-tracker/hooks/useTimer.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { TimeTrackingService } from '../services/timeTrackingService';
import { IndexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import type { TimerState } from '../types';

const service = new TimeTrackingService(new IndexedDBStorage());

export function useTimer() {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Recover state on mount
  useEffect(() => {
    const recover = async () => {
      const state = await service.recoverTimerState();
      if (state) {
        setTimerState(state);
        setElapsed(state.elapsed);
      }
    };
    recover();
  }, []);

  // Timer tick
  useEffect(() => {
    if (timerState?.isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState?.isRunning]);

  const start = useCallback(async (taskId: string, taskName: string) => {
    const state = await service.startTimer(taskId, taskName);
    setTimerState(state);
    setElapsed(0);
  }, []);

  const stop = useCallback(async () => {
    const entry = await service.stopTimer();
    setTimerState(null);
    setElapsed(0);
    return entry;
  }, []);

  return {
    timerState,
    isRunning: timerState?.isRunning ?? false,
    elapsed,
    start,
    stop
  };
}
```

### 7.2 useTimeEntries

```typescript
// web-ui/src/features/time-tracker/hooks/useTimeEntries.ts

import { useState, useEffect, useCallback } from 'react';
import { TimeTrackingService } from '../services/timeTrackingService';
import { IndexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import type { TimeEntry } from '../types';

const service = new TimeTrackingService(new IndexedDBStorage());

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const data = await service.getEntries();
    setEntries(data.sort((a, b) => b.date.localeCompare(a.date)));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const createEntry = useCallback(async (
    data: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt' | 'synced'>
  ) => {
    const entry = await service.createEntry(data);
    setEntries((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateEntry = useCallback(async (id: string, data: Partial<TimeEntry>) => {
    const updated = await service.updateEntry(id, data);
    if (updated) {
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    }
    return updated;
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    await service.deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const markSynced = useCallback(async (ids: string[]) => {
    const syncedAt = new Date().toISOString();
    const storage = new IndexedDBStorage();
    await storage.markAsSynced(ids, syncedAt);
    setEntries((prev) =>
      prev.map((e) => (ids.includes(e.id) ? { ...e, synced: true, syncedAt } : e))
    );
  }, []);

  return {
    entries,
    loading,
    createEntry,
    updateEntry,
    deleteEntry,
    markSynced,
    refresh: loadEntries
  };
}
```

### 7.3 useTasks

```typescript
// web-ui/src/features/time-tracker/hooks/useTasks.ts

import { useState, useEffect } from 'react';
import { processExtractor } from '@/features/process-management';

interface Task {
  id: string;
  name: string;
  processId?: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Usar processExtractor del sistema existente
      const processes = await processExtractor.getAll();
      setTasks(processes.map((p: any) => ({
        id: p.id,
        name: p.name,
        processId: p.processId
      })));
      setLoading(false);
    };
    load();
  }, []);

  return { tasks, loading };
}
```

---

## 8. Integración con Router

### 8.1 Añadir ruta en App.tsx

```typescript
// web-ui/src/App.tsx (o donde esté el Router)

import { TimeTrackingPage } from './pages/TimeTrackingPage';

// En las rutas:
<Route path="/time-tracker" element={<TimeTrackingPage />} />
```

### 8.2 Añadir al menú de navegación

```typescript
// En el componente de navegación (Sidebar)

// Usar el hook de tareas o crear una forma de detectar si hay procesos
<NavigationItem
  icon={Clock}
  label="Mi TimeTracker"
  path="/time-tracker"
/>
```

---

## 9. Dependencias Necesarias

| Paquete | Versión | Uso |
|---------|---------|-----|
| `dexie` | ^4.0.0 | IndexedDB wrapper |
| `uuid` | ^9.0.0 | Generar IDs únicos |
| `lucide-react` | ^0.x | Iconos (ya usado) |

```bash
npm install dexie uuid
npm install -D @types/uuid
```

---

## 10. Resumen de Integraciones

| Componente Existente | Cómo se integra |
|---------------------|-----------------|
| `sql-generator.ts` | Llama directamente `generateSQLFromObjects()` |
| `task-mapping-storage.ts` | Usa `loadMappings()` para SQL |
| `process-management` | Usa `processExtractor.getAll()` para tareas |
| `DBConnection` | Lee config de `localStorage.getItem('db_connection_config')` |
| `ImportConfigPanel` | Lee config de `localStorage.getItem('wizard_config')` |

---

## 11. Notas de Implementación

1. **UUID**: Usar `uuidv4()` del paquete `uuid` para generar IDs únicos

2. **IndexedDB**: Dexie permite acceso síncrono en memoria, pero las operaciones son async

3. **Timer Recovery**: Al hacer `recoverTimerState()`, calcular `elapsed` basado en la diferencia entre `Date.now()` y `startTime`

4. **Sincronización automática**: Esta configuración se guarda en localStorage (no en IndexedDB) porque es preference del usuario

5. **Errores SQL**: El generador puede devolver errores por tareas sin mapear - mostrar al usuario pero permitir generar SQL parcial

---

*Diseño técnico generado para fase de implementación.*