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
  krs: [{ id: 'kr-1', name: 'KR name', aggregation: 'cumulative', unit: 'count' }],
  actuals: { 'kr-1': { '2025-W02': 5, '2025-W03': 6, '2025-W04': 7 } },
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
      ui: <KrRowKpis krId="kr-1" summary={summary} visibleWeeks={weeks} />,
      withStore: false,
    })
    expect(screen.getByText(/Pace/)).toHaveTextContent('101%')
    expect(screen.getByText(/Δ/)).toHaveTextContent('2.3')
    const sparkline = screen.getByTestId('sparkline')
    expect(sparkline).toHaveAttribute('data-plan', '5,6,7')
    expect(sparkline).toHaveAttribute('data-actual', '5.1,6.2,6.8')
  })

  it('handles missing summary gracefully', async () => {
    await renderWithProviders({
      ui: <KrRowKpis krId="kr-2" summary={undefined} visibleWeeks={weeks} />,
      withStore: false,
    })
    expect(screen.queryByTestId('sparkline')).toBeNull()
  })
})
