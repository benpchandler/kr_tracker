import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  Aggregation,
  DEFAULT_HEALTH_THRESHOLDS,
  calculateForecast,
  calculatePaceToDate,
  calculateRolling3,
  calculateWoWChange,
  computeMetrics,
  determineHealth,
  summarizeMetrics
} from './engine';
import type { KR } from '../types';
import type { ActualData, KrWeekMetrics, PlanBaseline } from '../state/store';

type Case<T> = { name: string } & T;

const ISO_BASE = '2024-12-30T00:00:00.000Z';

function makeKr(id: string, aggregation: Aggregation = 'cumulative'): KR & { aggregationType: Aggregation } {
  return {
    id,
    title: `KR ${id}`,
    description: 'test kr',
    teamId: 'team-1',
    owner: 'owner-1',
    quarterId: 'q1',
    target: '100',
    unit: 'count',
    baseline: '0',
    current: '0',
    progress: 0,
    weeklyActuals: [],
    status: 'not-started',
    deadline: '2025-12-31',
    autoUpdateEnabled: false,
    linkedInitiativeIds: [],
    comments: [],
    aggregationType: aggregation
  } as KR & { aggregationType: Aggregation };
}

function makeBaseline(krId: string, data: Record<string, number | undefined>): PlanBaseline {
  const sanitized: Record<string, number> = {};
  Object.entries(data).forEach(([week, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[week] = value;
    }
  });
  return {
    id: 'baseline-1',
    version: 1,
    lockedAt: ISO_BASE,
    lockedBy: 'tester',
    data: {
      [krId]: sanitized
    }
  };
}

function makeActuals(krId: string, data: Record<string, number | undefined>): ActualData {
  const sanitized: Record<string, number> = {};
  Object.entries(data).forEach(([week, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[week] = value;
    }
  });
  return {
    [krId]: sanitized
  };
}

function weeks(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `2024-W${String(index + 1).padStart(2, '0')}`);
}

describe('determineHealth', () => {
  const thresholds = DEFAULT_HEALTH_THRESHOLDS;

  const cases: Case<{ pace: number; expected: 'green' | 'yellow' | 'red' }>[] = [
    { name: 'exact green threshold', pace: thresholds.green, expected: 'green' },
    { name: 'just below green', pace: thresholds.green - 0.01, expected: 'yellow' },
    { name: 'exact yellow threshold', pace: thresholds.yellow, expected: 'yellow' },
    { name: 'below yellow', pace: thresholds.yellow - 0.01, expected: 'red' },
    { name: 'above 100 percent', pace: 150, expected: 'green' },
    { name: 'NaN treated as red', pace: Number.NaN, expected: 'red' }
  ];

  test.each(cases)('$name', ({ pace, expected }) => {
    expect(determineHealth(pace, thresholds)).toBe(expected);
  });

  test('custom thresholds support inverted goals when configured explicitly', () => {
    const inverted = { green: 60, yellow: 40 };
    expect(determineHealth(55, inverted)).toBe('yellow');
    expect(determineHealth(65, inverted)).toBe('green');
  });
});

