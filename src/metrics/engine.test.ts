import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { computeMetrics, summarizeMetrics } from './engine'
import { HEALTH_THRESHOLDS } from '../config'
import type { AppState, KeyResult } from '../models/types'

function buildState(partial?: Partial<AppState>): AppState {
  const defaultKr: KeyResult = {
    id: 'kr-1',
    name: 'Cumulative KR',
    aggregation: 'cumulative',
    unit: 'count',
  }
  const base: AppState = {
    objectives: [],
    krs: [defaultKr],
    teams: [],
    pods: [],
    podMemberships: [],
    individuals: [],
    people: [],
    period: { startISO: '2025-01-06', endISO: '2025-02-03' },
    planDraft: {},
    actuals: {},
    baselines: [],
    initiatives: [],
  }
  return { ...base, ...(partial || {}), krs: partial?.krs ?? base.krs }
}

const weeks = [
  { index: 0, startISO: '2025-01-06', iso: '2025-W02' },
  { index: 1, startISO: '2025-01-13', iso: '2025-W03' },
  { index: 2, startISO: '2025-01-20', iso: '2025-W04' },
  { index: 3, startISO: '2025-01-27', iso: '2025-W05' },
]

describe('computeMetrics', () => {
  it('returns empty map when no baseline is active', () => {
    const state = buildState({ currentBaselineId: undefined })
    const m = computeMetrics(state, weeks)
    expect(m.size).toBe(0)
  })

  it('computes cumulative pace and forecast using rolling average', () => {
    const state = buildState({
      krs: [{ id: 'kr-1', name: 'Cumulative KR', aggregation: 'cumulative', unit: 'count' }],
      currentBaselineId: 'bl-1',
      baselines: [{ id: 'bl-1', version: 1, lockedAt: '2025-01-01', lockedBy: 'user', data: {
        'kr-1': {
          '2025-W02': 10,
          '2025-W03': 10,
          '2025-W04': 10,
          '2025-W05': 10,
        },
      } }],
      actuals: {
        'kr-1': {
          '2025-W02': 10,
          '2025-W03': 12,
          '2025-W04': 14,
          '2025-W05': 16,
        },
      },
    })

    const metrics = computeMetrics(state, weeks).get('kr-1')!
    expect(metrics[0].cumulativeActual).toBe(10)
    expect(metrics[0].cumulativePlan).toBe(10)
    expect(metrics[0].paceToDatePct).toBe(1)

    expect(metrics[2].rolling3).toBeCloseTo((10 + 12 + 14) / 3)
    expect(metrics[2].cumulativeActual).toBe(36)
    expect(metrics[2].paceToDatePct).toBeCloseTo(36 / 30)

    // remaining weeks = 1 → forecast = current cumulative actual + rolling3 * remaining
    expect(metrics[2].forecastEOP).toBeCloseTo(36 + metrics[2].rolling3!)

    // last week uses rolling average as forecast and keeps pace defined
    expect(metrics[3].rolling3).toBeCloseTo((12 + 14 + 16) / 3)
    expect(metrics[3].forecastEOP).toBeCloseTo(metrics[3].cumulativeActual! + metrics[3].rolling3! * 0)
  })

  it('does not compute pace when cumulative plan is zero', () => {
    const state = buildState({
      krs: [{ id: 'kr-1', name: 'Zero Plan', aggregation: 'cumulative', unit: 'count' }],
      currentBaselineId: 'bl-zero',
      baselines: [{ id: 'bl-zero', version: 1, lockedAt: '2025-01-01', lockedBy: 'user', data: { 'kr-1': {} } }],
      actuals: { 'kr-1': { '2025-W02': 5 } },
    })

    const metrics = computeMetrics(state, weeks).get('kr-1')!
    expect(metrics[0].paceToDatePct).toBeUndefined()
  })

  it('tracks snapshot pace from last good week and falls back to rolling/actual for forecast', () => {
    const state = buildState({
      krs: [{ id: 'kr-1', name: 'Snapshot', aggregation: 'snapshot', unit: 'percent' }],
      currentBaselineId: 'bl-snap',
      baselines: [{ id: 'bl-snap', version: 1, lockedAt: '2025-01-01', lockedBy: 'user', data: {
        'kr-1': {
          '2025-W02': 0,
          '2025-W03': 50,
          '2025-W04': 0,
          '2025-W05': 60,
        },
      } }],
      actuals: {
        'kr-1': {
          '2025-W02': 10,
          '2025-W03': 45,
          '2025-W04': 48,
          '2025-W05': undefined as unknown as number,
        },
      },
    })

    const metrics = computeMetrics(state, weeks).get('kr-1')!
    expect(metrics[1].paceToDatePct).toBeCloseTo(45 / 50)
    // plan zero → pace should stay at last good value
    expect(metrics[2].paceToDatePct).toBeCloseTo(metrics[1].paceToDatePct!)
    // forecast uses rolling3 when available else actual value
    expect(metrics[2].forecastEOP).toBeCloseTo((10 + 45 + 48) / 3)
    expect(metrics[3].forecastEOP).toBeCloseTo(metrics[3].rolling3!)
  })

  it('calculates average rolling pace and forecast', () => {
    const state = buildState({
      krs: [{ id: 'kr-1', name: 'Average KR', aggregation: 'average', unit: 'count' }],
      currentBaselineId: 'bl-avg',
      baselines: [{ id: 'bl-avg', version: 1, lockedAt: '2025-01-01', lockedBy: 'user', data: {
        'kr-1': {
          '2025-W02': 10,
          '2025-W03': 20,
          '2025-W04': 30,
        },
      } }],
      actuals: {
        'kr-1': {
          '2025-W02': 8,
          '2025-W03': 22,
          '2025-W04': 28,
        },
      },
    })

    const metrics = computeMetrics(state, weeks.slice(0, 3)).get('kr-1')!
    expect(metrics[2].rolling3).toBeCloseTo((8 + 22 + 28) / 3)
    const planRollAvg = (10 + 20 + 30) / 3
    expect(metrics[2].paceToDatePct).toBeCloseTo(metrics[2].rolling3! / planRollAvg)
    expect(metrics[2].forecastEOP).toBeCloseTo(metrics[2].rolling3!)
  })

  it('assigns health using thresholds and inverts for decreasing goals', () => {
    const state = buildState({
      krs: [{ id: 'kr-1', name: 'Health KR', aggregation: 'cumulative', unit: 'count', goalStart: 0, goalEnd: 100 }],
      currentBaselineId: 'bl-health',
      baselines: [{ id: 'bl-health', version: 1, lockedAt: '2025-01-01', lockedBy: 'user', data: {
        'kr-1': {
          '2025-W02': 20,
          '2025-W03': 40,
        },
      } }],
      actuals: {
        'kr-1': {
          '2025-W02': 20,
          '2025-W03': 39,
        },
      },
    })
    const metrics = computeMetrics(state, weeks.slice(0, 2)).get('kr-1')!
    expect(metrics[1].paceToDatePct).toBeCloseTo((20 + 39) / (20 + 40))
    expect(metrics[1].health).toBe('yellow')

    const decreasing = buildState({
      krs: [{ id: 'kr-1', name: 'Decrease', aggregation: 'cumulative', unit: 'percent', goalStart: 10, goalEnd: 5 }],
      currentBaselineId: 'bl-dec',
      baselines: [{ id: 'bl-dec', version: 1, lockedAt: '2025-01-01', lockedBy: 'user', data: {
        'kr-1': {
          '2025-W02': 10,
          '2025-W03': 9,
        },
      } }],
      actuals: {
        'kr-1': {
          '2025-W02': 10,
          '2025-W03': 8.8,
        },
      },
    })
    const decMetrics = computeMetrics(decreasing, weeks.slice(0, 2)).get('kr-1')!
    // Effective pace inverts <1→good → expect green when actual below plan trend
    expect(decMetrics[1].health).toBe('green')

    const varianceFallback = buildState({
      krs: [{ id: 'kr-1', name: 'Variance fallback', aggregation: 'snapshot', unit: 'percent', goalStart: 5, goalEnd: 3 }],
      currentBaselineId: 'bl-var',
      baselines: [{ id: 'bl-var', version: 1, lockedAt: '2025-01-01', lockedBy: 'user', data: {
        'kr-1': {
          '2025-W02': 0,
          '2025-W03': 0,
        },
      } }],
      actuals: {
        'kr-1': {
          '2025-W02': 5,
          '2025-W03': 0,
        },
      },
    })
    const varianceMetrics = computeMetrics(varianceFallback, weeks.slice(0, 2)).get('kr-1')!
    expect(varianceMetrics[1].paceToDatePct).toBeUndefined()
    expect(varianceMetrics[1].health).toBe('yellow')
  })
})

