import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, cleanup, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils/render'
import { Setup } from './Setup'
import type { AppState } from '../models/types'
import { STORAGE_KEY, LEGACY_STORAGE_KEYS } from '../config'

const baseState: AppState = {
  organization: undefined,
  objectives: [],
  krs: [],
  teams: [],
  pods: [],
  podMemberships: [],
  individuals: [],
  people: [],
  period: { startISO: '2025-01-01', endISO: '2025-03-31' },
  planDraft: {},
  actuals: {},
  baselines: [],
  currentBaselineId: undefined,
  initiatives: [],
  initiativeWeekly: {},
  initiativeWeeklyMeta: {},
  phase: 'planning',
  reportingDateISO: undefined,
  theme: 'light',
}

let mockState: AppState = baseState
const mockDispatch = vi.fn()

vi.mock('../state/store', () => ({
  useStore: (selector: (s: AppState) => any) => selector(mockState),
  useDispatch: () => mockDispatch,
}))

function resetState(overrides?: Partial<AppState>) {
  mockState = { ...baseState, ...(overrides || {}) }
}

const originalFileReader = global.FileReader

describe('Setup data management', () => {
  beforeEach(() => {
    resetState()
    mockDispatch.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    if (originalFileReader) {
      global.FileReader = originalFileReader
    }
  })

  it('requires double confirmation before clearing storage and reload', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)

    const { user } = await renderWithProviders({ ui: <Setup />, withStore: false })
    await user.click(screen.getByRole('button', { name: /Data Management/i }))
    try {
      await user.click(screen.getByRole('button', { name: /Reset All Data/i }))
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Not implemented: navigation')) {
        throw error
      }
    }

    expect(confirmSpy).toHaveBeenCalledTimes(2)
  })

  it('does not clear storage when reset is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    const removeSpy = vi.spyOn(window.localStorage, 'removeItem')

    const { user } = await renderWithProviders({ ui: <Setup />, withStore: false })
    await user.click(screen.getByRole('button', { name: /Data Management/i }))
    await user.click(screen.getByRole('button', { name: /Reset All Data/i }))

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(removeSpy).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('imports parsed state when file upload is confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    class MockFileReader {
      public onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null
      readAsText = vi.fn(() => {
        const payload = JSON.stringify({ objectives: [{ id: 'obj-1', name: 'North Star' }] })
        this.onload?.({ target: { result: payload } } as unknown as ProgressEvent<FileReader>)
      })
    }
    // @ts-expect-error - assign mock for tests
    global.FileReader = MockFileReader

    const { user } = await renderWithProviders({ ui: <Setup />, withStore: false })
    await user.click(screen.getByRole('button', { name: /Data Management/i }))
    const fileInput = screen.getByLabelText(/Import Data/i, { selector: 'input[type="file"]' })
    const file = new File(['{}'], 'import.json', { type: 'application/json' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(confirmSpy).toHaveBeenCalled()
    expect(alertSpy).not.toHaveBeenCalled()
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'IMPORT_STATE' }))
  })

  it('alerts when uploaded file cannot be parsed', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    class MockFileReader {
      public onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null
      readAsText = vi.fn(() => {
        this.onload?.({ target: { result: '{invalid json' } } as unknown as ProgressEvent<FileReader>)
      })
    }
    // @ts-expect-error - assign mock for tests
    global.FileReader = MockFileReader

    const { user } = await renderWithProviders({ ui: <Setup />, withStore: false })
    await user.click(screen.getByRole('button', { name: /Data Management/i }))
    const fileInput = screen.getByLabelText(/Import Data/i, { selector: 'input[type="file"]' })
    const file = new File(['{}'], 'import.json', { type: 'application/json' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(window.alert).toHaveBeenCalledWith('Invalid JSON file')
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'IMPORT_STATE' }))
  })
})
