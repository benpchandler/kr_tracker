import React from 'react'
import { AppState, Objective, KeyResult, ID, PlanBaseline, Team, Initiative } from '../models/types'

const DEFAULT_STATE: AppState = {
  objectives: [],
  krs: [],
  teams: [],
  period: { startISO: '', endISO: '' },
  planDraft: {},
  actuals: {},
  baselines: [],
  currentBaselineId: undefined,
  initiatives: [],
}

const LS_KEY = 'kr-tracker-state-v1'

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_STATE, ...parsed }
  } catch {
    return DEFAULT_STATE
  }
}

function saveState(state: AppState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch {}
}

type Action =
  | { type: 'SET_PERIOD'; startISO: string; endISO: string }
  | { type: 'ADD_OBJECTIVE'; obj: Objective }
  | { type: 'SET_OBJECTIVE_TEAMS'; objectiveId: ID; teamIds: ID[] }
  | { type: 'ADD_KR'; kr: KeyResult }
  | { type: 'ADD_TEAM'; team: Team }
  | { type: 'UPDATE_PLAN_DRAFT'; krId: ID; weekKey: string; value: number }
  | { type: 'UPDATE_ACTUALS'; krId: ID; weekKey: string; value: number }
  | { type: 'PASTE_ACTUALS'; updates: { krId: ID; weekKey: string; value: number }[] }
  | { type: 'LOCK_PLAN'; lockedBy: string }
  | { type: 'ADD_INITIATIVE'; initiative: Initiative }
  | { type: 'UPDATE_INITIATIVE'; initiative: Initiative }
  | { type: 'DELETE_INITIATIVE'; initiativeId: ID }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PERIOD': {
      const next = { ...state, period: { startISO: action.startISO, endISO: action.endISO } }
      saveState(next)
      return next
    }
    case 'ADD_OBJECTIVE': {
      const next = { ...state, objectives: [...state.objectives, action.obj] }
      saveState(next)
      return next
    }
    case 'SET_OBJECTIVE_TEAMS': {
      const objectives = state.objectives.map(o => o.id === action.objectiveId ? { ...o, teamIds: [...action.teamIds] } : o)
      const next = { ...state, objectives }
      saveState(next)
      return next
    }
    case 'ADD_KR': {
      const next = { ...state, krs: [...state.krs, action.kr] }
      saveState(next)
      return next
    }
    case 'ADD_TEAM': {
      const next = { ...state, teams: [...state.teams, action.team] }
      saveState(next)
      return next
    }
    case 'UPDATE_PLAN_DRAFT': {
      const { krId, weekKey, value } = action
      const perKr = state.planDraft[krId] || {}
      const nextPerKr = { ...perKr, [weekKey]: value }
      const next = { ...state, planDraft: { ...state.planDraft, [krId]: nextPerKr } }
      saveState(next)
      return next
    }
    case 'UPDATE_ACTUALS': {
      const { krId, weekKey, value } = action
      const perKr = state.actuals[krId] || {}
      const nextPerKr = { ...perKr, [weekKey]: value }
      const next = { ...state, actuals: { ...state.actuals, [krId]: nextPerKr } }
      saveState(next)
      return next
    }
    case 'PASTE_ACTUALS': {
      const nextActuals = { ...state.actuals }
      for (const u of action.updates) {
        const perKr = nextActuals[u.krId] || {}
        perKr[u.weekKey] = u.value
        nextActuals[u.krId] = perKr
      }
      const next = { ...state, actuals: nextActuals }
      saveState(next)
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
      }
      saveState(next)
      return next
    }
    case 'ADD_INITIATIVE': {
      const next = { ...state, initiatives: [...state.initiatives, action.initiative] }
      saveState(next)
      return next
    }
    case 'UPDATE_INITIATIVE': {
      const initiatives = state.initiatives.map(i => i.id === action.initiative.id ? action.initiative : i)
      const next = { ...state, initiatives }
      saveState(next)
      return next
    }
    case 'DELETE_INITIATIVE': {
        const initiatives = state.initiatives.filter(i => i.id !== action.initiativeId)
        const next = { ...state, initiatives }
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
