import React from 'react'
import { useDispatch, useStore } from '../state/store'
import { weekKey } from '../utils/weeks'
import { useElementWidth } from '../hooks/useElementWidth'
import { ID, KeyResult } from '../models/types'
import { WaterfallChart } from './charts/WaterfallChart'
import { GridRow } from './GridRow'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

type Props = {
  weeks: { index: number; startISO: string; iso: string; isoLabel: string; dateLabel: string }[]
  filteredKRs?: KeyResult[]
}

const GRID_TYPE = 'plan'

export function PlanGrid({ weeks, filteredKRs }: Props) {
  const state = useStore(s => s)
  const dispatch = useDispatch()
  const baseline = state.baselines.find(b => b.id === state.currentBaselineId)
  const readOnly = Boolean(baseline)

  const krs = filteredKRs || state.krs
  if (krs.length === 0) return null

  const [wrapRef] = useElementWidth<HTMLDivElement>()
  const [activeKrId, setActiveKrId] = React.useState<ID | undefined>(krs[0]?.id)
  const previewKrId = activeKrId || krs[0]?.id
  const activeKr = previewKrId ? krs.find(kr => kr.id === previewKrId) : undefined
  React.useEffect(() => {
    if (!wrapRef.current) return
    const dateISO = (state as any).reportingDateISO as string | undefined
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
    if (th) th.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' })
  }, [wrapRef, weeks, (state as any).reportingDateISO])

  React.useEffect(() => {
    if (!wrapRef.current) return
    if (!state.focusKrId) return
    const tr = wrapRef.current.querySelector(`tr[data-kr="${state.focusKrId}"]`) as HTMLElement | null
    if (tr) tr.scrollIntoView({ behavior: 'auto', block: 'center' })
    dispatch({ type: 'FOCUS_KR', krId: undefined })
  }, [dispatch, state.focusKrId, wrapRef])
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
    <>
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
        onKeyDown={onGridKeyDown}
      >
        <table className="compact">
          <thead>
            <tr>
              <th className="kr" style={{ minWidth: 200 }}>Key Result</th>
              {weeks.map(w => {
                const highlight = (() => {
                  const dateISO = (state as any).reportingDateISO as string | undefined
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
              const perWeek = state.planDraft[kr.id] || {}
              const isExpanded = expandedSet.has(kr.id)
              const isFocused = focusedRowId === kr.id

              const renderExpandedContent = () => (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="badge accent"
                    onClick={(event) => {
                      event.stopPropagation()
                      setActiveKrId(kr.id)
                      setFocus(kr.id)
                      dispatch({ type: 'SET_GRID_FOCUSED_ROW', krId: kr.id })
                    }}
                  >
                    {previewKrId === kr.id ? 'Viewing waterfall' : 'View waterfall'}
                  </button>
                  {readOnly && (
                    <span className="badge muted" style={{ cursor: 'default' }}>
                      Baseline locked
                    </span>
                  )}
                </div>
              )

              return (
                <GridRow
                  key={kr.id}
                  kr={kr}
                  gridType={GRID_TYPE}
                  isExpanded={isExpanded}
                  isFocused={isFocused}
                  onToggle={() => {
                    dispatch({ type: 'TOGGLE_GRID_ROW', gridType: GRID_TYPE, krId: kr.id })
                    setActiveKrId(kr.id)
                    setFocus(kr.id)
                    dispatch({ type: 'SET_GRID_FOCUSED_ROW', krId: kr.id })
                  }}
                  onFocusRow={() => {
                    setActiveKrId(kr.id)
                    setFocus(kr.id)
                    dispatch({ type: 'SET_GRID_FOCUSED_ROW', krId: kr.id })
                  }}
                  onContextMenuAction={handleContextMenuAction}
                  renderExpandedContent={renderExpandedContent}
                  renderWeekCells={() => (
                    <>
                      {weeks.map(w => {
                        const wk = weekKey(w)
                        const value = (perWeek[wk] ?? perWeek[w.startISO]) ?? ''
                        const highlight = (() => {
                          const dateISO = (state as any).reportingDateISO as string | undefined
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
                            <input
                              type="number"
                              inputMode="decimal"
                              step="any"
                              aria-label={`${kr.name} plan for ${w.isoLabel}`}
                              value={value}
                              disabled={readOnly}
                              onClick={stopRowToggle}
                              onFocus={(event) => {
                                stopRowToggle(event)
                                setActiveKrId(kr.id)
                                setFocus(kr.id)
                                dispatch({ type: 'SET_GRID_FOCUSED_ROW', krId: kr.id })
                              }}
                              onChange={(e) => {
                                const next = Number(e.target.value)
                                if (Number.isNaN(next)) return
                                dispatch({ type: 'UPDATE_PLAN_DRAFT', krId: kr.id, weekKey: wk, value: next })
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
      {previewKrId && (
        <section style={{ marginTop: 24, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Waterfall preview</h3>
            {activeKr && <span className="muted" style={{ fontSize: 12 }}>{activeKr.name}</span>}
          </header>
          <WaterfallChart krId={previewKrId} height={320} />
        </section>
      )}
    </>
  )
}
