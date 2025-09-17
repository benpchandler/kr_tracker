import React from 'react'
import { STORAGE_KEY, LEGACY_STORAGE_KEYS } from '../config'
import { AppState, Objective, KeyResult, ID, PlanBaseline, Team, Initiative, Pod, Individual, Organization, ViewFilter, PlanDraft, Phase, Theme, InitiativeWeekly, InitiativeWeeklyMeta, FunctionalArea, PersonLevel, WaterfallState, WaterfallConfig, WaterfallScenarioKey, WaterfallAnnotation } from '../models/types'
import { generateWeeks, toISODate, parseISO } from '../utils/weeks'

// Seed data for Merchant organization, teams, pods, leaders, and sample KRs
const ORG: Organization | undefined = { id: 'org-merchant', name: 'Merchant' }

const DEFAULT_PERIOD = { startISO: '2025-07-01', endISO: '2025-09-30' }
const SEED_WEEKS = generateWeeks(DEFAULT_PERIOD.startISO, DEFAULT_PERIOD.endISO)

const TEAMS: Team[] = [
  { id: 'team-live-order-experience', name: 'Live Order Experience', color: '#2E86AB' },
  { id: 'team-go-to-market', name: 'Go-To-Market', color: '#8E44AD' },
  { id: 'team-support', name: 'Support', color: '#27AE60' },
]

const PODS: Pod[] = [
  { id: 'pod-dasher-handoff', teamId: 'team-live-order-experience', name: 'Dasher Handoff Pod', memberIds: ['ind-jamie-li'] },
  { id: 'pod-cancellations', teamId: 'team-live-order-experience', name: 'Cancellations Pod', memberIds: ['ind-carlos-mendes'] },
  { id: 'pod-workforce-management', teamId: 'team-support', name: 'Workforce Management Pod', memberIds: ['ind-priya-patel'] },
  { id: 'pod-support-reduction', teamId: 'team-support', name: 'Support Reduction Pod', memberIds: ['ind-ethan-zhang'] },
  { id: 'pod-menu', teamId: 'team-go-to-market', name: 'Menu Pod', memberIds: ['ind-lena-kim'] },
  { id: 'pod-profitability', teamId: 'team-go-to-market', name: 'Profitability Pod', memberIds: ['ind-mark-rossi'] },
  { id: 'pod-new-bets', teamId: 'team-go-to-market', name: 'New Bets Pod', memberIds: ['ind-ava-nguyen'] },
]

const INDIVIDUALS: Individual[] = [
  // Team leaders
  { id: 'ind-ashley-tran', name: 'Ashley Tran', email: 'ashley.tran@example.com', teamId: 'team-live-order-experience', role: 'team_lead', discipline: 'product', function: FunctionalArea.Product, level: PersonLevel.Director },
  { id: 'ind-sonha-breidenbach', name: 'Sonha Breidenbach', email: 'sonha.breidenbach@example.com', teamId: 'team-go-to-market', role: 'team_lead', discipline: 'strategy', function: FunctionalArea.Strategy, level: PersonLevel.Director },
  { id: 'ind-shreya-thacker', name: 'Shreya Thacker', email: 'shreya.thacker@example.com', teamId: 'team-support', role: 'team_lead', discipline: 'operations', function: FunctionalArea.Operations, level: PersonLevel.Director },
  // Pod leads (also DRIs for seeded KRs)
  { id: 'ind-jamie-li', name: 'Jamie Li', teamId: 'team-live-order-experience', podId: 'pod-dasher-handoff', role: 'pod_lead', discipline: 'engineering', function: FunctionalArea.Engineering, level: PersonLevel.Senior },
  { id: 'ind-carlos-mendes', name: 'Carlos Mendes', teamId: 'team-live-order-experience', podId: 'pod-cancellations', role: 'pod_lead', discipline: 'engineering', function: FunctionalArea.Engineering, level: PersonLevel.Senior },
  { id: 'ind-priya-patel', name: 'Priya Patel', teamId: 'team-support', podId: 'pod-workforce-management', role: 'pod_lead', discipline: 'operations', function: FunctionalArea.Operations, level: PersonLevel.Manager },
  { id: 'ind-ethan-zhang', name: 'Ethan Zhang', teamId: 'team-support', podId: 'pod-support-reduction', role: 'pod_lead', discipline: 'analytics', function: FunctionalArea.Analytics, level: PersonLevel.Senior },
  { id: 'ind-lena-kim', name: 'Lena Kim', teamId: 'team-go-to-market', podId: 'pod-menu', role: 'pod_lead', discipline: 'design', function: FunctionalArea.Design, level: PersonLevel.Senior },
  { id: 'ind-mark-rossi', name: 'Mark Rossi', teamId: 'team-go-to-market', podId: 'pod-profitability', role: 'pod_lead', discipline: 'analytics', function: FunctionalArea.Analytics, level: PersonLevel.Manager },
  { id: 'ind-ava-nguyen', name: 'Ava Nguyen', teamId: 'team-go-to-market', podId: 'pod-new-bets', role: 'pod_lead', discipline: 'product', function: FunctionalArea.Product, level: PersonLevel.Senior },
]