describe('calculatePaceToDate', () => {
  const krId = 'kr-pace';
  const baseWeeks = weeks(4);

  describe('cumulative', () => {
    const kr = makeKr(krId, 'cumulative');
    const baseline = makeBaseline(krId, {
      [baseWeeks[0]]: 10,
      [baseWeeks[1]]: 15,
      [baseWeeks[2]]: 20
    });
    const actuals = makeActuals(krId, {
      [baseWeeks[0]]: 8,
      [baseWeeks[1]]: 12,
      [baseWeeks[2]]: 30
    });

    const cases: Case<{ index: number; expected: number }>[] = [
      {
        name: 'sums plan and actual to date',
        index: 2,
        expected: ((8 + 12 + 30) / (10 + 15 + 20)) * 100
      },
      {
        name: 'guards against zero cumulative plan',
        index: 3,
        expected: 0
      }
    ];

    test.each(cases)('$name', ({ index, expected }) => {
      expect(
        calculatePaceToDate(kr, index, baseWeeks, index === 3 ? makeBaseline(krId, {}) : baseline, actuals, 'cumulative')
      ).toBeCloseTo(expected, 5);
    });
  });

  describe('snapshot', () => {
    const kr = makeKr(krId, 'snapshot');
    const _baseline = makeBaseline(krId, {
      [baseWeeks[2]]: 100
    });
    const _actuals = makeActuals(krId, {
      [baseWeeks[2]]: 125
    });

    const cases: Case<{ plan: number | undefined; actual: number | undefined; expected: number }>[] = [
      {
        name: 'uses latest plan and actual',
        plan: 100,
        actual: 125,
        expected: 125
      },
      {
        name: 'returns 0 when plan is zero',
        plan: 0,
        actual: 40,
        expected: 0
      },
      {
        name: 'treats missing actual as zero',
        plan: 90,
        actual: undefined,
        expected: 0
      }
    ];

    test.each(cases)('$name', ({ plan, actual, expected }) => {
      const baselineOverrides = makeBaseline(krId, {
        [baseWeeks[2]]: plan ?? 0
      });
      const actualOverrides = makeActuals(krId, actual !== undefined ? { [baseWeeks[2]]: actual } : {});
      expect(
        calculatePaceToDate(kr, 2, baseWeeks, baselineOverrides, actualOverrides, 'snapshot')
      ).toBeCloseTo(expected, 5);
    });
  });

  describe('average', () => {
    const kr = makeKr(krId, 'average');
    const cases: Case<{ baselineValues: Record<string, number | undefined>; actualValues: Record<string, number | undefined>; expected: number }>[] = [
      {
        name: 'compares averages of plan and actual',
        baselineValues: {
          [baseWeeks[0]]: 10,
          [baseWeeks[1]]: 20,
          [baseWeeks[2]]: 30
        },
        actualValues: {
          [baseWeeks[0]]: 5,
          [baseWeeks[1]]: 15,
          [baseWeeks[2]]: 35
        },
        expected: ((5 + 15 + 35) / 3) / ((10 + 20 + 30) / 3) * 100
      },
      {
        name: 'ignores undefined plan values',
        baselineValues: {
          [baseWeeks[0]]: undefined,
          [baseWeeks[1]]: 25
        },
        actualValues: {
          [baseWeeks[0]]: 10,
          [baseWeeks[1]]: 15
        },
        expected: ((10 + 15) / 2) / 25 * 100
      },
      {
        name: 'returns 0 when no plan average',
        baselineValues: {},
        actualValues: {
          [baseWeeks[0]]: 10
        },
        expected: 0
      }
    ];

    test.each(cases)('$name', ({ baselineValues, actualValues, expected }) => {
      const baseline = makeBaseline(krId, baselineValues as Record<string, number>);
      const actuals = makeActuals(krId, actualValues as Record<string, number>);
      expect(
        calculatePaceToDate(kr, baseWeeks.length - 1, baseWeeks, baseline, actuals, 'average')
      ).toBeCloseTo(expected, 5);
    });
  });

  test('pace to date property: finite and bounded', () => {
    const aggregationArb = fc.constantFrom<Aggregation>('cumulative', 'snapshot', 'average');
    const weeksArb = fc.integer({ min: 1, max: 6 });
    fc.assert(
      fc.property(aggregationArb, weeksArb, fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0.01, max: 1000, noNaN: true }), (aggregation, weekCount, coverage, planBase) => {
        const kr = makeKr('kr-prop', aggregation);
        const weekList = weeks(weekCount);
        const plan: Record<string, number> = {};
        const actual: Record<string, number> = {};

        weekList.forEach((weekKey, idx) => {
          const planValue = planBase * (idx + 1);
          const actualValue = planValue * (coverage * 5);
          plan[weekKey] = planValue;
          actual[weekKey] = planValue === 0 ? 0 : actualValue;
        });

        const baseline = makeBaseline(kr.id, plan);
        const actuals = makeActuals(kr.id, actual);
        const pace = calculatePaceToDate(kr, weekList.length - 1, weekList, baseline, actuals, aggregation);
        expect(Number.isFinite(pace)).toBe(true);
        expect(pace / 100).toBeLessThanOrEqual(5 + 1e-6);
        expect(pace / 100).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 80 }
    );
  });
});

