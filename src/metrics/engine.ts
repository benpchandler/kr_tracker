import { AppState, ID, KrMetricsSummary, KrWeekMetrics } from '../models/types'

type Week = { index: number; startISO: string; iso: string }

const ROLL_N = 3

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

function healthFromPace(pace?: number, trendNonNegative?: boolean): 'green' | 'yellow' | 'red' | undefined {
  if (pace === undefined) return undefined
  if (pace >= 1.0) return 'green'
  if (pace >= 0.95) return trendNonNegative ? 'yellow' : 'yellow'
  return trendNonNegative ? 'yellow' : 'red'
}

export function computeMetrics(state: AppState, weeks: Week[]): Map<ID, KrWeekMetrics[]> {
  const map = new Map<ID, KrWeekMetrics[]>()
  const baseline = state.baselines.find(b => b.id === state.currentBaselineId)
  if (!baseline) return map

  for (const kr of state.krs) {
    const perWeekActual = state.actuals[kr.id] || {}
    const perWeekPlan = baseline.data[kr.id] || {}
    const series: KrWeekMetrics[] = []
    let cumA = 0
    let cumP = 0
    for (const w of weeks) {
      const plan = perWeekPlan[w.iso] ?? perWeekPlan[w.startISO]
      const actual = perWeekActual[w.iso] ?? perWeekActual[w.startISO]
      const prev = series[series.length - 1]
      const deltaWoW = prev && actual !== undefined && prev.actual !== undefined ? (actual - prev.actual) : undefined
      const deltaWoWPct = prev && actual !== undefined && prev.actual ? (actual - prev.actual) / prev.actual : undefined

      if (kr.aggregation === 'cumulative') {
        cumA += (actual ?? 0)
        cumP += (plan ?? 0)
      }

      // rolling3 actual
      let rolling3: number | undefined
      if (series.length >= ROLL_N - 1) {
        const window = series.slice(- (ROLL_N - 1)).map(s => s.actual)
        window.push(actual)
        rolling3 = mean(window.filter(v => v !== undefined) as number[])
      }

      const m: KrWeekMetrics = {
        krId: kr.id,
        isoWeek: w.iso,
        index: w.index,
        actual,
        plan,
        deltaWoW,
        deltaWoWPct,
        rolling3,
        varianceWeekly: actual !== undefined && plan !== undefined ? (actual - plan) : undefined,
        cumulativeActual: kr.aggregation === 'cumulative' ? cumA : undefined,
        cumulativePlan: kr.aggregation === 'cumulative' ? cumP : undefined,
      }
      series.push(m)
    }

    // compute pace and forecast based on type
    if (kr.aggregation === 'cumulative') {
      for (let i = 0; i < series.length; i++) {
        const s = series[i]
        if (s.cumulativeActual !== undefined && s.cumulativePlan && s.cumulativePlan > 0) {
          s.paceToDatePct = s.cumulativeActual / s.cumulativePlan
        }
        const remaining = series.length - 1 - i
        const roll = s.rolling3
        if (roll !== undefined && s.cumulativeActual !== undefined) {
          s.forecastEOP = s.cumulativeActual + roll * remaining
        }
      }
    } else if (kr.aggregation === 'snapshot') {
      // pace = last available weekly actual/plan
      let lastPace: number | undefined
      for (let i = 0; i < series.length; i++) {
        const s = series[i]
        if (s.actual !== undefined && s.plan !== undefined && s.plan !== 0) {
          lastPace = s.actual / s.plan
        }
        s.paceToDatePct = lastPace
        s.forecastEOP = s.rolling3 ?? s.actual
      }
    } else if (kr.aggregation === 'average') {
      // rolling average for actual and plan, pace = rollA/rollP
      const rollA: (number | undefined)[] = []
      const rollP: (number | undefined)[] = []
      for (let i = 0; i < series.length; i++) {
        const aWin: number[] = []
        const pWin: number[] = []
        for (let j = Math.max(0, i - (ROLL_N - 1)); j <= i; j++) {
          if (series[j].actual !== undefined) aWin.push(series[j].actual!)
          if (series[j].plan !== undefined) pWin.push(series[j].plan!)
        }
        rollA[i] = aWin.length ? mean(aWin)! : undefined
        rollP[i] = pWin.length ? mean(pWin)! : undefined
        series[i].rolling3 = rollA[i]
        if (rollA[i] !== undefined && rollP[i]) series[i].paceToDatePct = rollA[i]! / rollP[i]!
        series[i].forecastEOP = rollA[i]
      }
    }

    // health based on latest pace and trend
    const latestIdx = lastIndexWith(series.map(s => s.paceToDatePct)) ?? (series.length - 1)
    const trendNonNegative = series[latestIdx]?.deltaWoW !== undefined ? (series[latestIdx]!.deltaWoW! >= 0) : true
    const latestPace = series[latestIdx]?.paceToDatePct
    const h = healthFromPace(latestPace, trendNonNegative)
    if (h) series[latestIdx].health = h

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

