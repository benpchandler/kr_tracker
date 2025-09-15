import React from 'react'
import { useDispatch, useStore } from '../state/store'
import { weekKey } from '../utils/weeks'
// no windowing; render all weeks with horizontal scroll
import { useElementWidth } from '../hooks/useElementWidth'
import { KeyResult } from '../models/types'
import { summarizeMetrics } from '../metrics/engine'
import { Sparkline } from './Sparkline'

type Props = { 
  weeks: { index: number; startISO: string; iso: string; isoLabel: string; dateLabel: string }[]
  filteredKRs?: KeyResult[]
}

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[,%$\s]/g, '')
  if (cleaned === '') return undefined
  const n = Number(cleaned)
  return isNaN(n) ? undefined : n
}

export function ActualsGrid({ weeks, filteredKRs }: Props) {
  const state = useStore(s => s)
  const dispatch = useDispatch()
  const summaries = React.useMemo(() => summarizeMetrics(state, weeks), [state, weeks])
  const actualMeta = (state as any).actualMeta as Record<string, Record<string, {at?: string; by?: string}>> | undefined
  const [seedForKr, setSeedForKr] = React.useState<string | null>(null)

  const [anchor, setAnchor] = React.useState<{ krIdx: number; weekIdx: number } | null>(null)
  const baseline = state.baselines.find(b => b.id === state.currentBaselineId)
  const [wrapRef, wrapWidth] = useElementWidth<HTMLDivElement>()
  const visibleWeeks = weeks

  // On mount or when weeks/reporting date changes, scroll so reporting week is leftmost
  React.useEffect(() => {
    if (!wrapRef.current) return
    const dateISO = state.reportingDateISO
    if (!dateISO) return
    // find reporting week iso in header
    const week = weeks.find(w => {
      const start = new Date(w.startISO + 'T00:00:00Z')
      const end = new Date(start.getTime())
      end.setUTCDate(end.getUTCDate() + 6)
      const d = new Date(dateISO + 'T00:00:00Z')
      return d >= start && d <= end
    })
    if (!week) return
    const th = wrapRef.current.querySelector(`th[data-iso="${week.iso}"]`) as HTMLElement | null
    if (th) {
      th.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' })
    }
  }, [wrapRef, weeks, state.reportingDateISO])
  
  // Use filtered KRs if provided, otherwise use all KRs
  const krs = filteredKRs || state.krs

  if (krs.length === 0) return null

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div className="muted" style={{ fontSize: 11 }}>Paste from Sheets/Excel: select a cell to anchor, then paste. We will fill across and down.</div>
      {!baseline && (
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="badge yellow">Plan required</span>
          <span className="muted" style={{ fontSize: 12 }}>
            Actuals are editable. Lock a plan to enable variance/pace (Plan Builder → “Lock Plan”).
          </span>
        </div>
      )}
      <div className="grid-nav">
        <div className="row" style={{ gap: 8 }}>
          <button onClick={() => { /* prior quarter paging not yet wired */ }}>◀ Prior Quarter</button>
          <button onClick={() => { /* next quarter paging not yet wired */ }}>Next Quarter ▶</button>
          <button onClick={() => { if (wrapRef.current) wrapRef.current.scrollLeft = 0 }}>Latest</button>
        </div>
        <div className="muted">All weeks</div>
      </div>
      <div className="table-wrap" ref={wrapRef}
        onWheel={(e) => {
          const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0
          if (dx !== 0 && wrapRef.current) {
            e.preventDefault()
            wrapRef.current.scrollLeft += dx
          }
        }}
      >
        <table className="compact">
          <thead>
            <tr>
              <th className="kr" style={{ minWidth: 200 }}>Key Result</th>
              {visibleWeeks.map(w => {
                const highlight = (() => {
                  const dateISO = state.reportingDateISO
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
            {krs.map((kr, rIdx) => {
              const perWeek = state.actuals[kr.id] || {}
              const s = summaries.find(x => x.krId === kr.id)
              const pacePct = s?.latestPacePct !== undefined ? Math.round(s.latestPacePct * 100) : undefined
              const variance = s?.latestVariance
              // Use configurable KR status instead of computed health
              const status = (kr as any).status as ('on_track'|'at_risk'|'off_track'|'deprioritized'|undefined)
              const statusLabel = status ? (status === 'on_track' ? 'On Track' : status === 'at_risk' ? 'At Risk' : status === 'off_track' ? 'Off Track' : 'Deprioritized') : undefined
              const statusClass = status ? (status === 'on_track' ? 'green' : status === 'at_risk' ? 'yellow' : status === 'off_track' ? 'red' : 'grey') : undefined
              const team = kr.teamId ? state.teams.find(t => t.id === kr.teamId)?.name : undefined
              const pod = kr.podId ? state.pods.find(p => p.id === kr.podId)?.name : undefined
              const unitSuffix = kr.unit === 'percent' ? ' (%)' : (kr.unit === 'currency' ? ' ($)' : '')
              const hasPlan = (() => {
                const base = baseline?.data[kr.id]
                if (!base) return false
                return Object.keys(base).length > 0
              })()
              function seedEndpoints() {
                if (typeof kr.goalStart !== 'number' || typeof kr.goalEnd !== 'number') {
                  alert('Set KR goals (start and end) first to seed the plan.')
                  return
                }
                const firstKey = weeks[0]?.iso
                const lastKey = weeks[weeks.length - 1]?.iso
                if (!firstKey || !lastKey) return
                dispatch({ type: 'UPDATE_PLAN_DRAFT', krId: kr.id, weekKey: firstKey, value: kr.goalStart })
                dispatch({ type: 'UPDATE_PLAN_DRAFT', krId: kr.id, weekKey: lastKey, value: kr.goalEnd })
                // Switch to planning to review
                dispatch({ type: 'SET_PHASE', phase: 'planning' })
                if (kr.teamId) dispatch({ type: 'SET_VIEW_FILTER', filter: { level: 'team', targetId: kr.teamId } as any })
              }
              function seedRemaining() {
                if (typeof kr.goalStart !== 'number' || typeof kr.goalEnd !== 'number') {
                  alert('Set KR goals (start and end) first to seed the plan.')
                  return
                }
                const dateISO = state.reportingDateISO
                let startIdx = 0
                if (dateISO) {
                  const idx = weeks.findIndex(w => {
                    const start = new Date(w.startISO + 'T00:00:00Z')
                    const end = new Date(start.getTime())
                    end.setUTCDate(end.getUTCDate() + 6)
                    const d = new Date(dateISO + 'T00:00:00Z')
                    return d >= start && d <= end
                  })
                  if (idx >= 0) startIdx = idx
                }
                const n = weeks.length - 1
                for (let i = startIdx; i < weeks.length; i++) {
                  const t = (i - startIdx) / Math.max(1, (n - startIdx))
                  const val = kr.goalStart + (kr.goalEnd - kr.goalStart) * t
                  dispatch({ type: 'UPDATE_PLAN_DRAFT', krId: kr.id, weekKey: weeks[i].iso, value: Number(val.toFixed(3)) })
                }
                dispatch({ type: 'SET_PHASE', phase: 'planning' })
                if (kr.teamId) dispatch({ type: 'SET_VIEW_FILTER', filter: { level: 'team', targetId: kr.teamId } as any })
              }
              return (
                <tr key={kr.id}>
                  <td className="kr">
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong>{kr.name}</strong>
                      {/* Team / Pod moved below title and above goal */}
                      <span className="muted" style={{ fontSize: 12 }}>
                        {team ? team : ''}{team && pod ? ' / ' : ''}{pod ? pod : ''}
                        {!state.objectives.find(o => o.id === kr.objectiveId) && <span className="badge unmapped" style={{ marginLeft: 8 }} title="No objective mapped">Unmapped</span>}
                      </span>
                      {(typeof kr.goalStart === 'number' || typeof kr.goalEnd === 'number') && (
                        <span className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="badge accent">🎯 Goal: {typeof kr.goalStart === 'number' ? kr.goalStart : '—'} → {typeof kr.goalEnd === 'number' ? kr.goalEnd : '—'}{unitSuffix}</span>
                          {/* integrate aggregation label on the same line */}
                          <span>{kr.aggregation}</span>
                        </span>
                      )}
                      <span className="muted" style={{ fontSize: 12 }}>
                        {!hasPlan && (
                          <>
                            <button className="badge unmapped" style={{ marginLeft: 8, cursor: 'pointer' }}
                              title="No plan in baseline; click to create"
                              onClick={() => setSeedForKr(prev => prev === kr.id ? null : kr.id)}
                            >No plan</button>
                            {seedForKr === kr.id && (
                              <span className="row" style={{ gap: 6, marginLeft: 6 }}>
                                <button className="badge accent" title="Set first and last week from Goal" onClick={seedEndpoints}>Seed endpoints</button>
                                <button className="badge" title="Linearly seed remaining weeks from reporting week to end" onClick={seedRemaining}>Seed remaining</button>
                              </span>
                            )}
                          </>
                        )}
                      </span>
                      <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="badge" title="Weekly variance (actual - plan)">Δ {variance !== undefined ? variance.toFixed(2) : '—'}</div>
                        <div className="badge" title="Pace to date">Pace {pacePct !== undefined ? `${pacePct}%` : '—'}</div>
                        {statusLabel && <div className={`badge ${statusClass}`}>{statusLabel}</div>}
                        {
                          s && (() => {
                            const firstIso = visibleWeeks[0]?.iso
                            const startIdx = firstIso ? weeks.findIndex(w => w.iso === firstIso) : 0
                            const len = visibleWeeks.length
                            const plan = s.series.plan.slice(startIdx, startIdx + len)
                            const actual = s.series.actual.slice(startIdx, startIdx + len)
                            return <Sparkline width={160} height={36} plan={plan} actual={actual} />
                          })()
                        }
                        {/* Recency chip (most recent change across visible weeks) */}
                        {(() => {
                          const meta = actualMeta?.[kr.id]
                          if (!meta) return null
                          let latestAt: number | null = null
                          let by: string | undefined
                          for (const w of visibleWeeks) {
                            const m = meta[w.iso] || meta[w.startISO]
                            if (m?.at) {
                              const t = Date.parse(m.at)
                              if (!isNaN(t) && (latestAt === null || t > latestAt)) { latestAt = t; by = m.by || by }
                            }
                          }
                          if (!latestAt) return null
                          const secs = Math.floor((Date.now() - latestAt) / 1000)
                          const ago = secs < 60 ? `${secs}s` : `${Math.floor(secs/60)}m`
                          return <span className="badge" title={`Last updated ${new Date(latestAt).toLocaleString()} by ${by||'user'}`}>Updated {ago} ago by {by || 'user'}</span>
                        })()}
                      </div>
                    </div>
                  </td>
                  {visibleWeeks.map((w, cIdx) => {
                    const k = weekKey(w)
                    const value = (perWeek[k] ?? perWeek[w.startISO]) ?? ''
                    const planVal = (() => {
                      const per = baseline?.data?.[kr.id]
                      if (!per) return undefined
                      return (per[k] ?? per[w.startISO]) as number | undefined
                    })()
                    const highlight = (() => {
                      const dateISO = state.reportingDateISO
                      if (!dateISO) return false
                      const start = new Date(w.startISO + 'T00:00:00Z')
                      const end = new Date(start.getTime())
                      end.setUTCDate(end.getUTCDate() + 6)
                      const d = new Date(dateISO + 'T00:00:00Z')
                      return d >= start && d <= end
                    })()
                    return (
                      <td key={k} className={highlight ? 'week-highlight' : ''}>
                        {planVal !== undefined && (
                          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }} title="Baseline plan (read‑only)">
                            Plan: {typeof planVal === 'number' ? Number(planVal.toFixed(3)) : planVal}
                          </div>
                        )}
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
                          title={(function(){ const m = actualMeta?.[kr.id]?.[k]; return m?.at ? `Updated ${new Date(m.at).toLocaleString()} by ${m.by || 'user'}` : '' })()}
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
                              if (destRow >= krs.length) break
                              const rowKr = krs[destRow]
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
                          disabled={false}
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