describe('calculateForecast', () => {
  const kr = makeKr('kr-forecast', 'cumulative');
  const weekList = weeks(4);
  const _baseline = makeBaseline(kr.id, {
    [weekList[0]]: 10,
    [weekList[1]]: 10,
    [weekList[2]]: 10,
    [weekList[3]]: 10
  });
  const baseActuals = {
    [weekList[0]]: 8,
    [weekList[1]]: 12,
    [weekList[2]]: 6,
    [weekList[3]]: 0
  };
  const snapshotActuals = {
    [weekList[0]]: 4,
    [weekList[1]]: 5,
    [weekList[2]]: 6,
    [weekList[3]]: 7
  };
  const actuals: ActualData = {
    [kr.id]: { ...baseActuals },
    'kr-snap': { ...snapshotActuals },
    'kr-avg': { ...snapshotActuals }
  };

  test('cumulative projects using rolling average and remaining weeks', () => {
    const rolling = 9;
    const result = calculateForecast(kr, 1, weekList, actuals, rolling, 'cumulative');
    expect(result).toBeCloseTo((8 + 12) + rolling * (weekList.length - 2), 5);
  });

  test('cumulative forecast equals total when no remaining weeks', () => {
    const rolling = calculateRolling3(kr.id, weekList.length - 1, weekList, actuals);
    const result = calculateForecast(kr, weekList.length - 1, weekList, actuals, rolling, 'cumulative');
    expect(result).toBeCloseTo(8 + 12 + 6 + 0, 5);
  });

  test('snapshot uses rolling average or last actual', () => {
    const snapshotKr = makeKr('kr-snap', 'snapshot');
    const latestIndex = weekList.length - 2;
    const withRolling = calculateForecast(snapshotKr, latestIndex, weekList, actuals, 7, 'snapshot');
    expect(withRolling).toBe(7);

    const withoutRolling = calculateForecast(snapshotKr, latestIndex, weekList, actuals, 0, 'snapshot');
    expect(withoutRolling).toBe(snapshotActuals[weekList[latestIndex]]);
  });

  test('average forecast matches rolling window', () => {
    const avgKr = makeKr('kr-avg', 'average');
    expect(calculateForecast(avgKr, 2, weekList, actuals, 11, 'average')).toBe(11);
  });
});

describe('calculateWoWChange', () => {
  const krId = 'kr-wow';
  const weekList = weeks(3);

  test('first week returns zero deltas', () => {
    const actuals = makeActuals(krId, { [weekList[0]]: 12 });
    expect(calculateWoWChange(krId, weekList[0], 0, weekList, actuals)).toEqual({ deltaWoW: 0, deltaWoWPct: 0 });
  });

  test('handles prior zero without division error', () => {
    const actuals = makeActuals(krId, {
      [weekList[0]]: 0,
      [weekList[1]]: 5
    });
    expect(calculateWoWChange(krId, weekList[1], 1, weekList, actuals)).toEqual({ deltaWoW: 5, deltaWoWPct: 0 });
  });

  test('computes delta and percent change', () => {
    const actuals = makeActuals(krId, {
      [weekList[0]]: 10,
      [weekList[1]]: 15
    });
    const result = calculateWoWChange(krId, weekList[1], 1, weekList, actuals);
    expect(result.deltaWoW).toBe(5);
    expect(result.deltaWoWPct).toBeCloseTo(50, 5);
  });
});

describe('calculateRolling3', () => {
  const krId = 'kr-roll';
  const weekList = weeks(5);
  const actuals = makeActuals(krId, {
    [weekList[0]]: 10,
    [weekList[1]]: 20,
    [weekList[2]]: 30,
    [weekList[3]]: 40
  });

  const cases: Case<{ index: number; expected: number; description: string }>[] = [
    { name: 'less than three weeks returns mean of available', index: 1, expected: (10 + 20) / 2, description: '' },
    { name: 'exactly three weeks averages last three', index: 2, expected: (10 + 20 + 30) / 3, description: '' },
    { name: 'more than three weeks uses trailing window', index: 3, expected: (20 + 30 + 40) / 3, description: '' }
  ];

  test.each(cases)('$name', ({ index, expected }) => {
    expect(calculateRolling3(krId, index, weekList, actuals)).toBeCloseTo(expected, 5);
  });

  test('skips undefined values within window', () => {
    const sparseActuals = makeActuals(krId, {
      [weekList[0]]: 10,
      [weekList[2]]: 40
    });
    expect(calculateRolling3(krId, 2, weekList, sparseActuals)).toBeCloseTo((10 + 40) / 2, 5);
  });
});

