import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const HOURS_PER_DAY = 8;

function parseSpanishDate(dateStr) {
  if (!dateStr) return null;
  
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? null : date;
}

export function calculateHours(startDate, endDate) {
  if (!startDate || !endDate) {
    return null;
  }

  const start = parseSpanishDate(startDate);
  const end = parseSpanishDate(endDate);

  if (!start || !end) {
    return null;
  }

  if (end < start) {
    return 0;
  }

  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return HOURS_PER_DAY;
  }

  return diffDays * HOURS_PER_DAY;
}

export function formatToYYYYMMDD(dateStr) {
  const date = parseSpanishDate(dateStr);
  if (!date) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}`;
}

export function getFirstDayOfMonthYYYYMMDD(dateStr) {
  const date = parseSpanishDate(dateStr);
  if (!date) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  return `${year}${month}01`;
}