// Objectives per team
const OBJECTIVES: Objective[] = [
  { id: 'obj-loe', name: 'Deliver reliable live order flows', teamIds: ['team-live-order-experience'] },
  { id: 'obj-gtm', name: 'Grow merchant performance and adoption', teamIds: ['team-go-to-market'] },
  { id: 'obj-support', name: 'Elevate support efficiency & quality', teamIds: ['team-support'] },
]

const KRS: KeyResult[] = [
  // Live Order Experience
  { id: 'kr-handoff-failure-rate', name: 'Reduce handoff failure rate', unit: 'percent', aggregation: 'snapshot', teamId: 'team-live-order-experience', podId: 'pod-dasher-handoff', driId: 'ind-jamie-li', objectiveId: 'obj-loe', goalStart: 3.5, goalEnd: 2.0 },
  { id: 'kr-customer-cancellations', name: 'Reduce customer-initiated cancellations', unit: 'count', aggregation: 'average', teamId: 'team-live-order-experience', podId: 'pod-cancellations', driId: 'ind-carlos-mendes', objectiveId: 'obj-loe', goalStart: 320, goalEnd: 200 },
  // Support
  { id: 'kr-schedule-adherence', name: 'Improve schedule adherence', unit: 'percent', aggregation: 'average', teamId: 'team-support', podId: 'pod-workforce-management', driId: 'ind-priya-patel', objectiveId: 'obj-support', goalStart: 87, goalEnd: 93 },
  { id: 'kr-contacts-per-order', name: 'Reduce contacts per order', unit: 'count', aggregation: 'average', teamId: 'team-support', podId: 'pod-support-reduction', driId: 'ind-ethan-zhang', objectiveId: 'obj-support', goalStart: 0.065, goalEnd: 0.045 },
  // Go-To-Market
  { id: 'kr-menu-coverage', name: 'Increase menu completeness coverage', unit: 'percent', aggregation: 'average', teamId: 'team-go-to-market', podId: 'pod-menu', driId: 'ind-lena-kim', objectiveId: 'obj-gtm', goalStart: 78, goalEnd: 92 },
  { id: 'kr-merchant-profitability', name: 'Improve merchant profitability', unit: 'percent', aggregation: 'average', teamId: 'team-go-to-market', podId: 'pod-profitability', driId: 'ind-mark-rossi', objectiveId: 'obj-gtm', goalStart: 14, goalEnd: 18 },
  { id: 'kr-upsell-conversion', name: 'Increase upsell conversion', unit: 'percent', aggregation: 'snapshot', teamId: 'team-go-to-market', podId: 'pod-new-bets', driId: 'ind-ava-nguyen', objectiveId: 'obj-gtm', goalStart: 2.8, goalEnd: 4.0 },
]

// Helpers to create linear weekly plans (start → end across weeks)
function linearPlan(weeks: typeof SEED_WEEKS, start: number, end: number): Record<string, number> {
  const out: Record<string, number> = {}
  if (weeks.length === 0) return out
  const n = weeks.length - 1
  weeks.forEach((w, i) => {
    const t = n === 0 ? 1 : i / n
    out[w.iso] = start + (end - start) * t
  })
  return out
}

// Pre-seeded plan per KR
const PLAN_DRAFT: PlanDraft = {
  // LOE
  'kr-handoff-failure-rate': linearPlan(SEED_WEEKS, 3.5, 2.0),
  'kr-customer-cancellations': linearPlan(SEED_WEEKS, 320, 200),
  // Support
  'kr-schedule-adherence': linearPlan(SEED_WEEKS, 87, 93),
  'kr-contacts-per-order': linearPlan(SEED_WEEKS, 0.065, 0.045),
  // GTM
  'kr-menu-coverage': linearPlan(SEED_WEEKS, 78, 92),
  'kr-merchant-profitability': linearPlan(SEED_WEEKS, 14, 18),
  'kr-upsell-conversion': linearPlan(SEED_WEEKS, 2.8, 4.0),
}

