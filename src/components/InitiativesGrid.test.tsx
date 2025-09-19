import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import { InitiativesGrid } from './InitiativesGrid'
import { renderWithProviders } from '../test-utils/render'
import type { AppState, Initiative, KeyResult } from '../models/types'

vi.mock('./Sparkline', () => ({
  Sparkline: () => <div data-testid="sparkline" />,
}))

const weeks = [
  { index: 0, startISO: '2025-01-06', iso: '2025-W02', isoLabel: '2025-W02', dateLabel: 'Jan 06–Jan 12' },
  { index: 1, startISO: '2025-01-13', iso: '2025-W03', isoLabel: '2025-W03', dateLabel: 'Jan 13–Jan 19' },
]

const kr: KeyResult = {
  id: 'kr-1',
  name: 'KR name',
  aggregation: 'cumulative',
  unit: 'count',
  goalStart: 0,
  goalEnd: 100,
}

const initiatives: Initiative[] = [
  { id: 'i-1', krId: 'kr-1', name: 'Optimize retries', impact: 30, confidence: 0.9, isPlaceholder: false },
  { id: 'i-2', krId: 'kr-1', name: 'Reduce timeouts', impact: 20, confidence: 0.8, isPlaceholder: false },
]

const baseState: AppState = {
  organization: undefined,
  objectives: [],
  krs: [kr],
  teams: [],
  pods: [],
  podMemberships: [],
  individuals: [],
  people: [],
  period: { startISO: '2025-01-06', endISO: '2025-03-31' },
  planDraft: {},
  actuals: {},
  baselines: [],
  currentBaselineId: undefined,
  initiatives,
  initiativeWeekly: {},
  initiativeWeeklyMeta: {},
  phase: 'execution',
  reportingDateISO: '2025-01-13',
  theme: 'light',
}

let mockState = baseState
const mockDispatch = vi.fn()

vi.mock('../state/store', () => ({
  useStore: (selector: (s: AppState) => any) => selector(mockState),
  useDispatch: () => mockDispatch,
}))

function resetState(overrides?: Partial<AppState>) {
  mockState = { ...baseState, ...(overrides || {}) }
}

describe('InitiativesGrid', () => {
  beforeEach(() => {
    resetState()
    mockDispatch.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows coverage hint when below threshold', async () => {
    await renderWithProviders({ ui: <InitiativesGrid kr={kr} weeks={weeks} />, withStore: false })
    expect(screen.getByText(/Target 95% coverage/i)).toBeInTheDocument()
  })

  it('adds initiative via button', async () => {
    await renderWithProviders({ ui: <InitiativesGrid kr={kr} weeks={weeks} />, withStore: false })
    fireEvent.click(screen.getByRole('button', { name: /Add Initiative/i }))
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'ADD_INITIATIVE' }))
  })

  it('persists weekly patch and meta via UPDATE_INITIATIVE_WEEKLY', async () => {
    mockState = {
      ...baseState,
      initiativeWeekly: { 'i-1': { '2025-W02': { impact: 10 } } },
      initiativeWeeklyMeta: { 'i-1': { '2025-W02': { at: new Date().toISOString(), by: 'user' } } },
    }
    await renderWithProviders({ ui: <InitiativesGrid kr={kr} weeks={weeks} />, withStore: false })
    const impactInputs = screen.getAllByRole('spinbutton')
    fireEvent.change(impactInputs[0], { target: { value: '15' } })
    const saveButtons = screen.getAllByRole('button', { name: /Save This Week/i })
    fireEvent.click(saveButtons[0])
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'UPDATE_INITIATIVE_WEEKLY',
      initiativeId: 'i-1',
    }))
  })

  it('suppresses coverage hint when initiatives meet target', async () => {
    resetState({
      initiatives: [
        { ...initiatives[0], impact: 60 },
        { ...initiatives[1], impact: 40 },
      ],
    })
    await renderWithProviders({ ui: <InitiativesGrid kr={kr} weeks={weeks} />, withStore: false })
    expect(screen.queryByText(/Target 95% coverage/i)).toBeNull()
  })

  it('displays last update metadata for reporting week confidence edits', async () => {
    resetState({
      reportingDateISO: '2025-01-15',
      initiativeWeeklyMeta: {
        'i-1': {
          '2025-W03': { at: '2025-01-14T12:00:00.000Z', by: 'analyst' },
        },
      },
      initiativeWeekly: {
        'i-1': {
          '2025-W03': { confidence: 0.75 },
        },
      },
    })
    await renderWithProviders({ ui: <InitiativesGrid kr={kr} weeks={weeks} />, withStore: false })
    expect(screen.getByText(/Updated .*analyst/i)).toBeInTheDocument()
  })

  it('passes axe accessibility checks for default view', async () => {
    const { container, checkA11y } = await renderWithProviders({ ui: <InitiativesGrid kr={kr} weeks={weeks} />, withStore: false })
    await checkA11y(container)
  })
})
