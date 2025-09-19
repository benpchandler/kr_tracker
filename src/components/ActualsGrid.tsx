import React from 'react'
import { useDispatch, useStore } from '../state/store'
import { weekKey } from '../utils/weeks'
import { useElementWidth } from '../hooks/useElementWidth'
import { KeyResult, KrMetricsSummary } from '../models/types'
import { summarizeMetrics } from '../metrics/engine'
import { GridRow } from './GridRow'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

type Props = {
  weeks: { index: number; startISO: string; iso: string; isoLabel: string; dateLabel: string }[]
  filteredKRs?: KeyResult[]
}

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[\s,%$€£¥₩₽₹]/g, '')
  if (cleaned === '') return undefined
  const n = Number(cleaned)
  return isNaN(n) ? undefined : n
}

const GRID_TYPE = 'actuals'

export function ActualsGrid({ weeks, filteredKRs }: Props) {
  const state = useStore(s => s)
  const dispatch = useDispatch()
  const summaries = React.useMemo(() => summarizeMetrics(state, weeks), [state, weeks])
  const summaryMap = React.useMemo(() => {
    const map = new Map<string, KrMetricsSummary>()
    summaries.forEach(summary => map.set(summary.krId, summary))
    return map
  }, [summaries])

  const actualMeta = (state as any).actualMeta as Record<string, Record<string, { at?: string; by?: string }>> | undefined
  const baseline = state.baselines.find(b => b.id === state.currentBaselineId)
  const [wrapRef] = useElementWidth<HTMLDivElement>()
  const visibleWeeks = weeks
  const krs = filteredKRs || state.krs
  const [anchor, setAnchor] = React.useState<{ krId: string; weekIdx: number } | null>(null)

  React.useEffect(() => {
    if (!wrapRef.current) return
    const dateISO = state.reportingDateISO
    if (!dateISO) return
    const week = weeks.find(w => {
      const start = new Date(`${w.startISO}T00:00:00Z`)
      const end = new Date(start.getTime())
      end.setUTCDate(end.getUTCDate() + 6)
      const d = new Date(`${dateISO}T00:00:00Z`)
      return d >= start && d <= end
    })
    if (!week) return
    const th = wrapRef.current.querySelector(`th[data-iso="${week.iso}"]`) as HTMLElement | null
    if (th) {
      th.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' })
    }
  }, [wrapRef, weeks, state.reportingDateISO])

  if (krs.length === 0) return null
  const gridState = state.ui?.grids
  const expandedRowState = gridState?.expandedRows?.[GRID_TYPE]
  const expandedSet =
    expandedRowState instanceof Set
      ? expandedRowState
      : Array.isArray(expandedRowState)
        ? new Set(expandedRowState)
        : new Set<string>()
  const focusedRowId = gridState?.focusedRowId

  const { handleKeyDown: handleNavigationKeyDown, setFocus } = useKeyboardNavigation({
    items: krs.map(kr => ({ id: kr.id })),
    onNavigate: id => dispatch({ type: 'SET_GRID_FOCUSED_ROW', krId: id }),
    enabled: true,
    wrap: true,
  })

  const onGridKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      handleNavigationKeyDown(event)
    },
    [handleNavigationKeyDown]
  )

  const handleContextMenuAction = React.useCallback((action: string) => {
    console.info('KR context menu action', action)
  }, [])

  const stopRowToggle = React.useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation()
  }, [])
  return (
    <div style={{ display: 'grid', gap: 6 }} onKeyDown={onGridKeyDown}>
      <div className="muted" style={{ fontSize: 11 }}>
        Paste from Sheets/Excel: select a cell to anchor, then paste. We will fill across and down.
      </div>
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
      <div
        className="table-wrap"
        ref={wrapRef}
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
                  const start = new Date(`${w.startISO}T00:00:00Z`)
                  const end = new Date(start.getTime())
                  end.setUTCDate(end.getUTCDate() + 6)
                  const d = new Date(`${dateISO}T00:00:00Z`)
                  return d >= start && d <= end
                })()
                return (
                  <th
                    key={w.iso}
                    data-iso={w.iso}
                    className={highlight ? 'week-highlight' : ''}
                    title={`${w.startISO} • ${w.dateLabel}`}
                  >
                    <div>{w.isoLabel}</div>
                    <div className="week-date">{w.dateLabel}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {krs.map(kr => {
              const summary = summaryMap.get(kr.id)
              const perWeek = state.actuals[kr.id] || {}
              const planDraft = baseline?.data?.[kr.id]
              const hasPlan = !!planDraft && Object.keys(planDraft).length > 0
              const isExpanded = expandedSet.has(kr.id)
              const isFocused = focusedRowId === kr.id

              const meta = actualMeta?.[kr.id]
              let latestLabel: string | null = null
              let latestTooltip: string | undefined
              if (meta) {
                let latestAt: number | null = null
                let latestBy: string | undefined
                for (const w of visibleWeeks) {
                  const wk = weekKey(w)
                  const info = meta[wk] || meta[w.startISO]
                  if (info?.at) {
                    const t = Date.parse(info.at)
                    if (!isNaN(t) && (latestAt === null || t > latestAt)) {
                      latestAt = t
                      latestBy = info.by || latestBy
                    }
                  }
                }
                if (latestAt) {
                  const diffSec = Math.floor((Date.now() - latestAt) / 1000)
                  const ago =
                    diffSec < 60
                      ? `${diffSec}s`
                      : diffSec < 3600
                        ? `${Math.floor(diffSec / 60)}m`
                        : diffSec < 86400
                          ? `${Math.floor(diffSec / 3600)}h`
                          : `${Math.floor(diffSec / 86400)}d`
                  latestLabel = `Updated ${ago} ago by ${latestBy || 'user'}`
                  latestTooltip = `Updated ${new Date(latestAt).toLocaleString()} by ${latestBy || 'user'}`
                }
              }
              const renderExpandedContent = () => {
                const panels: React.ReactNode[] = []
                if (!hasPlan) {
                  panels.push(
                    <div key="seed" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="badge accent"
                        onClick={(event) => {
                          event.stopPropagation()
                          if (typeof kr.goalStart !== 'number' || typeof kr.goalEnd !== 'number') {
                            alert('Set KR goals (start and end) first to seed the plan.')
                            return
                          }
                          const firstKey = weeks[0]?.iso
                          const lastKey = weeks[weeks.length - 1]?.iso
                          if (!firstKey || !lastKey) return
                          dispatch({ type: 'UPDATE_PLAN_DRAFT', krId: kr.id, weekKey: firstKey, value: kr.goalStart })
                          dispatch({ type: 'UPDATE_PLAN_DRAFT', krId: kr.id, weekKey: lastKey, value: kr.goalEnd })
                          dispatch({ type: 'SET_PHASE', phase: 'planning' })
                          if (kr.teamId) {
                            dispatch({ type: 'SET_VIEW_FILTER', filter: { level: 'team', targetId: kr.teamId } as any })
                          }
                          setFocus(kr.id)
                          dispatch({ type: 'SET_GRID_FOCUSED_ROW', krId: kr.id })
                        }}
                      >
                        Seed endpoints
                      </button>
                      <button
                        className="badge"
                        onClick={(event) => {
                          event.stopPropagation()
                          if (typeof kr.goalStart !== 'number' || typeof kr.goalEnd !== 'number') {
                            alert('Set KR goals (start and end) first to seed the plan.')
                            return
                          }
                          const dateISO = state.reportingDateISO
                          let startIdx = 0
                          if (dateISO) {
                            const idx = weeks.findIndex(w => {
                              const start = new Date(`${w.startISO}T00:00:00Z`)
                              const end = new Date(start.getTime())
                              end.setUTCDate(end.getUTCDate() + 6)
                              const d = new Date(`${dateISO}T00:00:00Z`)
                              return d >= start && d <= end
                            })
                            if (idx >= 0) startIdx = idx
                          }
                          const n = weeks.length - 1
                          for (let i = startIdx; i < weeks.length; i++) {
                            const t = (i - startIdx) / Math.max(1, n - startIdx)
                            const val = kr.goalStart + (kr.goalEnd - kr.goalStart) * t
                            dispatch({
                              type: 'UPDATE_PLAN_DRAFT',
                              krId: kr.id,
                              weekKey: weeks[i].iso,
                              value: Number(val.toFixed(3)),
                            })
                          }
                          dispatch({ type: 'SET_PHASE', phase: 'planning' })
                          if (kr.teamId) {
                            dispatch({ type: 'SET_VIEW_FILTER', filter: { level: 'team', targetId: kr.teamId } as any })
                          }
                          setFocus(kr.id)
                          dispatch({ type: 'SET_GRID_FOCUSED_ROW', krId: kr.id })
                        }}
                      >
                        Seed remaining
                      </button>
                    </div>
                  )
                }
                if (latestLabel) {
                  panels.push(
                    <span key="updated" className="badge" title={latestTooltip}>
                      {latestLabel}
                    </span>
                  )
                }
                if (panels.length === 0) return null
                return (
                  <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                    {panels}
                  </div>
                )
              }
              return (
                <GridRow
                  key={kr.id}
                  kr={kr}
                  metrics={summary}
                  gridType={GRID_TYPE}
                  isExpanded={isExpanded}
                  isFocused={isFocused}
                  onToggle={() => {
                    dispatch({ type: 'TOGGLE_GRID_ROW', gridType: GRID_TYPE, krId: kr.id })
                    setFocus(kr.id)
                    dispatch({ type: 'SET_GRID_FOCUSED_ROW', krId: kr.id })
                  }}
                  onFocusRow={() => {
                    setFocus(kr.id)
                    dispatch({ type: 'SET_GRID_FOCUSED_ROW', krId: kr.id })
                  }}
                  onContextMenuAction={handleContextMenuAction}
                  renderExpandedContent={renderExpandedContent}
                  renderWeekCells={() => (
                    <>
                      {visibleWeeks.map((w, cIdx) => {
                        const wk = weekKey(w)
                        const value = (perWeek[wk] ?? perWeek[w.startISO]) ?? ''
                        const planVal = (() => {
                          const per = baseline?.data?.[kr.id]
                          if (!per) return undefined
                          return (per[wk] ?? per[w.startISO]) as number | undefined
                        })()
                        const highlight = (() => {
                          const dateISO = state.reportingDateISO
                          if (!dateISO) return false
                          const start = new Date(`${w.startISO}T00:00:00Z`)
                          const end = new Date(start.getTime())
                          end.setUTCDate(end.getUTCDate() + 6)
                          const d = new Date(`${dateISO}T00:00:00Z`)
                          return d >= start && d <= end
                        })()
                        return (
                          <td
                            key={wk}
                            className={highlight ? 'week-highlight' : ''}
                            onClick={stopRowToggle}
                          >
                            {planVal !== undefined && (
                              <div
                                className="muted"
                                style={{ fontSize: 11, marginBottom: 4 }}
                                title="Baseline plan (read-only)"
                              >
                                Plan: {typeof planVal === 'number' ? Number(planVal.toFixed(3)) : planVal}
                              </div>
                            )}
                            <input
                              type="number"
                              inputMode="decimal"
                              step="any"
                              aria-label={`${kr.name} actual for ${w.isoLabel}`}
                              value={value}
                              onClick={stopRowToggle}
                              onFocus={(event) => {
                                stopRowToggle(event)
                                setAnchor({ krId: kr.id, weekIdx: cIdx })
                                setFocus(kr.id)
                                dispatch({ type: 'SET_GRID_FOCUSED_ROW', krId: kr.id })
                              }}
                              onChange={(e) => {
                                const v = parseNumber(e.target.value)
                                if (v === undefined) return
                                dispatch({ type: 'UPDATE_ACTUALS', krId: kr.id, weekKey: wk, value: v })
                              }}
                              title={(function () {
                                const m = actualMeta?.[kr.id]?.[wk]
                                return m?.at ? `Updated ${new Date(m.at).toLocaleString()} by ${m.by || 'user'}` : ''
                              })()}
                              onPaste={(e) => {
                                if (!anchor) return
                                const text = e.clipboardData.getData('text/plain')
                                if (!text) return
                                e.preventDefault()
                                const lines = text.replace(/\r/g, '').split('\n').filter(Boolean)
                                const matrix = text.includes('\t')
                                  ? lines.map(line => line.split('\t'))
                                  : lines.map(line => line.split(','))
                                const anchorRowIndex = krs.findIndex(item => item.id === anchor.krId)
                                if (anchorRowIndex === -1) return
                                const updates: { krId: string; weekKey: string; value: number }[] = []
                                for (let r = 0; r < matrix.length; r++) {
                                  const destRowIndex = anchorRowIndex + r
                                  if (destRowIndex >= krs.length) break
                                  const rowKr = krs[destRowIndex]
                                  if (destRowIndex !== anchorRowIndex && !expandedSet.has(rowKr.id)) continue
                                  for (let c = 0; c < matrix[r].length; c++) {
                                    const destCol = anchor.weekIdx + c
                                    if (destCol >= visibleWeeks.length) break
                                    const cell = matrix[r][c]
                                    const val = parseNumber(cell)
                                    if (val === undefined) continue
                                    const targetWeek = weekKey(visibleWeeks[destCol])
                                    updates.push({ krId: rowKr.id, weekKey: targetWeek, value: val })
                                  }
                                }
                                if (updates.length > 0) {
                                  dispatch({ type: 'PASTE_ACTUALS', updates })
                                }
                              }}
                            />
                          </td>
                        )
                      })}
                    </>
                  )}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
