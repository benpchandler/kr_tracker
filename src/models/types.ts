export type ID = string

export type Objective = {
  id: ID
  name: string
  teamIds?: ID[]
}

export type Aggregation = 'cumulative' | 'snapshot' | 'average'
export type Unit = 'count' | 'percent' | 'currency'

export type KeyResult = {
  id: ID
  objectiveId?: ID
  name: string
  unit: Unit
  aggregation: Aggregation
  teamId?: ID
}

export type WeekDef = {
  index: number
  startISO: string
  label: string
}

export type PlanDraft = Record<ID /* krId */, Record<string /* weekKey */, number>>

export type PlanBaseline = {
  id: ID
  version: number
  lockedAt: string // ISO
  lockedBy: string
  data: PlanDraft // frozen snapshot
}

export type Period = {
  startISO: string
  endISO: string
}

export type Initiative = {
  id: ID
  krId: ID
  name: string
  impact: number
  confidence: number // 0-1
  isPlaceholder: boolean
}

export type AppState = {
  objectives: Objective[]
  krs: KeyResult[]
  teams: Team[]
  period: Period
  planDraft: PlanDraft
  actuals: PlanDraft
  baselines: PlanBaseline[]
  currentBaselineId?: ID
  initiatives: Initiative[]
}

export type KrWeekMetrics = {
  krId: ID
  isoWeek: string
  index: number
  actual?: number
  plan?: number
  deltaWoW?: number
  deltaWoWPct?: number
  rolling3?: number
  varianceWeekly?: number
  cumulativeActual?: number
  cumulativePlan?: number
  paceToDatePct?: number
  forecastEOP?: number
  health?: 'green' | 'yellow' | 'red'
}

export type KrMetricsSummary = {
  krId: ID
  latestWeek?: string
  latestPacePct?: number
  latestVariance?: number
  health?: 'green' | 'yellow' | 'red'
  series: {
    weeks: string[]
    actual: (number | undefined)[]
    plan: (number | undefined)[]
  }
}

export type Team = {
  id: ID
  name: string
  color?: string
}
