import type { TimeEntry } from '../types';
import type { LocalWeekDay, LocalWeekGroup } from '../types';

const SPANISH_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const SPANISH_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = (day + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  d.setDate(d.getDate() - diff);
  return d;
}

export function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // Set to Thursday
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function getISOWeekYear(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // Set to Thursday
  return d.getFullYear();
}

export function getWeekKey(dateString: string): string {
  const date = parseDateString(dateString);
  const year = getISOWeekYear(date);
  const week = getWeekNumber(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function formatWeekRange(start: string, end: string): string {
  const startDate = parseDateString(start);
  const endDate = parseDateString(end);

  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startMonth = SPANISH_MONTHS[startDate.getMonth()];
  const endMonth = SPANISH_MONTHS[endDate.getMonth()];

  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${endMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

export function formatShortDate(dateString: string): string {
  const date = parseDateString(dateString);
  return `${SPANISH_DAYS[date.getDay()]} ${date.getDate()}`;
}

export function groupEntriesByWeek(entries: TimeEntry[]): LocalWeekGroup[] {
  if (entries.length === 0) return [];

  // 1. Group entries by their date field
  const dayMap = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const existing = dayMap.get(entry.date);
    if (existing) {
      existing.push(entry);
    } else {
      dayMap.set(entry.date, [entry]);
    }
  }

  // 2. Build LocalWeekDay[] with day-level totals
  const dayGroups: LocalWeekDay[] = [];
  for (const [date, dayEntries] of dayMap) {
    dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
    dayGroups.push({
      date,
      dateFormatted: formatShortDate(date),
      totalSeconds: dayEntries.reduce((sum, e) => sum + e.duration, 0),
      entries: dayEntries,
    });
  }

  // 3. Group days by ISO week (Monday–Sunday)
  const weekMap = new Map<string, LocalWeekDay[]>();
  for (const day of dayGroups) {
    const key = getWeekKey(day.date);
    const existing = weekMap.get(key);
    if (existing) {
      existing.push(day);
    } else {
      weekMap.set(key, [day]);
    }
  }

  // 4. Build LocalWeekGroup[] with week-level totals
  const weekGroups: LocalWeekGroup[] = [];
  for (const [weekKey, days] of weekMap) {
    days.sort((a, b) => a.date.localeCompare(b.date));

    // Compute actual Monday/Sunday of the ISO week from any date in the group
    const monday = getWeekStart(parseDateString(days[0].date));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekStartStr = formatDateToString(monday);
    const weekEndStr = formatDateToString(sunday);

    weekGroups.push({
      weekKey,
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      weekRangeFormatted: formatWeekRange(weekStartStr, weekEndStr),
      totalSeconds: days.reduce((sum, d) => sum + d.totalSeconds, 0),
      days,
    });
  }

  // 5. Sort weeks descending (most recent first)
  weekGroups.sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  return weekGroups;
}
