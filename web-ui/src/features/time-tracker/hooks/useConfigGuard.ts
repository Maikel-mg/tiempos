import { useState, useEffect } from 'react';
import { dbConfig } from '@/config/stores';

/**
 * Guard Pattern hook: checks if the required DB config
 * (server + database) is present and non-empty.
 *
 * Reactively updates when config changes via subscription.
 *
 * @returns { isReady: boolean } — true when server and database are both present
 */
export function useConfigGuard(): { isReady: boolean } {
  const [isReady, setIsReady] = useState(() => checkConfig());

  useEffect(() => {
    const unsubscribe = dbConfig.subscribe(() => {
      setIsReady(checkConfig());
    });
    return unsubscribe;
  }, []);

  return { isReady };
}

function checkConfig(): boolean {
  const config = dbConfig.get();
  return !!config?.server && !!config?.database;
}
