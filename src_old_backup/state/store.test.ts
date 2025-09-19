import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import deepFreeze from 'deep-freeze-strict'
import { STORAGE_KEY, LEGACY_STORAGE_KEYS } from '../config'
import { reducer, loadState } from './store'
import type { AppState, PlanBaseline } from '../models/types'

function makeState(partial?: Partial<AppState>): AppState {
  const baseline: PlanBaseline = {
    id: 'bl-1',
    version: 1,
    lockedAt: '2025-01-01',
    lockedBy: 'seed',
    data: { 'kr-1': { '2025-W02': 10 } },
  }
  const state: AppState = {
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
  return { ...state, ...(partial || {}) }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('reducer core transitions', () => {
  it('LOCK_PLAN clones planDraft into a new baseline and switches phase', () => {
    const state = makeState()
    const frozen = deepFreeze(state)
    const next = reducer(frozen, { type: 'LOCK_PLAN', lockedBy: 'user' })
    expect(next.baselines).toHaveLength(2)
    const latest = next.baselines[1]
    expect(latest.data).not.toBe(state.planDraft)
    expect(latest.version).toBe(2)
    expect(next.currentBaselineId).toBe(latest.id)
    expect(next.phase).toBe('execution')
  })

  it('UPDATE_PLAN_DRAFT preserves immutability and writes meta', () => {
    const frozen = deepFreeze(makeState())
    const next = reducer(frozen, { type: 'UPDATE_PLAN_DRAFT', krId: 'kr-1', weekKey: '2025-W03', value: 12 })
    expect(next.planDraft['kr-1']['2025-W03']).toBe(12)
    expect(next.planDraft['kr-1']).not.toBe(frozen.planDraft['kr-1'])
    expect(next.planMeta?.['kr-1']['2025-W03'].at).toBeDefined()
  })

  it('UPDATE_ACTUALS writes value and meta, preserving immutability', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-10T00:00:00Z'))
    const frozen = deepFreeze(makeState({ actuals: {} }))
    const next = reducer(frozen, { type: 'UPDATE_ACTUALS', krId: 'kr-1', weekKey: '2025-W02', value: 42 })
    expect(next.actuals['kr-1']['2025-W02']).toBe(42)
    expect(next.actualMeta?.['kr-1']['2025-W02'].at).toBeDefined()
    expect(next.actualMeta?.['kr-1']['2025-W02'].by).toBe('user')
    expect(next.actuals['kr-1']).not.toBe(frozen.actuals['kr-1'])
  })

  it('PASTE_ACTUALS merges updates safely', () => {
    const frozen = deepFreeze(makeState({ actuals: { 'kr-1': { '2025-W02': 1 } } }))
    const next = reducer(frozen, {
      type: 'PASTE_ACTUALS',
      updates: [
        { krId: 'kr-1', weekKey: '2025-W02', value: 10 },
        { krId: 'kr-1', weekKey: '2025-W03', value: 20 },
      ],
    })
    expect(next.actuals['kr-1']).toEqual({ '2025-W02': 10, '2025-W03': 20 })
    expect(next.actuals['kr-1']).not.toBe(frozen.actuals['kr-1'])
  })

  it('UPDATE_INITIATIVE_WEEKLY merges patch and writes meta', () => {
    const frozen = deepFreeze(makeState({ initiativeWeekly: {}, initiativeWeeklyMeta: {} }))
    const next = reducer(frozen, {
      type: 'UPDATE_INITIATIVE_WEEKLY',
      initiativeId: 'init-1',
      weekKey: '2025-W02',
      patch: { impact: 1.5 },
    })
    expect(next.initiativeWeekly?.['init-1']['2025-W02'].impact).toBe(1.5)
    expect(next.initiativeWeeklyMeta?.['init-1']['2025-W02'].at).toBeDefined()
  })

  it('SET_THEME persists to localStorage', () => {
    const frozen = deepFreeze(makeState({ theme: 'light' }))
    const next = reducer(frozen, { type: 'SET_THEME', theme: 'dark' })
    expect(next.theme).toBe('dark')
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })
})

describe('storage migrations', () => {
  it('reads from primary key', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState()))
    const state = loadState()
    expect(state.currentBaselineId).toBe('bl-1')
  })

  it('falls back to legacy keys and rewrites to latest key', () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.setItem(LEGACY_STORAGE_KEYS[0], JSON.stringify(makeState()))
    const state = loadState()
    expect(state.currentBaselineId).toBe('bl-1')
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('reset flow removes legacy keys', () => {
    localStorage.setItem(STORAGE_KEY, 'x')
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.setItem(key, 'legacy')
    }
    for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      localStorage.removeItem(key)
    }
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    for (const key of LEGACY_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).toBeNull()
    }
  })
})