// Seed initiatives (mix of real and placeholders)
const INITIATIVES: Initiative[] = [
  // LOE — Handoff failure rate (totalTarget ~ -1.5; coverage calc only triggers for positive targets)
  { id: 'i-loe-handoff-retries', krId: 'kr-handoff-failure-rate', name: 'Optimize retries & backoff', impact: -0.6, confidence: 0.8, isPlaceholder: false },
  { id: 'i-loe-handoff-timeouts', krId: 'kr-handoff-failure-rate', name: 'Reduce handoff timeouts', impact: -0.5, confidence: 0.7, isPlaceholder: false },
  { id: 'i-loe-handoff-placeholder', krId: 'kr-handoff-failure-rate', name: 'Driver-side SDK uplift (placeholder)', impact: -0.4, confidence: 0.5, isPlaceholder: true },

  // LOE — Customer cancellations (320 → 200 => target -120)
  { id: 'i-loe-cx-eta', krId: 'kr-customer-cancellations', name: 'Improve ETA accuracy', impact: -40, confidence: 0.85, isPlaceholder: false },
  { id: 'i-loe-cx-subst', krId: 'kr-customer-cancellations', name: 'Substitution UX improvements', impact: -35, confidence: 0.75, isPlaceholder: false },
  { id: 'i-loe-cx-placeholder', krId: 'kr-customer-cancellations', name: 'Menu clarity sweep (placeholder)', impact: -30, confidence: 0.5, isPlaceholder: true },

  // Support — Schedule adherence (87 → 93 => +6)
  { id: 'i-sup-rtm', krId: 'kr-schedule-adherence', name: 'Real-time monitoring rollout', impact: 2.5, confidence: 0.8, isPlaceholder: false },
  { id: 'i-sup-shifts', krId: 'kr-schedule-adherence', name: 'Shift bidding calibration', impact: 1.8, confidence: 0.7, isPlaceholder: false },
  { id: 'i-sup-coaching', krId: 'kr-schedule-adherence', name: 'Agent coaching (placeholder)', impact: 1.5, confidence: 0.5, isPlaceholder: true },

  // Support — Contacts per order (0.065 → 0.045 => -0.02)
  { id: 'i-sup-selfserve', krId: 'kr-contacts-per-order', name: 'Self-serve flows for top intents', impact: -0.010, confidence: 0.8, isPlaceholder: false },
  { id: 'i-sup-deflect', krId: 'kr-contacts-per-order', name: 'Deflection at order status', impact: -0.006, confidence: 0.7, isPlaceholder: false },
  { id: 'i-sup-placeholder', krId: 'kr-contacts-per-order', name: 'Proactive notifications (placeholder)', impact: -0.004, confidence: 0.5, isPlaceholder: true },

  // GTM — Menu coverage (78 → 92 => +14)
  { id: 'i-gtm-menu-ai', krId: 'kr-menu-coverage', name: 'AI extraction for PDFs', impact: 6, confidence: 0.75, isPlaceholder: false },
  { id: 'i-gtm-menu-ops', krId: 'kr-menu-coverage', name: 'Ops sprint for top 500 chains', impact: 5, confidence: 0.8, isPlaceholder: false },
  { id: 'i-gtm-menu-placeholder', krId: 'kr-menu-coverage', name: 'Partner upload incentives (placeholder)', impact: 3, confidence: 0.5, isPlaceholder: true },

  // GTM — Profitability (14 → 18 => +4)
  { id: 'i-gtm-pricing', krId: 'kr-merchant-profitability', name: 'Dynamic pricing experiments', impact: 1.5, confidence: 0.7, isPlaceholder: false },
  { id: 'i-gtm-cost', krId: 'kr-merchant-profitability', name: 'Delivery cost optimization', impact: 1.2, confidence: 0.75, isPlaceholder: false },
  { id: 'i-gtm-prof-placeholder', krId: 'kr-merchant-profitability', name: 'Packaging guidelines (placeholder)', impact: 1.0, confidence: 0.5, isPlaceholder: true },

  // GTM — Upsell conversion (2.8 → 4.0 => +1.2)
  { id: 'i-gtm-upsell-ml', krId: 'kr-upsell-conversion', name: 'ML-driven recommendations', impact: 0.6, confidence: 0.75, isPlaceholder: false },
  { id: 'i-gtm-upsell-ux', krId: 'kr-upsell-conversion', name: 'Cart UX refinement', impact: 0.4, confidence: 0.7, isPlaceholder: false },
  { id: 'i-gtm-upsell-placeholder', krId: 'kr-upsell-conversion', name: 'A/B add-on bundles (placeholder)', impact: 0.2, confidence: 0.5, isPlaceholder: true },
]

