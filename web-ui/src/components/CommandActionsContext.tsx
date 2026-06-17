import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';

export interface CommandAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  when?: () => boolean;
  group: string;
}

// External store - no React re-renders for registration
function createCommandActionsStore() {
  const actionsMap = new Map<string, CommandAction[]>();
  const listeners = new Set<() => void>();
  let cachedSnapshot: CommandAction[] = [];
  let snapshotDirty = true;

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  function notify() {
    snapshotDirty = true;
    listeners.forEach((listener) => listener());
  }

  function register(pageId: string, actions: CommandAction[]) {
    actionsMap.set(pageId, actions);
    notify();
  }

  function unregister(pageId: string) {
    actionsMap.delete(pageId);
    notify();
  }

  function getSnapshot(): CommandAction[] {
    if (snapshotDirty) {
      const all: CommandAction[] = [];
      actionsMap.forEach((actions) => { all.push(...actions); });
      const available = all.filter((action) => {
        if (action.when) return action.when();
        return true;
      });
      // Only update cache if content actually changed
      if (available.length !== cachedSnapshot.length || 
          available.some((a, i) => a.id !== cachedSnapshot[i]?.id)) {
        cachedSnapshot = available;
      }
      snapshotDirty = false;
    }
    return cachedSnapshot;
  }

  return { subscribe, register, unregister, getSnapshot };
}

type CommandActionsStore = ReturnType<typeof createCommandActionsStore>;

const CommandActionsContext = createContext<CommandActionsStore | null>(null);

export function CommandActionsProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<CommandActionsStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createCommandActionsStore();
  }

  return (
    <CommandActionsContext.Provider value={storeRef.current}>
      {children}
    </CommandActionsContext.Provider>
  );
}

/**
 * Hook para que las páginas registren sus acciones contextuales.
 * No causa re-renders en la página que registra.
 */
export function useCommandActions(pageId: string, actions: CommandAction[]) {
  const store = useContext(CommandActionsContext);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    if (!store) return;
    store.register(pageId, actions);
    return () => store.unregister(pageId);
  }, [pageId, store, actions]);
}

/**
 * Hook para obtener las acciones disponibles actualmente.
 * Solo re-renderiza cuando cambian las acciones (no cuando cambia el provider).
 */
export function useAvailableActions(): CommandAction[] {
  const store = useContext(CommandActionsContext);
  
  const subscribe = store?.subscribe ?? (() => () => {});
  const getSnapshot = store?.getSnapshot ?? (() => []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
