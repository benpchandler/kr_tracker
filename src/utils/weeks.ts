// Minimal week helpers without external deps

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function parseISO(dateISO: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function startOfWeekMonday(d: Date): Date {
  // Make a copy in UTC and adjust so that Monday is the start
  const day = d.getUTCDay() // 0..6, Sun..Sat
  const diff = (day === 0 ? -6 : 1 - day) // shift so Monday is 1
  const res = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  res.setUTCDate(res.getUTCDate() + diff)
  return res
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function isoWeekInfo(d: Date): { week: number; year: number } {
  const dayNr = (d.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  thursday.setUTCDate(thursday.getUTCDate() - dayNr + 3)
  const weekYear = thursday.getUTCFullYear()
  const jan4 = new Date(Date.UTC(weekYear, 0, 4))
  const week1 = startOfWeekMonday(jan4)
  const week = 1 + Math.round((thursday.getTime() - week1.getTime()) / (7 * 24 * 3600 * 1000))
  return { week, year: weekYear }
}

function isoWeekStringFromDate(d: Date): string {
  const { week, year } = isoWeekInfo(d)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function monthShortUTC(d: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return months[d.getUTCMonth()]
}

function day2(d: Date): string { return String(d.getUTCDate()).padStart(2, '0') }

export function generateWeeks(startISO: string, endISO: string): { index: number; startISO: string; iso: string; isoLabel: string; dateLabel: string }[] {
  if (!startISO || !endISO) return []
  let start = startOfWeekMonday(parseISO(startISO))
  const end = parseISO(endISO)
  const weeks: { index: number; startISO: string; iso: string; isoLabel: string; dateLabel: string }[] = []
  let i = 1
  while (start <= end) {
    const iso = isoWeekStringFromDate(start)
    const range = `${monthShortUTC(start)} ${day2(start)}–${monthShortUTC(addDays(start, 6))} ${day2(addDays(start, 6))}`
    weeks.push({ index: i, startISO: toISODate(start), iso, isoLabel: iso, dateLabel: range })
    start = addDays(start, 7)
    i++
    if (i > 200) break // safety
  }
  return weeks
}

export function weekKey(week: { iso: string; startISO: string }): string {
  // Persist by ISO week string for interoperability
  return week.iso
}