// Seed example actuals for first 6 weeks (proportional to plan to craft R/Y/G)
const A_W = SEED_WEEKS.slice(0, 6)
function scalePlan(krId: ID, factors: number[]): Record<string, number> {
  const out: Record<string, number> = {}
  A_W.forEach((w, i) => {
    const p = PLAN_DRAFT[krId]?.[w.iso]
    if (p !== undefined && factors[i] !== undefined) out[w.iso] = Number((p * factors[i]).toFixed(3))
  })
  return out
}
const ACTUALS: PlanDraft = {
  // Green example (>=100% pace): Menu coverage trending above plan
  'kr-menu-coverage': scalePlan('kr-menu-coverage', [0.98, 1.00, 1.02, 1.03, 1.04, 1.06]),
  'kr-upsell-conversion': scalePlan('kr-upsell-conversion', [0.95, 0.98, 1.00, 1.02, 1.05, 1.08]),

  // Yellow example (~95–99% with positive trend): Schedule adherence
  'kr-schedule-adherence': scalePlan('kr-schedule-adherence', [0.93, 0.95, 0.96, 0.97, 0.98, 0.98]),

  // Red example (<95% with negative trend): Profitability dips at the end
  'kr-merchant-profitability': scalePlan('kr-merchant-profitability', [0.94, 0.95, 0.94, 0.93, 0.92, 0.90]),

  // Other KRs (still realistic values; may not map to health due to directionality)
  'kr-handoff-failure-rate': scalePlan('kr-handoff-failure-rate', [1.05, 1.00, 0.95, 0.93, 0.90, 0.88]),
  'kr-customer-cancellations': scalePlan('kr-customer-cancellations', [1.03, 0.99, 0.98, 0.95, 0.92, 0.90]),
  'kr-contacts-per-order': scalePlan('kr-contacts-per-order', [0.99, 0.96, 0.94, 0.90, 0.87, 0.83]),
}

const DEFAULT_WATERFALL_STATE: WaterfallState = {
  configs: {},
  scenarioSelections: {},
}

// Pre-locked baseline from plan
const INITIAL_BASELINE: PlanBaseline = {
  id: 'bl-seed',
  version: 1,
  lockedAt: new Date().toISOString(),
  lockedBy: 'seed',
  data: PLAN_DRAFT,
}

// Choose a default reporting date within the period (current week Monday if inside, otherwise first week)
const TODAY = new Date()
const TODAY_ISO = toISODate(TODAY)

// Get the Monday of the current week
const getCurrentWeekMonday = () => {
  const date = new Date(TODAY)
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day // Adjust to Monday
  date.setUTCDate(date.getUTCDate() + diff)
  return toISODate(date)
}

const CURRENT_WEEK_MONDAY = getCurrentWeekMonday()
const inPeriod = (() => {
  const t = parseISO(CURRENT_WEEK_MONDAY).getTime()
  const s = parseISO(DEFAULT_PERIOD.startISO).getTime()
  const e = parseISO(DEFAULT_PERIOD.endISO).getTime()
  return t >= s && t <= e
})()
const DEFAULT_REPORTING = inPeriod ? CURRENT_WEEK_MONDAY : (SEED_WEEKS[0]?.startISO || DEFAULT_PERIOD.startISO)

const DEFAULT_STATE: AppState = {
  organization: ORG,
  objectives: OBJECTIVES,
  krs: KRS,
  teams: TEAMS,
  pods: PODS,
  podMemberships: [],  // Initialize empty, will be populated via UI
  individuals: INDIVIDUALS,
  people: [],  // Initialize empty, will migrate from individuals
  // Default period near current quarter for immediate usability
  period: DEFAULT_PERIOD,
  planDraft: PLAN_DRAFT,
  actuals: ACTUALS,
  baselines: [INITIAL_BASELINE],
  currentBaselineId: INITIAL_BASELINE.id,
  initiatives: INITIATIVES,
  currentView: { level: 'organization', targetId: ORG?.id },
  phase: 'execution',
  reportingDateISO: DEFAULT_REPORTING,
  theme: 'light',
  waterfall: { ...DEFAULT_WATERFALL_STATE },
}


