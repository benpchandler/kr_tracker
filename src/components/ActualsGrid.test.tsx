import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import { ActualsGrid } from './ActualsGrid'
import { renderWithProviders } from '../test-utils/render'
import type { AppState } from '../models/types'

vi.mock('./Sparkline', () => ({ Sparkline: () => <div data-testid="sparkline" /> }))

const weeks = [
  { index: 0, startISO: '2025-01-06', iso: '2025-W02', isoLabel: '2025-W02', dateLabel: 'Jan 06–Jan 12' },
  { index: 1, startISO: '2025-01-13', iso: '2025-W03', isoLabel: '2025-W03', dateLabel: 'Jan 13–Jan 19' },
  { index: 2, startISO: '2025-01-20', iso: '2025-W04', isoLabel: '2025-W04', dateLabel: 'Jan 20–Jan 26' },
]

const baseState: AppState = {
  organization: undefined,
  objectives: [],
  krs: [{ id: 'kr-1', name: 'Actual KR', aggregation: 'cumulative', unit: 'count' }],
  teams: [],
  pods: [],
  podMemberships: [],
  individuals: [],
  people: [],
  period: { startISO: '2025-01-06', endISO: '2025-03-31' },
  planDraft: { 'kr-1': { '2025-W02': 5, '2025-W03': 6, '2025-W04': 7 } },
  actuals: { 'kr-1': { '2025-W02': 1 } },
  baselines: [{ id: 'bl-1', version: 1, lockedAt: '2025-01-01', lockedBy: 'seed', data: { 'kr-1': { '2025-W02': 5, '2025-W03': 6, '2025-W04': 7 } } }],
  currentBaselineId: 'bl-1',
  initiatives: [],
  initiativeWeekly: {},
  initiativeWeeklyMeta: {},
  phase: 'execution',
  reportingDateISO: '2025-01-13',
  theme: 'light',
}

let mockState: AppState = baseState
const mockDispatch = vi.fn()

vi.mock('../state/store', () => ({
  useStore: (selector?: (s: AppState) => any) => {
    const sel = selector ?? ((s: AppState) => s)
    return sel(mockState)
  },
  useDispatch: () => mockDispatch,
}))

vi.mock('../hooks/useElementWidth', () => ({
  useElementWidth: () => [{ current: { scrollLeft: 0, querySelector: vi.fn(() => null) } }, 960],
}))

function resetState(overrides?: Partial<AppState>) {
  mockState = { ...baseState, ...(overrides || {}) }
}

describe('ActualsGrid', () => {
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

  it('keeps inputs enabled regardless of baseline', async () => {
    await renderWithProviders({ ui: <ActualsGrid weeks={weeks} />, withStore: false })
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs[0]).toBeEnabled()
    expect(inputs[0]).toHaveValue(1)
  })

  it('highlights reporting week column', async () => {
    const { container } = await renderWithProviders({ ui: <ActualsGrid weeks={weeks} />, withStore: false })
    const highlighted = container.querySelectorAll('th.week-highlight')
    expect(highlighted.length).toBeGreaterThan(0)
  })

  it('dispatches UPDATE_ACTUALS on edit', async () => {
    await renderWithProviders({ ui: <ActualsGrid weeks={weeks} />, withStore: false })
    const input = screen.getAllByRole('spinbutton')[1]
    fireEvent.change(input, { target: { value: '9' } })
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'UPDATE_ACTUALS', krId: 'kr-1', weekKey: '2025-W03', value: 9 })
  })

  it('clips paste updates to visible weeks', async () => {
    await renderWithProviders({ ui: <ActualsGrid weeks={weeks.slice(0, 2)} />, withStore: false })
    const target = screen.getAllByRole('spinbutton')[0]
    fireEvent.focus(target)
    await Promise.resolve()
    const text = '10\t11\t12'
    fireEvent.paste(target, {
      clipboardData: {
        getData: () => text,
      },
    } as unknown as ClipboardEventInit)
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'PASTE_ACTUALS',
      updates: [
        { krId: 'kr-1', weekKey: '2025-W02', value: 10 },
        { krId: 'kr-1', weekKey: '2025-W03', value: 11 },
      ],
    })
  })

  it('skips blank cells when pasting tabular data', async () => {
    await renderWithProviders({ ui: <ActualsGrid weeks={weeks} />, withStore: false })
    const target = screen.getAllByRole('spinbutton')[0]
    fireEvent.focus(target)
    await Promise.resolve()
    const text = '10\t\t12'
    fireEvent.paste(target, {
      clipboardData: {
        getData: () => text,
      },
    } as unknown as ClipboardEventInit)
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'PASTE_ACTUALS',
      updates: [
        { krId: 'kr-1', weekKey: '2025-W02', value: 10 },
        { krId: 'kr-1', weekKey: '2025-W04', value: 12 },
      ],
    })
  })

  it('normalizes commas and currency characters when pasting', async () => {
    await renderWithProviders({ ui: <ActualsGrid weeks={weeks.slice(0, 2)} />, withStore: false })
    const target = screen.getAllByRole('spinbutton')[0]
    fireEvent.focus(target)
    await Promise.resolve()
    const text = '£1,200.50\t300%'
    fireEvent.paste(target, {
      clipboardData: {
        getData: () => text,
      },
    } as unknown as ClipboardEventInit)
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'PASTE_ACTUALS',
      updates: [
        { krId: 'kr-1', weekKey: '2025-W02', value: 1200.5 },
        { krId: 'kr-1', weekKey: '2025-W03', value: 300 },
      ],
    })
  })

  it('passes axe accessibility checks', async () => {
    const { container, checkA11y } = await renderWithProviders({ ui: <ActualsGrid weeks={weeks} />, withStore: false })
    await checkA11y(container)
  })
})
