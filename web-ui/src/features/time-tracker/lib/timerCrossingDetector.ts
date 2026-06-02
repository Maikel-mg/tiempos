export interface SplitProposal {
  date: string;       // YYYY-MM-DD local
  startTime: string;  // HH:mm local
  endTime: string;    // HH:mm local
  minutes: number;    // floored, whole number
}

export interface CrossingResult {
  crossed: boolean;
  splits?: SplitProposal[];
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatLocalTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function nextDayStartOfDay(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export function detectCrossing(start: Date, end: Date): CrossingResult {
  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) {
    return { crossed: false };
  }

  const startDay = startOfDay(start);
  const endDay = startOfDay(end);

  if (startDay.getTime() === endDay.getTime()) {
    return { crossed: false };
  }

  const totalMinutes = Math.floor(totalMs / 60000);
  const splits: SplitProposal[] = [];
  let remaining = totalMinutes;

  let boundary = nextDayStartOfDay(start);
  let segStart = new Date(start);
  let isFirst = true;

  while (segStart < end) {
    let segEnd: Date;
    if (boundary <= end) {
      segEnd = boundary;
    } else {
      segEnd = end;
    }

    const isLast = boundary >= end;
    const segMs = segEnd.getTime() - segStart.getTime();
    const fullMinutes = Math.floor(segMs / 60000);
    const hasRemainder = segMs % 60000 > 0;

    let minutes: number;
    if (isLast) {
      minutes = remaining;
    } else if (isFirst && hasRemainder) {
      minutes = fullMinutes + 1;
    } else {
      minutes = fullMinutes;
    }

    const isEndAtMidnight = isLast && segEnd.getTime() === end.getTime() &&
      end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0;

    if (isEndAtMidnight) {
      const dayEnd = new Date(segEnd);
      dayEnd.setDate(dayEnd.getDate() - 1);
      dayEnd.setHours(23, 59, 59, 999);
      const firstMs = dayEnd.getTime() - segStart.getTime();
      const firstMin = Math.floor(firstMs / 60000);
      const hasFirstRemainder = firstMs % 60000 > 0;
      const m1 = (isFirst && hasFirstRemainder) ? firstMin + 1 : firstMin;
      splits.push({
        date: formatLocalDate(segStart),
        startTime: formatLocalTime(segStart),
        endTime: formatLocalTime(dayEnd),
        minutes: m1,
      });
      remaining -= m1;
      splits.push({
        date: formatLocalDate(segEnd),
        startTime: formatLocalTime(segEnd),
        endTime: formatLocalTime(end),
        minutes: remaining,
      });
      remaining = 0;
      segStart = end;
    } else {
      splits.push({
        date: formatLocalDate(segStart),
        startTime: formatLocalTime(segStart),
        endTime: formatLocalTime(segEnd),
        minutes,
      });
      remaining -= minutes;
      segStart = segEnd;
      boundary = nextDayStartOfDay(segStart);
      isFirst = false;
    }
  }

  return { crossed: true, splits };
}