async function post(url: string, body: any, method: 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST') {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'DELETE' ? undefined : JSON.stringify(body),
    })
    return await res.json().catch(() => ({}))
  } catch (e) {
    // ignore offline errors for now
    return null
  }
}

function parseGoalsFromName(name: string): { start?: number; end?: number } | null {
  if (!name) return null
  // Normalize arrows and allow commas in thousands
  const normalized = name.replace(/→/g, '->').replace(/to/gi, '->')
  const re = /(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d*(?:\.\d+))\s*(?:->)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d*(?:\.\d+))/
  const m = normalized.match(re)
  if (!m) return null
  const clean = (s: string) => s.replace(/,/g, '')
  const start = m[1] ? Number(clean(m[1])) : undefined
  const end = m[2] ? Number(clean(m[2])) : undefined
  if (start === undefined && end === undefined) return null
  return { start, end }
}

function stripGoalsFromName(name: string): string {
  if (!name) return name
  // Remove trailing ": ... -> ... (optional ...)" if present
  const hasArrow = /→|->|\sto\s/i.test(name)
  if (!hasArrow) return name
  const idx = name.indexOf(':')
  if (idx === -1) return name
  return name.slice(0, idx).trim()
}

export function coalesceState(parsed: any): AppState {
  // Merge with defaults and ensure core collections exist.
  const merged: AppState = { ...DEFAULT_STATE, ...(parsed || {}) }
  // Ensure new fields exist
  if (!Array.isArray(merged.podMemberships)) merged.podMemberships = []
  if (!Array.isArray(merged.people)) merged.people = []
  // If critical seed lists are empty, reapply seeds (common after schema changes)
  if (!Array.isArray(merged.teams) || merged.teams.length === 0) merged.teams = TEAMS
  if (!Array.isArray(merged.pods) || merged.pods.length === 0) merged.pods = PODS
  if (!Array.isArray(merged.individuals) || merged.individuals.length === 0) merged.individuals = INDIVIDUALS
  if (!Array.isArray(merged.krs) || merged.krs.length === 0) merged.krs = KRS
  if (!Array.isArray(merged.objectives) || merged.objectives.length === 0) merged.objectives = OBJECTIVES
  if (!merged.period?.startISO || !merged.period?.endISO) merged.period = DEFAULT_PERIOD
  if (!merged.reportingDateISO) merged.reportingDateISO = DEFAULT_REPORTING
  if (!merged.theme) merged.theme = 'light'
  if (!merged.waterfall) {
    merged.waterfall = { configs: {}, scenarioSelections: {} }
  } else {
    merged.waterfall = {
      configs: merged.waterfall.configs || {},
      scenarioSelections: merged.waterfall.scenarioSelections || {},
    }
  }
  // Ensure phase is properly typed
  if (merged.phase && typeof merged.phase === 'string') {
    merged.phase = (merged.phase === 'execution' ? 'execution' : 'planning') as Phase
  }

  // Backfill KR goalStart/goalEnd from name if missing
  merged.krs = (merged.krs || []).map(kr => {
    if (kr.goalStart === undefined && kr.goalEnd === undefined && typeof kr.name === 'string') {
      const parsed = parseGoalsFromName(kr.name)
      if (parsed && (parsed.start !== undefined || parsed.end !== undefined)) {
        return { ...kr, goalStart: parsed.start, goalEnd: parsed.end, name: stripGoalsFromName(kr.name) }
      }
    }
    // If goals already present but name still contains arrow detail, strip it
    if ((kr.goalStart !== undefined || kr.goalEnd !== undefined) && /→|->|\sto\s/i.test(kr.name)) {
      return { ...kr, name: stripGoalsFromName(kr.name) }
    }
    return kr
  })
  return merged
}

export function loadState(): AppState {
  try {
    // Try new key first
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return coalesceState(JSON.parse(raw))

    // Fallback to any legacy keys once (one-time migration)
    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = localStorage.getItem(key)
      if (legacy) {
        const migrated = coalesceState(JSON.parse(legacy))
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)) } catch {}
        return migrated
      }
    }

    // Fresh default
    return DEFAULT_STATE
  } catch {
    return DEFAULT_STATE
  }
}

export function saveState(state: AppState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}

