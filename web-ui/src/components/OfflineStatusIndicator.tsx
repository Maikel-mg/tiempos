import { Link } from 'react-router-dom';
import { Wifi, WifiOff, Clock3, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { useOfflineIndicator } from '@/features/time-tracker/hooks/useOfflineIndicator';
import { formatLastUpdated } from '@/features/time-tracker/lib/freshness';
import { SidebarGroup, SidebarGroupContent } from '@/components/ui/sidebar';

interface OfflineStatusIndicatorProps {
  collapsed?: boolean;
}

export function OfflineStatusIndicator({ collapsed = false }: OfflineStatusIndicatorProps) {
  const {
    pendingCount,
    lastUpdated,
    connectionStatus,
    isStale,
    staleDays,
    loading,
  } = useOfflineIndicator();

  const lastUpdatedText = loading ? 'Cargando...' : formatLastUpdated(lastUpdated);

  const connectionLabel =
    connectionStatus === 'connected'
      ? 'Conectado'
      : connectionStatus === 'disconnected'
        ? 'Sin conexión'
        : 'Comprobando...';

  const ConnectionIcon = connectionStatus === 'connected' ? Wifi : connectionStatus === 'disconnected' ? WifiOff : Clock3;
  const connectionColor =
    connectionStatus === 'connected'
      ? 'text-green-600'
      : connectionStatus === 'disconnected'
        ? 'text-red-500'
        : 'text-muted-foreground';

  // Stale days message
  const staleMessage =
    lastUpdated == null
      ? 'Tus tareas nunca se han sincronizado — conecta para refrescar'
      : `Tus tareas tienen ${staleDays ?? 0} días — conecta para refrescar`;

  if (collapsed) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div
            className="flex flex-col items-center gap-2 py-2"
            data-testid="offline-indicator-collapsed"
            title={`${pendingCount} pendientes · ${connectionLabel} · ${lastUpdatedText}${isStale ? ' · ' + staleMessage : ''}`}
          >
            <div className="relative">
              <Layers className="w-4 h-4 text-muted-foreground" />
              {pendingCount > 0 && (
                <span
                  data-testid="offline-pending-badge"
                  className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
                >
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </div>
            <ConnectionIcon className={`w-3.5 h-3.5 ${connectionColor}`} data-testid="offline-connection-icon" />
            {isStale && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" data-testid="offline-stale-icon" />}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup data-testid="offline-indicator">
      <SidebarGroupContent>
        <div className={`mx-2 rounded-lg border p-3 space-y-2 ${isStale ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800' : 'border-border bg-muted/30'}`}>
          {/* Pendientes */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Procesos Pendientes
            </span>
            <span
              data-testid="offline-pending-count"
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${pendingCount > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {pendingCount}
            </span>
          </div>

          {/* Última actualización */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5" />
              Última actualización
            </span>
          </div>
          <p data-testid="offline-last-updated" className="text-xs text-foreground -mt-1.5 truncate" title={lastUpdatedText}>
            {lastUpdatedText}
          </p>

          {/* Estado conexión */}
          <div className="flex items-center gap-1.5" data-testid="offline-connection-status">
            <ConnectionIcon className={`w-3.5 h-3.5 ${connectionColor}`} />
            <span className={`text-xs font-medium ${connectionColor}`}>{connectionLabel}</span>
            {connectionStatus === 'checking' && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
          </div>

          {/* Aviso ámbar - nunca bloquea */}
          {isStale && (
            <div
              data-testid="offline-stale-warning"
              className="flex items-start gap-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800 px-2 py-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200 leading-tight">{staleMessage}</p>
                <Link
                  to="/projects"
                  className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-1 mt-0.5"
                  data-testid="offline-stale-link"
                >
                  Ir a Proyectos <RefreshCw className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
