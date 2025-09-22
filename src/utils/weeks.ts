const MS_PER_DAY = 86_400_000;
const MAX_WEEKS = 200;

export interface WeekInfo {
  isoWeek: string;
  year: number;
  week: number;
  startISO: string;
  endISO: string;
}

export function parseISO(isoDate: string): Date {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  return new Date(date.getTime());
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function weekOf(dateISO: string): WeekInfo {
  const date = parseISO(dateISO);
  const monday = startOfISOWeek(date);
  const sunday = addDays(monday, 6);
  const { isoYear, isoWeek } = getISOYearAndWeek(date);

  return {
    isoWeek: `${isoYear}-W${isoWeek.toString().padStart(2, '0')}`,
    year: isoYear,
    week: isoWeek,
    startISO: toISODate(monday),
    endISO: toISODate(sunday)
  };
}

export function generateWeeks(startISO: string, endISO: string): string[] {
  const start = startOfISOWeek(parseISO(startISO));
  const end = parseISO(endISO);
  const endMidnight = setUTCMidnight(end);

  if (start.getTime() > endMidnight.getTime()) return [];

  const weeks: string[] = [];
  let cursor = start;

  while (cursor.getTime() <= endMidnight.getTime() && weeks.length < MAX_WEEKS) {
    const info = weekOf(toISODate(cursor));
    weeks.push(info.isoWeek);
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

function startOfISOWeek(date: Date): Date {
  const midnight = setUTCMidnight(date);
  const day = midnight.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(midnight, diff);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function setUTCMidnight(date: Date): Date {
  const clone = new Date(date.getTime());
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function getISOYearAndWeek(date: Date): { isoYear: number; isoWeek: number } {
  const target = setUTCMidnight(date);
  target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));

  const isoYear = target.getUTCFullYear();
  const week1 = new Date(Date.UTC(isoYear, 0, 4));
  const diff = target.getTime() - week1.getTime();
  const isoWeek = 1 + Math.round((diff / MS_PER_DAY - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);

  return { isoYear, isoWeek };
}

export { MAX_WEEKS };