async function syncToServer(action: Action, state: AppState) {
  switch (action.type) {
    case 'SET_PERIOD':
      await post('/api/period', { startISO: state.period.startISO, endISO: state.period.endISO });
      break
    case 'ADD_TEAM':
      await post('/api/team', action.team)
      break
    case 'ADD_OBJECTIVE':
      await post('/api/objective', action.obj)
      break
    case 'SET_OBJECTIVE_TEAMS':
      await post('/api/objective/teams', { objectiveId: action.objectiveId, teamIds: action.teamIds })
      break
    case 'ADD_KR':
      await post('/api/kr', action.kr)
      break
    case 'UPDATE_PLAN_DRAFT':
      await post('/api/plan', { krId: action.krId, weekKey: action.weekKey, value: action.value, by: (()=>{ try { return localStorage.getItem('kr-user-name') || 'user' } catch { return 'user' } })() })
      break
    case 'UPDATE_ACTUALS':
      await post('/api/actual', { krId: action.krId, weekKey: action.weekKey, value: action.value, by: (()=>{ try { return localStorage.getItem('kr-user-name') || 'user' } catch { return 'user' } })() })
      break
    case 'PASTE_ACTUALS':
      await post('/api/actual/paste', { updates: action.updates, by: (()=>{ try { return localStorage.getItem('kr-user-name') || 'user' } catch { return 'user' } })() })
      break
    case 'LOCK_PLAN': {
      await post('/api/lock-plan', { lockedBy: action.lockedBy, data: state.planDraft })
      break
    }
    case 'ADD_INITIATIVE':
      await post('/api/initiative', action.initiative)
      break
    case 'UPDATE_INITIATIVE':
      await post('/api/initiative', action.initiative, 'PUT')
      break
    case 'UPDATE_INITIATIVE_WEEKLY': {
      await post('/api/initiative/weekly', { initiativeId: action.initiativeId, weekKey: action.weekKey, patch: action.patch, by: (()=>{ try { return localStorage.getItem('kr-user-name') || 'user' } catch { return 'user' } })() })
      break
    }
    case 'DELETE_INITIATIVE':
      await post(`/api/initiative/${action.initiativeId}`, undefined, 'DELETE')
      break
    case 'SET_PHASE':
      await post('/api/settings/phase', { phase: state.phase })
      break
    case 'SET_REPORTING_DATE':
      await post('/api/settings/reporting-date', { dateISO: state.reportingDateISO })
      break
    case 'SET_THEME':
      await post('/api/settings/theme', { theme: state.theme })
      break
  }
}

