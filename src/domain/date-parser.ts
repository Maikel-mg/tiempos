export interface ParsedDate {
  year: string;
  month: string;
  day: string;
  yyyymmdd: string;
}

export function parseAmbiguousDate(input: string): ParsedDate | null {
  if (!input) return null;

  const normalized = input.replace(/\//g, '-');
  const parts = normalized.split('-');

  if (parts.length !== 3) return null;

  const firstPart = parseInt(parts[0], 10);
  const secondPart = parseInt(parts[1], 10);
  const thirdPart = parseInt(parts[2], 10);

  let year: string, month: string, day: string;

  if (firstPart > 99) {
    year = parts[0]; month = parts[1]; day = parts[2];
  } else if (secondPart > 12) {
    year = parts[2]; month = parts[0]; day = parts[1];
  } else if (thirdPart > 99) {
    year = parts[2]; month = parts[1]; day = parts[0];
  } else {
    year = parts[0]; month = parts[1]; day = parts[2];
  }

  const yyyymmdd = `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;

  return { year, month, day, yyyymmdd };
}
