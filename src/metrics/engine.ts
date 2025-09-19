import { HEALTH_THRESHOLDS, ROLLING_WINDOW_WEEKS } from '../config'
import { AppState, ID, KeyResult, KrMetricsSummary, KrWeekMetrics } from '../models/types'

type Week = { index: number; startISO: string; iso: string }

function mean(values: number[]): number | undefined {
  const xs = values.filter(v => typeof v === 'number' && !isNaN(v))
  if (xs.length === 0) return undefined
  const s = xs.reduce((a, b) => a + b, 0)
  return s / xs.length
}

function lastIndexWith<T>(arr: (T | undefined)[]): number | undefined {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] !== undefined) return i
  return undefined
}

function healthFromPace(pace?: number): 'green' | 'yellow' | 'red' | undefined {
  if (pace === undefined) return undefined
  if (pace >= HEALTH_THRESHOLDS.healthy) return 'green'
  if (pace >= HEALTH_THRESHOLDS.atRisk) return 'yellow'
  return 'red'
}

/**
 * Computes a rolling mean for a series accessor ending at the provided index.
 */
function rollingMeanForSeries(
  series: KrWeekMetrics[],
  endIndex: number,
  windowSize: number,
  selector: (metrics: KrWeekMetrics) => number | undefined,
  requireFullWindow = false
): number | undefined {
  if (endIndex < 0 || windowSize <= 0) return undefined
  if (requireFullWindow && endIndex + 1 < windowSize) return undefined

  const startIndex = Math.max(0, endIndex - windowSize + 1)
  const values: number[] = []
  for (let idx = startIndex; idx <= endIndex; idx++) {
    const metrics = series[idx]
    if (!metrics) continue
    const value = selector(metrics)
    if (value !== undefined && !Number.isNaN(value)) {
      values.push(value)
    }
  }

  return mean(values)
}

/**
 * Builds the per-week metrics series for a key result including cumulative context.
 */
function buildBaseSeries(
  kr: KeyResult,
  weeks: Week[],
  perWeekPlan: Record<string, number | undefined>,
  perWeekActual: Record<string, number | undefined>
): KrWeekMetrics[] {
  const series: KrWeekMetrics[] = []
  let cumulativeActual = 0
  let cumulativePlan = 0

  for (const week of weeks) {
    const plan = perWeekPlan[week.iso] ?? perWeekPlan[week.startISO]
    const actual = perWeekActual[week.iso] ?? perWeekActual[week.startISO]
    const previous = series[series.length - 1]
    const prevActual = previous?.actual
    const deltaWoW = prevActual !== undefined && actual !== undefined ? actual - prevActual : undefined
    const deltaWoWPct =
      prevActual !== undefined && prevActual !== 0 && actual !== undefined
        ? (actual - prevActual) / prevActual
        : undefined

    if (kr.aggregation === 'cumulative') {
      cumulativeActual += actual ?? 0
      cumulativePlan += plan ?? 0
    }

    const metrics: KrWeekMetrics = {
      krId: kr.id,
      isoWeek: week.iso,
      index: week.index,
      actual,
      plan,
      deltaWoW,
      deltaWoWPct,
      varianceWeekly: actual !== undefined && plan !== undefined ? actual - plan : undefined,
      cumulativeActual: kr.aggregation === 'cumulative' ? cumulativeActual : undefined,
      cumulativePlan: kr.aggregation === 'cumulative' ? cumulativePlan : undefined,
    }

    series.push(metrics)
    metrics.rolling3 = rollingMeanForSeries(series, series.length - 1, ROLLING_WINDOW_WEEKS, m => m.actual, true)
  }

  return series
}

/**
 * Applies the aggregation-specific calculations for pace and forecast.
 */
function applyAggregationMetrics(kr: KeyResult, series: KrWeekMetrics[]): void {
  if (series.length === 0) return

  switch (kr.aggregation) {
    case 'cumulative':
      applyCumulativeAggregation(series)
      break
    case 'snapshot':
      applySnapshotAggregation(series)
      break
    case 'average':
      applyAverageAggregation(series)
      break
  }
}

/**
 * Computes cumulative pace and forecast projections.
 */
function applyCumulativeAggregation(series: KrWeekMetrics[]): void {
  for (let i = 0; i < series.length; i++) {
    const metrics = series[i]
    if (
      metrics.cumulativeActual !== undefined &&
      metrics.cumulativePlan !== undefined &&
      metrics.cumulativePlan !== 0
    ) {
      metrics.paceToDatePct = metrics.cumulativeActual / metrics.cumulativePlan
    }

    const remainingWeeks = series.length - 1 - i
    if (metrics.rolling3 !== undefined && metrics.cumulativeActual !== undefined) {
      metrics.forecastEOP = metrics.cumulativeActual + metrics.rolling3 * remainingWeeks
    }
  }
}

