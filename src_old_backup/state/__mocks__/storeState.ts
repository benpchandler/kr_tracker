import type { AppState, PlanBaseline } from '../../models/types'

export function buildDefaultState(overrides?: Partial<AppState>): AppState {
  const baseline: PlanBaseline = {
    id: 'bl-default',
    version: 1,
    lockedAt: '2025-01-01',
    lockedBy: 'seed',
    data: { 'kr-1': { '2025-W02': 10 } },
  }
  const base: AppState = {
    organization: undefined,
    objectives: [],
    krs: [{ id: 'kr-1', name: 'KR', aggregation: 'cumulative', unit: 'count' }],
    teams: [],
    pods: [],
    podMemberships: [],
    individuals: [],
    people: [],
    period: { startISO: '2025-01-06', endISO: '2025-03-31' },
    planDraft: { 'kr-1': { '2025-W02': 5 } },
    actuals: { 'kr-1': { '2025-W02': 3 } },
    baselines: [baseline],
    currentBaselineId: baseline.id,
    initiatives: [],
    initiativeWeekly: {},
    initiativeWeeklyMeta: {},
    phase: 'execution',
    reportingDateISO: '2025-01-06',
    theme: 'light',
  }
  return { ...base, ...(overrides || {}) }
}
