import React from 'react'
import { useDispatch, useStore } from '../state/store'
import { weekKey } from '../utils/weeks'
import { useElementWidth } from '../hooks/useElementWidth'
import { KeyResult } from '../models/types'

type Props = { 
  weeks: { index: number; startISO: string; iso: string; isoLabel: string; dateLabel: string }[]
  filteredKRs?: KeyResult[]
}

export function PlanGrid({ weeks, filteredKRs }: Props) {
  const state = useStore(s => s)
  const dispatch = useDispatch()
  const baseline = state.baselines.find(b => b.id === state.currentBaselineId)
  const readOnly = Boolean(baseline)
  
  // Use filtered KRs if provided, otherwise use all KRs
  const krs = filteredKRs || state.krs

  if (krs.length === 0) return null

  const [wrapRef] = useElementWidth<HTMLDivElement>()
  const vis = weeks

  return (
    <>
      <div className="grid-nav">
        <div className="row" style={{ gap: 8 }}>
          <button onClick={() => { /* prior quarter paging not yet wired */ }}>◀ Prior Quarter</button>
          <button onClick={() => { /* next quarter paging not yet wired */ }}>Next Quarter ▶</button>
          <button onClick={() => { if (wrapRef.current) wrapRef.current.scrollLeft = 0 }}>Latest</button>
        </div>
        <div className="muted">All weeks</div>
      </div>
      <div className="table-wrap" ref={wrapRef}>
        <table>
          <thead>
            <tr>
              <th className="kr" style={{ minWidth: 200 }}>Key Result</th>
              {vis.map(w => {
                const highlight = (() => {
                  const dateISO = (state as any).reportingDateISO as string | undefined
                  if (!dateISO) return false
                  const start = new Date(w.startISO + 'T00:00:00Z')
                  const end = new Date(start.getTime())
                  end.setUTCDate(end.getUTCDate() + 6)
                  const d = new Date(dateISO + 'T00:00:00Z')
                  return d >= start && d <= end
                })()
                return (
                  <th key={w.iso} data-iso={w.iso} className={highlight ? 'week-highlight' : ''} title={`${w.startISO} • ${w.dateLabel}`}>
                    <div>{w.isoLabel}</div>
                    <div className="week-date">{w.dateLabel}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {krs.map(kr => {
              const perWeek = state.planDraft[kr.id] || {}
              return (
                <tr key={kr.id} data-kr={kr.id}>
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
                    const highlight = (() => {
                      const dateISO = (state as any).reportingDateISO as string | undefined
                      if (!dateISO) return false
                      const start = new Date(w.startISO + 'T00:00:00Z')
                      const end = new Date(start.getTime())
                      end.setUTCDate(end.getUTCDate() + 6)
                      const d = new Date(dateISO + 'T00:00:00Z')
                      return d >= start && d <= end
                    })()
                    return (
                      <td key={k} className={highlight ? 'week-highlight' : ''}>
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
      {/* Anchor views: scroll reporting week to left; focus specific KR if requested */}
      {React.useEffect(() => {
        if (!wrapRef.current) return
        const dateISO = (state as any).reportingDateISO as string | undefined
        if (dateISO) {
          const week = weeks.find(w => {
            const start = new Date(w.startISO + 'T00:00:00Z')
            const end = new Date(start.getTime())
            end.setUTCDate(end.getUTCDate() + 6)
            const d = new Date(dateISO + 'T00:00:00Z')
            return d >= start && d <= end
          })
          if (week) {
            const th = wrapRef.current.querySelector(`th[data-iso="${week.iso}"]`) as HTMLElement | null
            if (th) th.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' })
          }
        }
        // Focus KR row if provided via hint
        if (state.focusKrId) {
          const tr = wrapRef.current.querySelector(`tr[data-kr="${state.focusKrId}"]`) as HTMLElement | null
          if (tr) tr.scrollIntoView({ behavior: 'auto', block: 'center' })
          // clear hint
          dispatch({ type: 'FOCUS_KR', krId: undefined })
        }
      }, [wrapRef, weeks, (state as any).reportingDateISO, state.focusKrId])}
    </>
  )
}