describe('computeMetrics and summarizeMetrics', () => {
  const kr = makeKr('kr-compute', 'cumulative');
  const weekList = weeks(3);

  test('returns entries for each KR-week with no NaN values', () => {
    const baseline = makeBaseline(kr.id, {
      [weekList[0]]: 0,
      [weekList[1]]: 10
    });
    const actuals = makeActuals(kr.id, {
      [weekList[0]]: 5,
      [weekList[1]]: 6,
      [weekList[2]]: 7
    });

    const metrics = computeMetrics({
      krs: [kr],
      baseline,
      actuals,
      weeks: weekList,
      currentWeekIndex: weekList.length - 1
    });

    expect(metrics).toHaveLength(weekList.length);
    metrics.forEach(metric => {
      expect(Number.isNaN(metric.plan)).toBe(false);
      expect(Number.isNaN(metric.actual)).toBe(false);
      expect(Number.isNaN(metric.deltaWoW)).toBe(false);
      expect(Number.isNaN(metric.deltaWoWPct)).toBe(false);
      expect(Number.isNaN(metric.rolling3)).toBe(false);
      expect(Number.isNaN(metric.paceToDatePct)).toBe(false);
      expect(Number.isNaN(metric.forecastEOP)).toBe(false);
      expect(Number.isNaN(metric.varianceWeekly)).toBe(false);
    });
  });

  test('summarizeMetrics selects latest week and counts health', () => {
    const metrics: KrWeekMetrics[] = [
      {
        krId: kr.id,
        weekISO: weekList[0],
        plan: 10,
        actual: 8,
        deltaWoW: 0,
        deltaWoWPct: 0,
        rolling3: 8,
        paceToDatePct: 80,
        forecastEOP: 32,
        health: 'red',
        varianceWeekly: -2
      },
      {
        krId: kr.id,
        weekISO: weekList[2],
        plan: 10,
        actual: 12,
        deltaWoW: 2,
        deltaWoWPct: 20,
        rolling3: 10,
        paceToDatePct: 120,
        forecastEOP: 40,
        health: 'green',
        varianceWeekly: 2
      }
    ];

    const summary = summarizeMetrics(metrics, weekList);
    expect(summary.byKr[kr.id].weekISO).toBe(weekList[2]);
    expect(summary.healthCounts.green).toBe(1);
    expect(summary.healthCounts.red).toBe(0);
    expect(summary.averagePaceToDatePct).toBeCloseTo(120, 5);
    expect(summary.averageForecastEOP).toBeCloseTo(40, 5);
  });

  test('property: computeMetrics output stays finite with bounded inputs', () => {
    const aggregationArb = fc.constantFrom<Aggregation>('cumulative', 'snapshot', 'average');
    const weekCountArb = fc.integer({ min: 1, max: 6 });
    const planBaseArb = fc.double({ min: 0.01, max: 500, noNaN: true });
    const coverageArb = fc.double({ min: 0, max: 5, noNaN: true });

    fc.assert(
      fc.property(aggregationArb, weekCountArb, planBaseArb, coverageArb, (aggregation, weekCount, basePlan, coverage) => {
        const krAgg = makeKr('kr-prop-compute', aggregation);
        const weekListDynamic = weeks(weekCount);
        const plan: Record<string, number> = {};
        const actual: Record<string, number> = {};

        weekListDynamic.forEach((weekKey, idx) => {
          const planValue = basePlan * (idx + 1);
          plan[weekKey] = planValue;
          actual[weekKey] = planValue * coverage;
        });

        const baseline = makeBaseline(krAgg.id, plan);
        const actuals = makeActuals(krAgg.id, actual);

        const metrics = computeMetrics({
          krs: [krAgg],
          baseline,
          actuals,
          weeks: weekListDynamic,
          currentWeekIndex: weekListDynamic.length - 1
        });

        metrics.forEach(metric => {
          expect(Number.isFinite(metric.deltaWoWPct)).toBe(true);
          expect(Number.isFinite(metric.paceToDatePct)).toBe(true);
          expect(metric.paceToDatePct / 100).toBeLessThanOrEqual(5 + 1e-6);
          expect(metric.paceToDatePct / 100).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(metric.forecastEOP)).toBe(true);
        });

        const summary = summarizeMetrics(metrics, weekListDynamic);
        expect(
          summary.healthCounts.green + summary.healthCounts.yellow + summary.healthCounts.red
        ).toBe(Object.keys(summary.byKr).length);
      }),
      { numRuns: 60 }
    );
  });
});
