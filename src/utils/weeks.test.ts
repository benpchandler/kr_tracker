import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { generateWeeks, MAX_WEEKS, parseISO, toISODate, weekOf } from './weeks';

type Case<T> = { name: string } & T;

function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function iso(date: Date): string {
  return toISODate(date);
}

describe('generateWeeks', () => {
  const cases: Case<{ start: string; end: string; expected: string[] }>[] = [
    {
      name: 'inclusive short range aligns to Mondays',
      start: '2024-01-03',
      end: '2024-01-22',
      expected: ['2024-W01', '2024-W02', '2024-W03', '2024-W04']
    },
    {
      name: 'crosses year boundary with ISO week rollover',
      start: '2024-12-30',
      end: '2025-01-12',
      expected: ['2025-W01', '2025-W02']
    },
    {
      name: 'handles ISO week 53 years',
      start: '2020-12-21',
      end: '2021-01-10',
      expected: ['2020-W52', '2020-W53', '2021-W01']
    }
  ];

  test.each(cases)('$name', ({ start, end, expected }) => {
    expect(generateWeeks(start, end)).toEqual(expected);
  });

  test('caps the maximum number of generated weeks', () => {
    const start = '2020-01-06';
    const end = iso(addDaysUTC(parseISO(start), 7 * 260));
    const result = generateWeeks(start, end);
    expect(result.length).toBeLessThanOrEqual(MAX_WEEKS);
  });

  test('property: generated weeks unique and formatted', () => {
    const startRef = Date.UTC(2018, 0, 1);
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 * 3 }),
        fc.integer({ min: 0, max: 365 * 3 }),
        (offsetDays, spanDays) => {
          const startDate = new Date(startRef + offsetDays * 86_400_000);
          const endDate = addDaysUTC(startDate, spanDays);
          const weeks = generateWeeks(iso(startDate), iso(endDate));
          expect(weeks.length).toBeLessThanOrEqual(MAX_WEEKS);
          const unique = new Set(weeks);
          expect(unique.size).toBe(weeks.length);
          weeks.forEach(week => {
            expect(/^\d{4}-W\d{2}$/.test(week)).toBe(true);
          });
        }
      ),
      { numRuns: 80 }
    );
  });
});

describe('weekOf', () => {
  test('returns Monday start and Sunday end for given date', () => {
    const info = weekOf('2024-02-05');
    expect(info.startISO).toBe('2024-02-05');
    expect(info.endISO).toBe('2024-02-11');
    expect(info.isoWeek).toBe('2024-W06');
    expect(info.week).toBe(6);
  });

  test('normalizes Sunday to same ISO week', () => {
    const monday = weekOf('2024-02-05');
    const sunday = weekOf('2024-02-11');
    expect(sunday.isoWeek).toBe(monday.isoWeek);
    expect(sunday.startISO).toBe(monday.startISO);
  });

  test('assigns dates near year end to correct ISO week year', () => {
    const info = weekOf('2024-12-31');
    expect(info.isoWeek).toBe('2025-W01');
    expect(info.startISO).toBe('2024-12-30');
  });
});

describe('parseISO and toISODate', () => {
  test('parseISO returns UTC midnight date', () => {
    const date = parseISO('2024-01-05');
    expect(date.getUTCFullYear()).toBe(2024);
    expect(date.getUTCMonth()).toBe(0);
    expect(date.getUTCDate()).toBe(5);
    expect(date.getUTCHours()).toBe(0);
  });

  test('toISODate drops time component and stays stable', () => {
    const date = new Date(Date.UTC(2024, 0, 5, 13, 30));
    expect(toISODate(date)).toBe('2024-01-05');
  });

  test('parseISO throws on invalid input', () => {
    expect(() => parseISO('invalid-date')).toThrow('Invalid ISO date');
  });
});
