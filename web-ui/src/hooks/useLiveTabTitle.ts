import { useEffect, useRef } from 'react';
import { formatDurationHMS } from '@/lib/format';
import { useRunningTimer } from '@/hooks/useRunningTimer';

const RUNNING_FAVICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<circle cx="16" cy="16" r="15" fill="none" stroke="#ef4444" stroke-opacity="0.35" stroke-width="2"/>' +
    '<circle cx="16" cy="16" r="10" fill="#ef4444"/>' +
    '</svg>',
)}`;

const FALLBACK_FAVICON = '/vite.svg';
const MAX_TASK_NAME = 40;

function iconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link;
}

function setFavicon(href: string): void {
  iconLink().setAttribute('href', href);
}

function tabTitle(elapsed: number, taskName: string): string {
  const clock = formatDurationHMS(elapsed);
  if (!taskName) return clock;
  const label =
    taskName.length > MAX_TASK_NAME ? `${taskName.slice(0, MAX_TASK_NAME - 1)}…` : taskName;
  return `${clock} · ${label}`;
}

/**
 * Reflects the running timer in the browser tab: elapsed time in the title and
 * a red "recording" favicon.
 *
 * Forgetting to stop the timer is the number one cause of over- and
 * under-reporting (10x session 1, G2), so the signal has to be visible from any
 * page — not just the TimeTracker.
 */
export function useLiveTabTitle(): void {
  const { isRunning, elapsed, taskName } = useRunningTimer();

  const baseTitleRef = useRef<string | null>(null);
  const baseFaviconRef = useRef<string | null>(null);
  if (baseTitleRef.current === null) baseTitleRef.current = document.title;
  if (baseFaviconRef.current === null) {
    baseFaviconRef.current =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute('href') ??
      FALLBACK_FAVICON;
  }

  // Title updates every second while running.
  useEffect(() => {
    document.title = isRunning ? tabTitle(elapsed, taskName) : baseTitleRef.current ?? '';
  }, [isRunning, elapsed, taskName]);

  // Favicon only toggles on run/stop, so it is kept out of the per-second effect
  // and never refetches the image on every tick.
  useEffect(() => {
    setFavicon(isRunning ? RUNNING_FAVICON : baseFaviconRef.current ?? FALLBACK_FAVICON);
  }, [isRunning]);

  useEffect(
    () => () => {
      document.title = baseTitleRef.current ?? '';
      setFavicon(baseFaviconRef.current ?? FALLBACK_FAVICON);
    },
    [],
  );
}
