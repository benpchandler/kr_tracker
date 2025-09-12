import React from 'react'
import { useDispatch, useStore } from '../state/store'
import { weekKey } from '../utils/weeks'
import { useWeekWindow } from '../hooks/useWeekWindow'
import { useElementWidth } from '../hooks/useElementWidth'

type Props = { weeks: { index: number; startISO: string; iso: string; isoLabel: string; dateLabel: string }[] }

export function PlanGrid({ weeks }: Props) {
  const state = useStore(s => s)
  const dispatch = useDispatch()
  const baseline = state.baselines.find(b => b.id === state.currentBaselineId)
  const readOnly = Boolean(baseline)

  if (state.krs.length === 0) return null

  const [wrapRef, wrapWidth] = useElementWidth<HTMLDivElement>()
  const ww = useWeekWindow(weeks, { width: wrapWidth, minCol: 120, leftCol: 220 })
  const { visibleWeeks: vis, prev: p, next: n, toLatest: t, rangeLabel: rl } = ww

  return (
    <>
      <div className="grid-nav">
        <div className="row" style={{ gap: 8 }}>
          <button onClick={p}>◀ Prev</button>
          <button onClick={n}>Next ▶</button>
          <button onClick={t}>Latest</button>
        </div>
        <div className="muted">Weeks {rl}</div>
      </div>
      <div className="table-wrap" ref={wrapRef}>
        <table>
          <thead>
            <tr>
              <th className="kr" style={{ minWidth: 200 }}>Key Result</th>
              {vis.map(w => (
                <th key={w.iso} title={`${w.startISO} • ${w.dateLabel}`}>
                  <div>{w.isoLabel}</div>
                  <div className="week-date">{w.dateLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.krs.map(kr => {
              const perWeek = state.planDraft[kr.id] || {}
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
                  {vis.map(w => {
                    const k = weekKey(w)
                    const value = (perWeek[k] ?? perWeek[w.startISO]) ?? ''
                    return (
                      <td key={k}>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={value}
                          onChange={(e) => dispatch({ type: 'UPDATE_PLAN_DRAFT', krId: kr.id, weekKey: k, value: Number(e.target.value) })}
                          disabled={readOnly}
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
    </>
  )
}
