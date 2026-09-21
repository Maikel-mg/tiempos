import { useCallback, useEffect, useState } from 'react';
import {
  notificationSupport,
  requestNotificationPermission,
  type NotificationSupport,
} from '@/lib/notifications';

export interface NotificationPermissionState {
  support: NotificationSupport;
  /** Pide el permiso. Tiene que venir de un gesto del usuario. */
  request: () => Promise<void>;
}

/**
 * Estado del permiso de notificaciones.
 *
 * El permiso se puede cambiar desde el candado del navegador sin pasar por la
 * app, así que se relee al recuperar el foco en vez de confiar en el valor que
 * había al montar.
 */
export function useNotificationPermission(): NotificationPermissionState {
  const [support, setSupport] = useState<NotificationSupport>(() => notificationSupport());

  useEffect(() => {
    const sync = () => setSupport(notificationSupport());
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, []);

  const request = useCallback(async () => {
    setSupport(await requestNotificationPermission());
  }, []);

  return { support, request };
}