describe('summarizeMetrics', () => {
  it('produces summary even when baseline missing', () => {
    const state = buildState()
    const summary = summarizeMetrics(state, weeks)
    expect(summary).toHaveLength(1)
    expect(summary[0]).toMatchObject({
      latestPacePct: undefined,
      latestVariance: undefined,
      health: undefined,
    })
  })

  it('reflects latest week metrics and series ordering', () => {
    const state = buildState({
      currentBaselineId: 'bl-1',
      baselines: [{ id: 'bl-1', version: 1, lockedAt: '2025-01-01', lockedBy: 'user', data: {
        'kr-1': {
          '2025-W02': 10,
          '2025-W03': 20,
        },
      } }],
      actuals: {
        'kr-1': {
          '2025-W02': 10,
          '2025-W03': 25,
        },
      },
    })

    const [summary] = summarizeMetrics(state, weeks.slice(0, 2))
    expect(summary.latestWeek).toBe('2025-W03')
    expect(summary.series.actual).toEqual([10, 25])
    expect(summary.series.plan).toEqual([10, 20])
    expect(summary.latestPacePct).toBeCloseTo((10 + 25) / (10 + 20))
  })
})

describe('health thresholds stay in sync with config', () => {
  it('uses configured bounds for green/yellow', () => {
    expect(HEALTH_THRESHOLDS.healthy).toBeGreaterThan(HEALTH_THRESHOLDS.atRisk)
  })
})

