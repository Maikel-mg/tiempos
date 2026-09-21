/**
 * Notificaciones del sistema para los recordatorios de trabajo.
 *
 * Sin service worker no se pueden mostrar botones dentro de la notificación:
 * el constructor `Notification` tira `TypeError` si recibe `actions`, y las
 * acciones sólo existen en las notificaciones persistentes que emite
 * `ServiceWorkerRegistration.showNotification()`. Así que el aviso llega con
 * título y cuerpo, y al hacer clic se trae la app al frente, que es donde
 * viven las acciones.
 */

export type NotificationSupport =
  | 'unsupported'
  | 'default'
  | 'granted'
  | 'denied';

export interface ReminderNotification {
  title: string;
  body: string;
  /** Un aviso repetido con el mismo tag reemplaza al anterior en el sistema. */
  tag: string;
}

/** Estado del permiso, o `unsupported` si el navegador no expone la API. */
export function notificationSupport(): NotificationSupport {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

/** Sólo se puede notificar con permiso concedido. */
export function canNotify(): boolean {
  return notificationSupport() === 'granted';
}

/**
 * Pide el permiso. Los navegadores exigen que la llamada venga de un gesto del
 * usuario, así que esto tiene que dispararse desde un botón, nunca al cargar la
 * app.
 */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (notificationSupport() === 'unsupported') return 'unsupported';

  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return notificationSupport();
  }
}

/**
 * Registro activo del service worker, si alguna vez se agrega uno.
 *
 * Hoy la app no registra ninguno, así que esto devuelve `null` y se usa el
 * constructor. La rama existe para no romper el día que se sume: en ese caso
 * las notificaciones se emiten desde el worker, y el worker necesita su propio
 * manejador de `notificationclick` para traer la app al frente.
 */
async function activeRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  if (!navigator.serviceWorker.controller) return null;

  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Muestra el recordatorio. Devuelve `false` si no se pudo (sin permiso, API
 * ausente o excepción), para que el llamador pueda caer al toast.
 */
export async function showReminderNotification(
  notification: ReminderNotification,
): Promise<boolean> {
  if (!canNotify()) return false;

  const options: NotificationOptions = {
    body: notification.body,
    tag: notification.tag,
    requireInteraction: true,
  };

  try {
    const registration = await activeRegistration();
    if (registration) {
      await registration.showNotification(notification.title, options);
      return true;
    }

    const created = new Notification(notification.title, options);
    created.onclick = () => {
      window.focus();
      created.close();
    };
    return true;
  } catch (error) {
    console.error('Error showing reminder notification:', error);
    return false;
  }
}
