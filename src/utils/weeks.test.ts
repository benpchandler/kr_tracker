import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { generateWeeks, weekKey, parseISO } from './weeks'

function isMonday(dateISO: string) {
  const date = parseISO(dateISO)
  return date.getUTCDay() === 1
}

describe('generateWeeks', () => {
  it('aligns start to Monday and caps total weeks', () => {
    const weeks = generateWeeks('2025-01-08', '2025-02-05')
    expect(weeks[0].startISO).toBe('2025-01-06')
    expect(isMonday(weeks[0].startISO)).toBe(true)
    expect(weeks.length).toBeLessThanOrEqual(200)
  })

  it('produces ISO labels and range strings', () => {
    const weeks = generateWeeks('2025-01-01', '2025-01-31')
    for (const week of weeks) {
      expect(week.iso).toMatch(/^\d{4}-W\d{2}$/)
      expect(week.isoLabel).toBe(week.iso)
      expect(week.dateLabel).toMatch(/\w{3} \d{2}–\w{3} \d{2}/)
      expect(week.index).toBeGreaterThan(0)
    }
  })

  it('handles cross-year transitions and week 53 correctly', () => {
    const weeks = generateWeeks('2020-12-28', '2021-01-10')
    const labels = weeks.map(w => w.iso)
    expect(labels).toContain('2020-W53')
    expect(labels).toContain('2021-W01')
  })

  it('never exceeds 200 weeks even with large ranges (property)', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2015-01-01'), max: new Date('2030-12-31') }).filter(d => !Number.isNaN(d.getTime())),
        fc.integer({ min: 0, max: 600 }),
        (start, extraDays) => {
          const end = new Date(start.getTime())
          end.setUTCDate(end.getUTCDate() + extraDays)
          const startISO = start.toISOString().slice(0, 10)
          const endISO = end.toISOString().slice(0, 10)
          const weeks = generateWeeks(startISO, endISO)
          expect(weeks.length).toBeLessThanOrEqual(200)
        }
      )
    )
  })
})

describe('weekKey', () => {
  it('matches the iso field exactly', () => {
    const weeks = generateWeeks('2025-01-06', '2025-01-27')
    for (const week of weeks) {
      expect(weekKey(week)).toBe(week.iso)
    }
  })
})