describe('computeMetrics invariants (property)', () => {
  it('never emits NaN pace or forecast', () => {
    const weekCountArb = fc.integer({ min: 1, max: 8 })
    const actualArb = fc.array(fc.double({ min: 0, max: 500, noDefaultInfinity: true, noNaN: true }), { minLength: 1, maxLength: 8 })

    fc.assert(
      fc.property(weekCountArb, actualArb, (count, actualSeries) => {
        const baseDate = new Date('2025-01-06T00:00:00Z')
        const genWeeks = Array.from({ length: count }, (_, idx) => {
          const d = new Date(baseDate.getTime())
          d.setUTCDate(d.getUTCDate() + idx * 7)
          return {
            index: idx,
            startISO: d.toISOString().slice(0, 10),
            iso: `2025-W${String(idx + 2).padStart(2, '0')}`,
          }
        })

        const baselineData = Object.fromEntries(genWeeks.map((w, idx) => [w.iso, idx + 1]))
        const actualsData = Object.fromEntries(genWeeks.map((w, idx) => [w.iso, actualSeries[idx % actualSeries.length]]))

        const state = buildState({
          krs: [{ id: 'kr-1', name: 'Prop KR', aggregation: 'cumulative', unit: 'count' }],
          currentBaselineId: 'bl-prop',
          baselines: [{ id: 'bl-prop', version: 1, lockedAt: '2024-01-01', lockedBy: 'user', data: { 'kr-1': baselineData } }],
          actuals: { 'kr-1': actualsData },
        })

        const metrics = computeMetrics(state, genWeeks).get('kr-1') || []
        for (const week of metrics) {
          expect(Number.isNaN(week.paceToDatePct ?? 0)).toBe(false)
          expect(Number.isNaN(week.forecastEOP ?? 0)).toBe(false)
        }
      }),
      { verbose: true }
    )
  })
})
