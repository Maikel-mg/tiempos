import { useWorkReminder } from '@/hooks/useWorkReminder';

/**
 * Mounts the work reminders. Renders nothing: it lives in the layout next to the
 * global shortcuts and the live tab title.
 */
export function WorkReminder() {
  useWorkReminder();
  return null;
}
