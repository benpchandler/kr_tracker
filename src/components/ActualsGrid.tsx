import React from 'react'
import { useDispatch, useStore } from '../state/store'
import { weekKey } from '../utils/weeks'
import { useWeekWindow } from '../hooks/useWeekWindow'
import { useElementWidth } from '../hooks/useElementWidth'

type Props = { weeks: { index: number; startISO: string; iso: string; isoLabel: string; dateLabel: string }[] }

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[,%$\s]/g, '')
  if (cleaned === '') return undefined
  const n = Number(cleaned)
  return isNaN(n) ? undefined : n
}

export function ActualsGrid({ weeks }: Props) {
  const state = useStore(s => s)
  const dispatch = useDispatch()

  const [anchor, setAnchor] = React.useState<{ krIdx: number; weekIdx: number } | null>(null)
  const baseline = state.baselines.find(b => b.id === state.currentBaselineId)
  const [wrapRef, wrapWidth] = useElementWidth<HTMLDivElement>()
  const { visibleWeeks, prev, next, toLatest, rangeLabel } = useWeekWindow(weeks, { width: wrapWidth, minCol: 120, leftCol: 220 })

  if (state.krs.length === 0) return null

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="muted">Paste from Sheets/Excel: select a cell to anchor, then paste. We will fill across and down.</div>
      <div className="grid-nav">
        <div className="row" style={{ gap: 8 }}>
          <button onClick={prev}>◀ Prev</button>
          <button onClick={next}>Next ▶</button>
          <button onClick={toLatest}>Latest</button>
        </div>
        <div className="muted">Weeks {rangeLabel}</div>
      </div>
      <div className="table-wrap" ref={wrapRef}>
        <table>
          <thead>
            <tr>
              <th className="kr" style={{ minWidth: 200 }}>Key Result</th>
              {visibleWeeks.map(w => (
                <th key={w.iso} title={`${w.startISO} • ${w.dateLabel}`}>
                  <div>{w.isoLabel}</div>
                  <div className="week-date">{w.dateLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.krs.map((kr, rIdx) => {
              const perWeek = state.actuals[kr.id] || {}
              return (
                <tr key={kr.id}>
                  <td className="kr">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{kr.name}</strong>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {kr.aggregation} • {kr.unit}
                        {kr.teamId ? ` • ${state.teams.find(t => t.id === kr.teamId)?.name || kr.teamId}` : ''}
                      </span>
                    </div>
                  </td>
                  {visibleWeeks.map((w, cIdx) => {
                    const k = weekKey(w)
                    const value = (perWeek[k] ?? perWeek[w.startISO]) ?? ''
                    return (
                      <td key={k}>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={value}
                          onFocus={() => setAnchor({ krIdx: rIdx, weekIdx: cIdx })}
                          onChange={(e) => {
                            const v = parseNumber(e.target.value)
                            if (v === undefined) return
                            dispatch({ type: 'UPDATE_ACTUALS', krId: kr.id, weekKey: k, value: v })
                          }}
                          onPaste={(e) => {
                            if (!anchor) return
                            const text = e.clipboardData.getData('text/plain')
                            if (!text) return
                            e.preventDefault()
                            const rows = text.replace(/\r/g, '').split('\n').filter(Boolean).map(line => line.split('\t'))
                            // If no tabs present, try CSV split on commas
                            const hasTabs = text.includes('\t')
                            const matrix = hasTabs ? rows : text.split('\n').filter(Boolean).map(line => line.split(','))
                            const updates: { krId: string; weekKey: string; value: number }[] = []
                            for (let r = 0; r < matrix.length; r++) {
                              const destRow = anchor.krIdx + r
                              if (destRow >= state.krs.length) break
                              const rowKr = state.krs[destRow]
                              for (let c = 0; c < matrix[r].length; c++) {
                                const destCol = anchor.weekIdx + c
                                if (destCol >= visibleWeeks.length) break
                                const cell = matrix[r][c]
                                const val = parseNumber(cell)
                                if (val === undefined) continue
                                const wk = weekKey(visibleWeeks[destCol])
                                updates.push({ krId: rowKr.id, weekKey: wk, value: val })
                              }
                            }
                            if (updates.length > 0) dispatch({ type: 'PASTE_ACTUALS', updates })
                          }}
                          disabled={!baseline}
                          title={baseline ? '' : 'Lock a baseline plan to enable actuals entry'}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