/**
 * Computes snapshot pace and forecast values using the latest valid data.
 */
function applySnapshotAggregation(series: KrWeekMetrics[]): void {
  let lastPace: number | undefined
  for (const metrics of series) {
    if (metrics.actual !== undefined && metrics.plan !== undefined && metrics.plan !== 0) {
      lastPace = metrics.actual / metrics.plan
    }

    metrics.paceToDatePct = lastPace
    metrics.forecastEOP = metrics.rolling3 ?? metrics.actual
  }
}

/**
 * Computes rolling averages for average aggregations and derives pace/forecast.
 */
function applyAverageAggregation(series: KrWeekMetrics[]): void {
  if (series.length === 0) return

  const rollingActuals = new Array<number | undefined>(series.length)
  const rollingPlans = new Array<number | undefined>(series.length)

  for (let i = 0; i < series.length; i++) {
    rollingActuals[i] = rollingMeanForSeries(series, i, ROLLING_WINDOW_WEEKS, m => m.actual)
    rollingPlans[i] = rollingMeanForSeries(series, i, ROLLING_WINDOW_WEEKS, m => m.plan)
    series[i].rolling3 = rollingActuals[i]

    const rollActual = rollingActuals[i]
    const rollPlan = rollingPlans[i]
    if (rollActual !== undefined && rollPlan !== undefined && rollPlan !== 0) {
      series[i].paceToDatePct = rollActual / rollPlan
    }

    series[i].forecastEOP = rollActual
  }
}

/**
 * Assigns KR health based on the most recent pace and goal directionality.
 */
function assignHealthState(kr: KeyResult, series: KrWeekMetrics[]): void {
  if (series.length === 0) return

  const latestIdx = lastIndexWith(series.map(s => s.paceToDatePct)) ?? series.length - 1
  if (latestIdx < 0 || latestIdx >= series.length) return

  const latest = series[latestIdx]
  if (!latest) return

  const isDecreaseGoal =
    typeof kr.goalStart === 'number' &&
    typeof kr.goalEnd === 'number' &&
    kr.goalEnd < kr.goalStart

  const pace = latest.paceToDatePct
  if (pace !== undefined) {
    const effectivePace = isDecreaseGoal && pace > 0 ? 1 / pace : pace
    const derivedHealth = healthFromPace(effectivePace)
    if (derivedHealth) {
      latest.health = derivedHealth
    }
    return
  }

  if (latest.actual === undefined || latest.plan === undefined) return

  let isOnTrack = false
  if (isDecreaseGoal) {
    isOnTrack = latest.actual <= latest.plan
  } else {
    isOnTrack = latest.actual >= latest.plan
  }

  latest.health = isOnTrack ? 'yellow' : 'red'
}

export function computeMetrics(state: AppState, weeks: Week[]): Map<ID, KrWeekMetrics[]> {
  const map = new Map<ID, KrWeekMetrics[]>()
  const baseline = state.baselines.find(b => b.id === state.currentBaselineId)
  if (!baseline) return map

  for (const kr of state.krs) {
    const perWeekActual = state.actuals[kr.id] ?? {}
    const perWeekPlan = baseline.data[kr.id] ?? {}
    const series = buildBaseSeries(kr, weeks, perWeekPlan, perWeekActual)

    applyAggregationMetrics(kr, series)
    assignHealthState(kr, series)

    map.set(kr.id, series)
  }

  return map
}

export function summarizeMetrics(state: AppState, weeks: Week[]): KrMetricsSummary[] {
  const byKr = computeMetrics(state, weeks)
  const res: KrMetricsSummary[] = []
  for (const kr of state.krs) {
    const series = byKr.get(kr.id) || []
    const weeksIds = weeks.map(w => w.iso)
    const latest = series[series.length - 1]
    const latestWeek = latest?.isoWeek
    const latestPacePct = latest?.paceToDatePct
    const latestVariance = latest?.varianceWeekly
    const health = latest?.health
    res.push({
      krId: kr.id,
      latestWeek,
      latestPacePct,
      latestVariance,
      health,
      series: {
        weeks: weeksIds,
        actual: series.map(s => s.actual),
        plan: series.map(s => s.plan),
      }
    })
  }
  return res
}
