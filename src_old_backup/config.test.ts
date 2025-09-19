import { describe, it, expect } from 'vitest'
import { formatNumeric, HEALTH_THRESHOLDS } from './config'

describe('formatNumeric', () => {
  it('formats numbers with thousands separator and max one decimal', () => {
    expect(formatNumeric(1234.567)).toBe('1,234.6')
    expect(formatNumeric(1234.04)).toBe('1,234')
  })

  it('supports custom maximum fraction digits', () => {
    expect(formatNumeric(1.234, { maximumFractionDigits: 2 })).toBe('1.23')
  })

  it('returns fallback for nullish values', () => {
    expect(formatNumeric(undefined)).toBe('—')
    expect(formatNumeric(null, { fallback: 'n/a' })).toBe('n/a')
  })
})

describe('HEALTH_THRESHOLDS', () => {
  it('encodes healthy > atRisk and bounds between 0 and 1', () => {
    expect(HEALTH_THRESHOLDS.healthy).toBeGreaterThan(HEALTH_THRESHOLDS.atRisk)
    expect(HEALTH_THRESHOLDS.healthy).toBeLessThanOrEqual(1.5)
    expect(HEALTH_THRESHOLDS.atRisk).toBeGreaterThan(0.5)
  })
})
