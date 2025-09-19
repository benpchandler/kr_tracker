import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { KrRowKpis } from './KrRowKpis'
import { renderWithProviders } from '../test-utils/render'
import type { AppState, KrMetricsSummary } from '../models/types'

vi.mock('./Sparkline', () => ({
  Sparkline: ({ plan, actual }: { plan: number[]; actual: number[] }) => (
    <div data-testid="sparkline" data-plan={plan.join(',')} data-actual={actual.join(',')} />
  ),
}))

const weeks = [
  { index: 0, startISO: '2025-01-06', iso: '2025-W02', isoLabel: '2025-W02', dateLabel: 'Jan 06–Jan 12' },
  { index: 1, startISO: '2025-01-13', iso: '2025-W03', isoLabel: '2025-W03', dateLabel: 'Jan 13–Jan 19' },
  { index: 2, startISO: '2025-01-20', iso: '2025-W04', isoLabel: '2025-W04', dateLabel: 'Jan 20–Jan 26' },
]

const summary: KrMetricsSummary = {
  krId: 'kr-1',
  latestWeek: '2025-W03',
  latestPacePct: 1.01,
  latestVariance: 2.3,
  health: 'green',
  series: {
    weeks: ['2025-W02', '2025-W03', '2025-W04'],
    plan: [5, 6, 7],
    actual: [5.1, 6.2, 6.8],
  },
}

const baseState: AppState = {
  organization: undefined,
  objectives: [],
  krs: [{ id: 'kr-1', name: 'KR name', aggregation: 'cumulative', unit: 'count', status: 'on_track' }],
  teams: [],
  pods: [],
  podMemberships: [],
  individuals: [],
  people: [],
  period: { startISO: '2025-01-06', endISO: '2025-03-31' },
  planDraft: { 'kr-1': { '2025-W02': 5, '2025-W03': 6, '2025-W04': 7 } },
  actuals: { 'kr-1': { '2025-W02': 5.1, '2025-W03': 6.2, '2025-W04': 6.8 } },
  baselines: [
    {
      id: 'bl-1',
      version: 1,
      lockedAt: '2025-01-01',
      lockedBy: 'seed',
      data: { 'kr-1': { '2025-W02': 5, '2025-W03': 6, '2025-W04': 7 } },
    },
  ],
  currentBaselineId: 'bl-1',
  initiatives: [],
  initiativeWeekly: {},
  initiativeWeeklyMeta: {},
  phase: 'execution',
  reportingDateISO: '2025-01-13',
  theme: 'light',
}

let mockState = baseState

vi.mock('../state/store', () => ({
  useStore: (selector: (s: AppState) => any) => selector(mockState),
}))

function resetState(overrides?: Partial<AppState>) {
  mockState = { ...baseState, ...(overrides || {}) }
}

describe('KrRowKpis', () => {
  beforeEach(() => {
    resetState()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders pace, variance, and sparkline aligned with visible weeks', async () => {
    await renderWithProviders({
      ui: <KrRowKpis weeks={weeks} />,
      withStore: false,
    })
    expect(screen.getByText(/Pace/)).toHaveTextContent('101%')
    expect(screen.getByText(/Δ/)).toHaveTextContent('-0.20')
    const sparkline = screen.getByTestId('sparkline')
    expect(sparkline).toHaveAttribute('data-plan', '5,6,7')
    expect(sparkline).toHaveAttribute('data-actual', '5.1,6.2,6.8')
  })

  it('handles missing summary gracefully', async () => {
    resetState({ krs: [{ id: 'kr-2', name: 'Other KR', aggregation: 'cumulative', unit: 'count' }] })
    await renderWithProviders({
      ui: <KrRowKpis weeks={weeks} filteredKRs={[{ id: 'kr-2', name: 'Other KR', aggregation: 'cumulative', unit: 'count' }]} />,
      withStore: false,
    })
    const sparkline = screen.getByTestId('sparkline')
    expect(sparkline).toHaveAttribute('data-plan', ',,')
    expect(sparkline).toHaveAttribute('data-actual', ',,')
  })

  it('exposes pace and status badges with accessible labels', async () => {
    resetState({
      krs: [{ ...baseState.krs[0], status: 'at_risk' }],
    })
    const { checkA11y, container } = await renderWithProviders({
      ui: <KrRowKpis weeks={weeks} />,
      withStore: false,
    })
    expect(screen.getByLabelText(/Weekly variance \(actual minus plan\)/i)).toHaveTextContent('Δ -0.20')
    expect(screen.getByLabelText(/Pace to date/i)).toHaveTextContent('Pace 101%')
    const statusBadge = screen.getByLabelText(/Status: At Risk/i)
    expect(statusBadge).toHaveAttribute('role', 'status')
    expect(statusBadge).toHaveAttribute('title', expect.stringContaining('Key result status'))
    await checkA11y(container)
  })
})
