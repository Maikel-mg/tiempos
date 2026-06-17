import { createContext, useContext, useRef, useSyncExternalStore, type ReactNode } from 'react';

// External store - avoids re-rendering the whole tree
function createCommandPaletteStore() {
  let isOpen = false;
  const listeners = new Set<() => void>();

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function open() {
    if (!isOpen) {
      isOpen = true;
      notify();
    }
  }

  function close() {
    if (isOpen) {
      isOpen = false;
      notify();
    }
  }

  function toggle() {
    isOpen = !isOpen;
    notify();
  }

  function getIsOpen() {
    return isOpen;
  }

  return { subscribe, open, close, toggle, getIsOpen };
}

type CommandPaletteStore = ReturnType<typeof createCommandPaletteStore>;

const CommandPaletteContext = createContext<CommandPaletteStore | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<CommandPaletteStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createCommandPaletteStore();
  }

  return (
    <CommandPaletteContext.Provider value={storeRef.current}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const store = useContext(CommandPaletteContext);
  if (!store) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }

  const isOpen = useSyncExternalStore(store.subscribe, store.getIsOpen, store.getIsOpen);

  return { isOpen, open: store.open, close: store.close, toggle: store.toggle };
}
