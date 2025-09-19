import React from 'react'

type Week = { index: number; startISO: string; iso: string; isoLabel?: string; dateLabel?: string }

export function useWeekWindow(
  weeks: Week[],
  options?: { leftCol?: number; minCol?: number; padding?: number; width?: number }
) {
  const { leftCol = 240, minCol = 96, padding = 64, width } = options || {}
  const [cols, setCols] = React.useState(() => calcCols(width ?? window.innerWidth, leftCol, minCol, padding))
  const [start, setStart] = React.useState(0)

  React.useEffect(() => {
    if (width !== undefined) {
      setCols(calcCols(width, leftCol, minCol, padding))
      return
    }
    function onResize() {
      setCols(calcCols(window.innerWidth, leftCol, minCol, padding))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [leftCol, minCol, padding, width])

  // Default to latest slice whenever weeks or cols change
  React.useEffect(() => {
    const latestStart = Math.max(0, weeks.length - cols)
    setStart(latestStart)
  }, [weeks.length, cols])

  const end = Math.min(weeks.length, start + cols)
  const visibleWeeks = weeks.slice(start, end)

  function prev() { setStart(s => Math.max(0, s - cols)) }
  function next() { setStart(s => Math.min(Math.max(0, weeks.length - cols), s + cols)) }
  function toLatest() { setStart(Math.max(0, weeks.length - cols)) }

  const rangeLabel = weeks.length ? `${start + 1}–${start + visibleWeeks.length} of ${weeks.length}` : '0 of 0'

  return { visibleWeeks, cols, start, end, setStart, prev, next, toLatest, rangeLabel }
}

function calcCols(width: number, leftCol: number, minCol: number, padding: number): number {
  const available = Math.max(320, width - leftCol - padding)
  const cols = Math.floor(available / minCol)
  return Math.max(2, cols)
}
