import React from 'react'
import { useStore } from '../state/store'
import { summarizeMetrics } from '../metrics/engine'
import { Sparkline } from './Sparkline'
import { KeyResult } from '../models/types'

type Week = { index: number; startISO: string; iso: string }

export function KrRowKpis({ weeks, filteredKRs }: { weeks: Week[]; filteredKRs?: KeyResult[] }) {
  const state = useStore(s => s)
  const summaries = React.useMemo(() => summarizeMetrics(state, weeks), [state, weeks])
  
  // Use filtered KRs if provided, otherwise use all KRs
  const krs = filteredKRs || state.krs

  return (
    <div className="list">
      {krs.map(kr => {
        const s = summaries.find(x => x.krId === kr.id)
        const pacePct = s?.latestPacePct !== undefined ? Math.round(s.latestPacePct * 100) : undefined
        const variance = s?.latestVariance
        const team = kr.teamId ? state.teams.find(t => t.id === kr.teamId)?.name : undefined
        const pod = kr.podId ? state.pods.find(p => p.id === kr.podId)?.name : undefined
        const unitSuffix = kr.unit === 'percent' ? ' (%)' : (kr.unit === 'currency' ? ' ($)' : '')
        const statusLabel = (() => {
          const s = (kr as any).status as ('on_track'|'at_risk'|'off_track'|'deprioritized'|undefined)
          if (!s) return undefined
          return s === 'on_track' ? 'On Track' : s === 'at_risk' ? 'At Risk' : s === 'off_track' ? 'Off Track' : 'Deprioritized'
        })()
        const statusClass = (() => {
          const s = (kr as any).status as ('on_track'|'at_risk'|'off_track'|'deprioritized'|undefined)
          if (!s) return undefined
          return s === 'on_track' ? 'green' : s === 'at_risk' ? 'yellow' : s === 'off_track' ? 'red' : 'grey'
        })()
        return (
          <div key={kr.id} className="list-item" style={{ alignItems: 'center' }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <div><strong>{kr.name}</strong></div>
              {/* Team / Pod moved just below title and above goal */}
              <div className="muted" style={{ fontSize: 12 }}>
                {team ? team : ''}{team && pod ? ' / ' : ''}{pod ? pod : ''}
                {!state.objectives.find(o => o.id === kr.objectiveId) && <span className="badge unmapped" style={{ marginLeft: 8 }} title="No objective mapped">Unmapped</span>}
              </div>
              {(typeof kr.goalStart === 'number' || typeof kr.goalEnd === 'number') && (
                <div className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="badge accent">🎯 Goal: {typeof kr.goalStart === 'number' ? kr.goalStart : '—'} → {typeof kr.goalEnd === 'number' ? kr.goalEnd : '—'}{unitSuffix}</span>
                  {/* integrate aggregation label on same line for space efficiency */}
                  <span>{kr.aggregation}</span>
                </div>
              )}
              <div className="row" style={{ gap: 8 }}>
                <div className="badge" title="Weekly variance (actual - plan)">Δ {variance !== undefined ? variance.toFixed(2) : '—'}</div>
                <div className="badge" title="Pace to date">Pace {pacePct !== undefined ? `${pacePct}%` : '—'}</div>
                {statusLabel && <div className={`badge ${statusClass}`}>{statusLabel}</div>}
              </div>
            </div>
            <div>
              <Sparkline plan={s?.series.plan || []} actual={s?.series.actual || []} />
            </div>
          </div>
        )
      })}
      {state.krs.length === 0 && <div className="muted">Add at least one KR.</div>}
    </div>
  )
}
