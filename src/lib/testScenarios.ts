import { AppState, ID, PlanBaseline } from '../models/types'
import { generateWeeks } from '../utils/weeks'

// Helper: linear weekly plan from start -> end across period weeks
function linearPlan(weeks: { iso: string }[], start?: number, end?: number): Record<string, number> {
  const out: Record<string, number> = {}
  if (weeks.length === 0 || start === undefined || end === undefined) return out
  const n = weeks.length - 1
  weeks.forEach((w, i) => {
    const t = n === 0 ? 1 : i / n
    out[w.iso] = start + (end - start) * t
  })
  return out
}

// Helper: scale first N weeks of plan by provided factors
function scalePlan(plan: Record<string, number>, weekKeys: string[], factors: number[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (let i = 0; i < factors.length && i < weekKeys.length; i++) {
    const wk = weekKeys[i]
    const p = plan[wk]
    if (typeof p === 'number') out[wk] = Number((p * factors[i]).toFixed(3))
  }
  return out
}

export type ScenarioKey =
  | 'behind_6w_no_recent_trend'
  | 'green_ahead_trending_up'
  | 'yellow_catching_up'
  | 'no_baseline_locked'
  | 'sparse_actuals'

export const SCENARIO_OPTIONS: { key: ScenarioKey; name: string; description: string }[] = [
  {
    key: 'behind_6w_no_recent_trend',
    name: 'Behind pace (6w) • flat/declining last 3w',
    description: 'Pace <95% about 6 weeks in; last 3 weeks lack positive trend.'
  },
  {
    key: 'green_ahead_trending_up',
    name: 'Ahead of plan • strong trend',
    description: 'Sustained >100% pace with clear positive WoW trend.'
  },
  {
    key: 'yellow_catching_up',
    name: 'Slightly behind • improving',
    description: 'Pace ~97–99% with recent 3-week improvement.'
  },
  {
    key: 'no_baseline_locked',
    name: 'No baseline locked',
    description: 'Plan exists but baseline missing; actuals entry disabled.'
  },
  {
    key: 'sparse_actuals',
    name: 'Sparse actuals (every other week)',
    description: 'Irregular actuals filled to validate paste/visibility clipping.'
  },
]

// Build a deterministic state for each scenario from current state as base
export function buildScenario(base: AppState, key: ScenarioKey): AppState {
  const period = base.period
  const weeks = generateWeeks(period.startISO, period.endISO)
  const weekKeys = weeks.map(w => w.iso)

  // Rebuild plan from KR goals when available for determinism between reloads
  const rebuiltPlan: AppState['planDraft'] = {}
  for (const kr of base.krs) {
    const pl = linearPlan(weeks, kr.goalStart, kr.goalEnd)
    if (Object.keys(pl).length > 0) rebuiltPlan[kr.id] = pl
  }
  // Fallback to existing plan entries for KRs without goals
  for (const krId of Object.keys(base.planDraft || {})) {
    if (!rebuiltPlan[krId]) rebuiltPlan[krId] = { ...(base.planDraft[krId] || {}) }
  }

  // Lock baseline from the rebuilt plan by default
  const baseline: PlanBaseline = {
    id: 'bl-scenario',
    version: 1,
    lockedAt: new Date().toISOString(),
    lockedBy: 'scenario',
    data: JSON.parse(JSON.stringify(rebuiltPlan)),
  }

  // Prepare actuals per scenario
  const actuals: AppState['actuals'] = {}

  // Choose representative KRs (use seeded IDs when they exist)
  const KR = {
    menuCoverage: base.krs.find(k => k.id === 'kr-menu-coverage')?.id || base.krs[0]?.id,
    profitability: base.krs.find(k => k.id === 'kr-merchant-profitability')?.id || base.krs[1]?.id,
    schedule: base.krs.find(k => k.id === 'kr-schedule-adherence')?.id || base.krs[2]?.id,
    upsell: base.krs.find(k => k.id === 'kr-upsell-conversion')?.id || base.krs[3]?.id,
  }

  const planFor = (krId?: ID) => (krId ? (rebuiltPlan[krId] || {}) : {})

  switch (key) {
    case 'behind_6w_no_recent_trend': {
      // Profitability: below plan, slight decline in last 3 weeks
      if (KR.profitability) {
        actuals[KR.profitability] = scalePlan(planFor(KR.profitability), weekKeys, [0.96, 0.95, 0.94, 0.94, 0.93, 0.93])
      }
      // Menu coverage: solid green trend
      if (KR.menuCoverage) {
        actuals[KR.menuCoverage] = scalePlan(planFor(KR.menuCoverage), weekKeys, [0.99, 1.00, 1.02, 1.03, 1.05, 1.07])
      }
      // Schedule adherence: near plan, slightly improving
      if (KR.schedule) {
        actuals[KR.schedule] = scalePlan(planFor(KR.schedule), weekKeys, [0.95, 0.96, 0.97, 0.98, 0.985, 0.99])
      }
      // Upsell: snapshot type; modest fluctuation around plan
      if (KR.upsell) {
        actuals[KR.upsell] = scalePlan(planFor(KR.upsell), weekKeys, [0.97, 0.99, 1.00, 0.99, 1.01, 0.98])
      }
      return {
        ...base,
        planDraft: rebuiltPlan,
        baselines: [baseline],
        currentBaselineId: baseline.id,
        actuals,
        phase: 'execution',
        reportingDateISO: weeks[5]?.startISO || base.reportingDateISO,
      }
    }
    case 'green_ahead_trending_up': {
      if (KR.menuCoverage) actuals[KR.menuCoverage] = scalePlan(planFor(KR.menuCoverage), weekKeys, [1.00, 1.02, 1.03, 1.05, 1.06, 1.08])
      if (KR.profitability) actuals[KR.profitability] = scalePlan(planFor(KR.profitability), weekKeys, [1.00, 1.01, 1.03, 1.04, 1.05, 1.06])
      if (KR.schedule) actuals[KR.schedule] = scalePlan(planFor(KR.schedule), weekKeys, [0.99, 1.00, 1.01, 1.02, 1.03, 1.04])
      return {
        ...base,
        planDraft: rebuiltPlan,
        baselines: [baseline],
        currentBaselineId: baseline.id,
        actuals,
        phase: 'execution',
        reportingDateISO: weeks[5]?.startISO || base.reportingDateISO,
      }
    }
    case 'yellow_catching_up': {
      if (KR.schedule) actuals[KR.schedule] = scalePlan(planFor(KR.schedule), weekKeys, [0.95, 0.96, 0.97, 0.98, 0.99, 0.995])
      if (KR.profitability) actuals[KR.profitability] = scalePlan(planFor(KR.profitability), weekKeys, [0.95, 0.96, 0.965, 0.975, 0.985, 0.995])
      if (KR.menuCoverage) actuals[KR.menuCoverage] = scalePlan(planFor(KR.menuCoverage), weekKeys, [0.98, 0.985, 0.99, 0.995, 1.00, 1.01])
      return {
        ...base,
        planDraft: rebuiltPlan,
        baselines: [baseline],
        currentBaselineId: baseline.id,
        actuals,
        phase: 'execution',
        reportingDateISO: weeks[5]?.startISO || base.reportingDateISO,
      }
    }
    case 'no_baseline_locked': {
      // Plan exists but no baseline; actuals empty; phase planning
      return {
        ...base,
        planDraft: rebuiltPlan,
        baselines: [],
        currentBaselineId: undefined,
        actuals: {},
        phase: 'planning',
        reportingDateISO: weeks[0]?.startISO || base.reportingDateISO,
      }
    }
    case 'sparse_actuals': {
      const sparse = (krId?: ID, f: number[] = []) => {
        if (!krId) return
        const p = planFor(krId)
        const wk: string[] = []
        for (let i = 0; i < weekKeys.length && wk.length < f.length; i += 2) wk.push(weekKeys[i]) // every other week
        const vals = scalePlan(p, wk, f)
        actuals[krId] = { ...vals }
      }
      sparse(KR.menuCoverage, [1.0, 1.02, 1.04])
      sparse(KR.schedule, [0.97, 0.99, 1.0])
      sparse(KR.profitability, [0.95, 0.96, 0.98])
      return {
        ...base,
        planDraft: rebuiltPlan,
        baselines: [baseline],
        currentBaselineId: baseline.id,
        actuals,
        phase: 'execution',
        reportingDateISO: weeks[5]?.startISO || base.reportingDateISO,
      }
    }
    default:
      return base
  }
}