type Action =
  | { type: 'SET_PERIOD'; startISO: string; endISO: string }
  | { type: 'SET_ORGANIZATION'; org: Organization }
  | { type: 'SET_PHASE'; phase: Phase }
  | { type: 'ADD_OBJECTIVE'; obj: Objective }
  | { type: 'SET_OBJECTIVE_TEAMS'; objectiveId: ID; teamIds: ID[] }
  | { type: 'ADD_KR'; kr: KeyResult }
  | { type: 'UPDATE_KR'; kr: KeyResult }
  | { type: 'ADD_TEAM'; team: Team }
  | { type: 'ADD_POD'; pod: Pod }
  | { type: 'UPDATE_POD'; pod: Pod }
  | { type: 'DELETE_POD'; podId: ID }
  | { type: 'ADD_INDIVIDUAL'; individual: Individual }
  | { type: 'UPDATE_INDIVIDUAL'; individual: Individual }
  | { type: 'DELETE_INDIVIDUAL'; individualId: ID }
  | { type: 'SET_VIEW_FILTER'; filter: ViewFilter | undefined }
  | { type: 'SET_REPORTING_DATE'; dateISO: string }
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'UPDATE_PLAN_DRAFT'; krId: ID; weekKey: string; value: number }
  | { type: 'UPDATE_ACTUALS'; krId: ID; weekKey: string; value: number }
  | { type: 'PASTE_ACTUALS'; updates: { krId: ID; weekKey: string; value: number }[] }
  | { type: 'LOCK_PLAN'; lockedBy: string }
  | { type: 'FOCUS_KR'; krId?: ID }
  | { type: 'ADD_INITIATIVE'; initiative: Initiative }
  | { type: 'UPDATE_INITIATIVE'; initiative: Initiative }
  | { type: 'DELETE_INITIATIVE'; initiativeId: ID }
  | { type: 'UPDATE_INITIATIVE_WEEKLY'; initiativeId: ID; weekKey: string; patch: { impact?: number; confidence?: number } }
  | { type: 'UPSERT_WATERFALL_CONFIG'; config: WaterfallConfig }
  | { type: 'SET_WATERFALL_SCENARIO'; krId: ID; scenario: WaterfallScenarioKey }
  | { type: 'SET_WATERFALL_ANNOTATIONS'; krId: ID; annotations: WaterfallAnnotation[] }
  | { type: 'HYDRATE'; full: Partial<AppState> }
  | { type: 'IMPORT_STATE'; state: AppState }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE': {
      const next = coalesceState(action.full)
      saveState(next)
      return next
    }
    case 'IMPORT_STATE': {
      const next = coalesceState(action.state)
      saveState(next)
      return next
    }
    case 'SET_PERIOD': {
      const next = { ...state, period: { startISO: action.startISO, endISO: action.endISO } }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'ADD_OBJECTIVE': {
      const next = { ...state, objectives: [...state.objectives, action.obj] }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'SET_OBJECTIVE_TEAMS': {
      const objectives = state.objectives.map(o => o.id === action.objectiveId ? { ...o, teamIds: [...action.teamIds] } : o)
      const next = { ...state, objectives }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'ADD_KR': {
      const next = { ...state, krs: [...state.krs, action.kr] }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'ADD_TEAM': {
      const next = { ...state, teams: [...state.teams, action.team] }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'UPDATE_PLAN_DRAFT': {
      const { krId, weekKey, value } = action
      const perKr = state.planDraft[krId] || {}
      const nextPerKr = { ...perKr, [weekKey]: value }
      const by = (() => { try { return localStorage.getItem('kr-user-name') || 'user' } catch { return 'user' } })()
      const planMeta: any = { ...(state as any).planMeta }
      const mPer = { ...(planMeta[krId] || {}) }
      mPer[weekKey] = { at: new Date().toISOString(), by }
      planMeta[krId] = mPer
      const next = { ...state, planDraft: { ...state.planDraft, [krId]: nextPerKr }, planMeta }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'UPDATE_ACTUALS': {
      const { krId, weekKey, value } = action
      const perKr = state.actuals[krId] || {}
      const nextPerKr = { ...perKr, [weekKey]: value }
      const by = (() => { try { return localStorage.getItem('kr-user-name') || 'user' } catch { return 'user' } })()
      const actualMeta: any = { ...(state as any).actualMeta }
      const mPer = { ...(actualMeta[krId] || {}) }
      mPer[weekKey] = { at: new Date().toISOString(), by }
      actualMeta[krId] = mPer
      const next = { ...state, actuals: { ...state.actuals, [krId]: nextPerKr }, actualMeta }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'PASTE_ACTUALS': {
      const nextActuals = { ...state.actuals }
      for (const u of action.updates) {
        const existing = nextActuals[u.krId] || {}
        const perKr = { ...existing }
        perKr[u.weekKey] = u.value
        nextActuals[u.krId] = perKr
      }
      const next = { ...state, actuals: nextActuals }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'LOCK_PLAN': {
      const version = (state.baselines[state.baselines.length - 1]?.version || 0) + 1
      const baseline: PlanBaseline = {
        id: `bl-${Date.now()}`,
        version,
        lockedAt: new Date().toISOString(),
        lockedBy: action.lockedBy || 'user',
        data: JSON.parse(JSON.stringify(state.planDraft)),
      }
      const next = {
        ...state,
        baselines: [...state.baselines, baseline],
        currentBaselineId: baseline.id,
        phase: 'execution' as Phase,
      }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'SET_PHASE': {
      const next = { ...state, phase: action.phase }
      saveState(next)
      return next
    }
    case 'ADD_INITIATIVE': {
      const init: Initiative = { status: 'on_track' as const, ...action.initiative }
      const next = { ...state, initiatives: [...state.initiatives, init] }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'UPDATE_INITIATIVE': {
      const initiatives = state.initiatives.map(i => i.id === action.initiative.id ? action.initiative : i)
      const next = { ...state, initiatives }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'UPDATE_INITIATIVE_WEEKLY': {
      const iw: InitiativeWeekly = { ...(state.initiativeWeekly || {}) }
      const per = { ...(iw[action.initiativeId] || {}) }
      const curr = { ...(per[action.weekKey] || {}) }
      const merged = { ...curr, ...action.patch }
      per[action.weekKey] = merged
      iw[action.initiativeId] = per
      const meta: InitiativeWeeklyMeta = { ...(state.initiativeWeeklyMeta || {}) }
      const mPer = { ...(meta[action.initiativeId] || {}) }
      mPer[action.weekKey] = { at: new Date().toISOString(), by: (()=>{ try { return localStorage.getItem('kr-user-name') || 'user' } catch { return 'user' } })() }
      meta[action.initiativeId] = mPer
      const next = { ...state, initiativeWeekly: iw, initiativeWeeklyMeta: meta }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'DELETE_INITIATIVE': {
        const initiatives = state.initiatives.filter(i => i.id !== action.initiativeId)
        const next = { ...state, initiatives }
        saveState(next)
        void syncToServer(action, next)
        return next
    }
    case 'UPSERT_WATERFALL_CONFIG': {
      const wf = state.waterfall || { configs: {}, scenarioSelections: {} }
      const configs = { ...wf.configs, [action.config.krId]: action.config }
      const scenarioSelections = {
        ...wf.scenarioSelections,
        [action.config.krId]: wf.scenarioSelections[action.config.krId] ?? action.config.defaultScenario,
      }
      const next = { ...state, waterfall: { configs, scenarioSelections } }
      saveState(next)
      return next
    }
    case 'SET_WATERFALL_SCENARIO': {
      const wf = state.waterfall || { configs: {}, scenarioSelections: {} }
      const scenarioSelections = { ...wf.scenarioSelections, [action.krId]: action.scenario }
      const next = { ...state, waterfall: { configs: { ...wf.configs }, scenarioSelections } }
      saveState(next)
      return next
    }
    case 'SET_WATERFALL_ANNOTATIONS': {
      const wf = state.waterfall || { configs: {}, scenarioSelections: {} }
      const existing = wf.configs[action.krId]
      if (!existing) return state
      const nextConfig: WaterfallConfig = { ...existing, annotations: [...action.annotations] }
      const configs = { ...wf.configs, [action.krId]: nextConfig }
      const next = { ...state, waterfall: { configs, scenarioSelections: { ...wf.scenarioSelections } } }
      saveState(next)
      return next
    }
    case 'SET_ORGANIZATION': {
      const next = { ...state, organization: action.org }
      saveState(next)
      return next
    }
    case 'UPDATE_KR': {
      const krs = state.krs.map(kr => kr.id === action.kr.id ? action.kr : kr)
      const next = { ...state, krs }
      saveState(next)
      return next
    }
    case 'ADD_POD': {
      const next = { ...state, pods: [...state.pods, action.pod] }
      saveState(next)
      return next
    }
    case 'UPDATE_POD': {
      const pods = state.pods.map(p => p.id === action.pod.id ? action.pod : p)
      const next = { ...state, pods }
      saveState(next)
      return next
    }
    case 'DELETE_POD': {
      const pods = state.pods.filter(p => p.id !== action.podId)
      const next = { ...state, pods }
      saveState(next)
      return next
    }
    case 'ADD_INDIVIDUAL': {
      const next = { ...state, individuals: [...state.individuals, action.individual] }
      saveState(next)
      return next
    }
    case 'UPDATE_INDIVIDUAL': {
      const individuals = state.individuals.map(i => i.id === action.individual.id ? action.individual : i)
      const next = { ...state, individuals }
      saveState(next)
      return next
    }
    case 'DELETE_INDIVIDUAL': {
      const individuals = state.individuals.filter(i => i.id !== action.individualId)
      const next = { ...state, individuals }
      saveState(next)
      return next
    }
    case 'SET_VIEW_FILTER': {
      const next = { ...state, currentView: action.filter }
      saveState(next)
      return next
    }
    case 'SET_REPORTING_DATE': {
      const next = { ...state, reportingDateISO: action.dateISO }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'SET_THEME': {
      const next = { ...state, theme: action.theme }
      saveState(next)
      void syncToServer(action, next)
      return next
    }
    case 'FOCUS_KR': {
      const next = { ...state, focusKrId: action.krId }
      saveState(next)
      return next
    }
    default:
      return state
  }
}

type StoreCtx = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const Ctx = React.createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, undefined, loadState)

  // Hydrate from API on mount
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/state')
        if (res.ok) {
          const full = await res.json()
          dispatch({ type: 'HYDRATE', full })
        }
      } catch {}
    })()
  }, [])

  // Apply theme to body
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('theme-dark', (state.theme || 'light') === 'dark')
    }
  }, [state.theme])

  // Persist on unload as well
  React.useEffect(() => { saveState(state) }, [state])

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}

export function useStoreSelector<T>(selector: (s: AppState) => T): T {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error('StoreProvider missing')
  return selector(ctx.state)
}

export function useStore<T = AppState>(selector?: (s: AppState) => T): T {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error('StoreProvider missing')
  // @ts-expect-error generic convenience
  return selector ? selector(ctx.state) : ctx.state
}

export function useDispatch() {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error('StoreProvider missing')
  return ctx.dispatch
}
