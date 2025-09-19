import React from 'react'
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import { PlanGrid } from './PlanGrid'
import { renderWithProviders } from '../test-utils/render'
import type { AppState } from '../models/types'

vi.mock('./charts/WaterfallChart', () => ({
  WaterfallChart: () => <div role="img" aria-label="Waterfall chart mock" />,
}))

const weeks = [
  { index: 0, startISO: '2025-01-06', iso: '2025-W02', isoLabel: '2025-W02', dateLabel: 'Jan 06–Jan 12' },
  { index: 1, startISO: '2025-01-13', iso: '2025-W03', isoLabel: '2025-W03', dateLabel: 'Jan 13–Jan 19' },
]

const baseState: AppState = {
  organization: undefined,
  objectives: [],
  krs: [{ id: 'kr-1', name: 'Reduce cycle time', aggregation: 'cumulative', unit: 'count' }],
  teams: [{ id: 'team-1', name: 'Platform', color: '#000000' }],
  pods: [],
  podMemberships: [],
  individuals: [],
  people: [],
  period: { startISO: '2025-01-06', endISO: '2025-03-31' },
  planDraft: { 'kr-1': { '2025-W02': 5, '2025-W03': 6 } },
  actuals: { 'kr-1': {} },
  baselines: [{ id: 'bl-1', version: 1, lockedAt: '2025-01-01', lockedBy: 'seed', data: {} }],
  currentBaselineId: 'bl-1',
  initiatives: [],
  initiativeWeekly: {},
  initiativeWeeklyMeta: {},
  phase: 'execution',
  reportingDateISO: '2025-01-06',
  theme: 'light',
}

let mockState: AppState = baseState
const mockDispatch = vi.fn()
let lastSelectedState: AppState | undefined

vi.mock('../state/store', () => ({
  useStore: (selector?: (s: AppState) => any) => {
    const sel = selector ?? ((s: AppState) => s)
    const result = sel(mockState)
    lastSelectedState = mockState
    return result
  },
  useDispatch: () => mockDispatch,
}))

vi.mock('../hooks/useElementWidth', () => ({
  useElementWidth: () => [{ current: { scrollLeft: 0, querySelector: vi.fn(() => null) } }, 1024],
}))

function resetState(overrides?: Partial<AppState>) {
  mockState = { ...baseState, ...(overrides || {}) }
}

describe('PlanGrid', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  beforeEach(() => {
    resetState()
    mockDispatch.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('disables plan inputs when a baseline is locked', async () => {
    await renderWithProviders({ ui: <PlanGrid weeks={weeks} />, withStore: false })
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs[0]).toBeDisabled()
  })

  it('keeps inputs editable when no baseline is active', async () => {
    resetState({ baselines: [], currentBaselineId: undefined })
    expect(mockState.baselines.length).toBe(0)
    await renderWithProviders({ ui: <PlanGrid weeks={weeks} />, withStore: false })
    expect(lastSelectedState?.baselines.length).toBe(0)
    expect(lastSelectedState?.currentBaselineId).toBeUndefined()
    const input = screen.getAllByRole('spinbutton')[0]
    expect(input).toBeEnabled()
    fireEvent.change(input, { target: { value: '12' } })
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'UPDATE_PLAN_DRAFT', krId: 'kr-1', weekKey: '2025-W02', value: 12 })
  })

  it('highlights the reporting week column', async () => {
    const { container } = await renderWithProviders({ ui: <PlanGrid weeks={weeks} />, withStore: false })
    const header = container.querySelector('th[data-iso="2025-W02"]') as HTMLElement | null
    expect(header).not.toBeNull()
    expect(header).toHaveClass('week-highlight')
  })

  it('renders only the provided weeks (window contract)', async () => {
    const limitedWeeks = weeks.slice(0, 1)
    const { container } = await renderWithProviders({ ui: <PlanGrid weeks={limitedWeeks} />, withStore: false })
    const headers = container.querySelectorAll('th[data-iso]')
    expect(headers).toHaveLength(limitedWeeks.length)
  })
})
