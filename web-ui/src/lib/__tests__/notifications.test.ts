import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  canNotify,
  notificationSupport,
  requestNotificationPermission,
  showReminderNotification,
} from '../notifications';

/** Doble de la API de notificaciones: jsdom no la implementa. */
class FakeNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
  static instances: FakeNotification[] = [];

  static reset(): void {
    FakeNotification.permission = 'default';
    FakeNotification.requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    FakeNotification.instances = [];
  }

  onclick: (() => void) | null = null;
  close = vi.fn();

  constructor(
    public title: string,
    public options?: NotificationOptions,
  ) {
    FakeNotification.instances.push(this);
  }
}

function stubNotification(): void {
  vi.stubGlobal('Notification', FakeNotification);
}

const REMINDER = {
  title: 'No arrancaste el timer',
  body: 'No hay ningún timer corriendo desde las 09:00.',
  tag: 'timer-not-started',
};

describe('notifications', () => {
  beforeEach(() => {
    FakeNotification.reset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reports unsupported when the API is absent', () => {
    vi.stubGlobal('Notification', undefined);

    expect(notificationSupport()).toBe('unsupported');
    expect(canNotify()).toBe(false);
  });

  it('mirrors the browser permission', () => {
    stubNotification();

    expect(notificationSupport()).toBe('default');
    expect(canNotify()).toBe(false);

    FakeNotification.permission = 'granted';
    expect(canNotify()).toBe(true);

    FakeNotification.permission = 'denied';
    expect(canNotify()).toBe(false);
  });

  it('requests permission through the browser API', async () => {
    stubNotification();

    const result = await requestNotificationPermission();

    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
    expect(result).toBe('granted');
  });

  it('does not request permission when unsupported', async () => {
    vi.stubGlobal('Notification', undefined);

    expect(await requestNotificationPermission()).toBe('unsupported');
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
  });

  it('does not notify without permission', async () => {
    stubNotification();

    expect(await showReminderNotification(REMINDER)).toBe(false);
    expect(FakeNotification.instances).toHaveLength(0);
  });

  it('shows a persistent notification with a tag when granted', async () => {
    stubNotification();
    FakeNotification.permission = 'granted';

    expect(await showReminderNotification(REMINDER)).toBe(true);
    expect(FakeNotification.instances).toHaveLength(1);

    const created = FakeNotification.instances[0];
    expect(created.title).toBe(REMINDER.title);
    expect(created.options).toMatchObject({
      body: REMINDER.body,
      tag: REMINDER.tag,
      requireInteraction: true,
    });
  });

  it('focuses the app and closes the notification on click', async () => {
    stubNotification();
    FakeNotification.permission = 'granted';
    const focus = vi.fn();
    vi.stubGlobal('focus', focus);

    await showReminderNotification(REMINDER);
    const created = FakeNotification.instances[0];
    created.onclick?.();

    expect(focus).toHaveBeenCalled();
    expect(created.close).toHaveBeenCalled();
  });

  it('reports failure instead of throwing when construction blows up', async () => {
    FakeNotification.permission = 'granted';
    vi.stubGlobal(
      'Notification',
      class {
        static permission: NotificationPermission = 'granted';
        constructor() {
          throw new TypeError('notifications disabled');
        }
      },
    );

    expect(await showReminderNotification(REMINDER)).toBe(false);
  });
});
