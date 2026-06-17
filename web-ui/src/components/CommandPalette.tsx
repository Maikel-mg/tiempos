import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  FolderOpen,
  ListTodo,
  Settings,
  Play,
  Square,
  Database,
  Plus,
  Table,
  LayoutGrid,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useCommandPalette } from '@/components/CommandPaletteContext';
import { useAvailableActions } from '@/components/CommandActionsContext';

const navigationActions = [
  { id: 'go-dashboard', label: 'Ir a Dashboard', icon: LayoutDashboard, url: '/dashboard', shortcut: 'Alt+D' },
  { id: 'go-timetracker', label: 'Ir a TimeTracker', icon: Clock, url: '/time-tracker', shortcut: 'Alt+T' },
  { id: 'go-projects', label: 'Ir a Proyectos', icon: FolderOpen, url: '/projects', shortcut: 'Alt+P' },
  { id: 'go-my-tasks', label: 'Ir a Mis Tareas', icon: ListTodo, url: '/my-tasks', shortcut: 'Alt+M' },
  { id: 'go-settings', label: 'Ir a Configuración', icon: Settings, url: '/settings', shortcut: 'Alt+,' },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const { isOpen, close } = useCommandPalette();
  const contextActions = useAvailableActions();

  const handleNavigation = (url: string) => {
    navigate(url);
    close();
  };

  const handleContextAction = (action: () => void) => {
    action();
    close();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={close}>
      <CommandInput placeholder="Buscar acciones o páginas..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>

        {/* Context actions (page-specific) */}
        {contextActions.length > 0 && (
          <>
            <CommandGroup heading="Acciones">
              {contextActions.map((action) => (
                <CommandItem
                  key={action.id}
                  onSelect={() => handleContextAction(action.action)}
                >
                  {action.icon && <span className="flex items-center">{action.icon}</span>}
                  <span>{action.label}</span>
                  {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Global navigation actions */}
        <CommandGroup heading="Navegación">
          {navigationActions.map((action) => (
            <CommandItem
              key={action.id}
              onSelect={() => handleNavigation(action.url)}
            >
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.label}</span>
              <CommandShortcut>{action.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Helper function to create TimeTracker context actions.
 * Call this from TimeTrackingPage with the actual state/actions.
 */
export function createTimeTrackerActions(params: {
  isTimerRunning: boolean;
  activeTab: string;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onSync: () => void;
  onManualEntry: () => void;
  onSwitchToTable: () => void;
  onSwitchToGrouped: () => void;
}) {
  const {
    isTimerRunning,
    activeTab,
    onStartTimer,
    onStopTimer,
    onSync,
    onManualEntry,
    onSwitchToTable,
    onSwitchToGrouped,
  } = params;

  return [
    {
      id: 'start-timer',
      label: 'Iniciar timer',
      icon: <Play className="h-4 w-4" />,
      action: onStartTimer,
      when: () => !isTimerRunning,
    },
    {
      id: 'stop-timer',
      label: 'Detener timer',
      icon: <Square className="h-4 w-4" />,
      action: onStopTimer,
      when: () => isTimerRunning,
    },
    {
      id: 'sync-entries',
      label: 'Sincronizar entradas con BD',
      icon: <Database className="h-4 w-4" />,
      action: onSync,
    },
    {
      id: 'manual-entry',
      label: 'Crear entrada manual',
      icon: <Plus className="h-4 w-4" />,
      action: onManualEntry,
    },
    {
      id: 'switch-table',
      label: 'Cambiar a vista tabla',
      icon: <Table className="h-4 w-4" />,
      action: onSwitchToTable,
      when: () => activeTab !== 'table',
    },
    {
      id: 'switch-grouped',
      label: 'Cambiar a vista agrupado',
      icon: <LayoutGrid className="h-4 w-4" />,
      action: onSwitchToGrouped,
      when: () => activeTab !== 'grouped',
    },
  ];
}
