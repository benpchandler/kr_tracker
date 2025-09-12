import React from 'react'
import { useStore } from '../state/store'
import { summarizeMetrics } from '../metrics/engine'
import { Sparkline } from './Sparkline'

type Week = { index: number; startISO: string; iso: string }

export function KrRowKpis({ weeks }: { weeks: Week[] }) {
  const state = useStore(s => s)
  const summaries = React.useMemo(() => summarizeMetrics(state, weeks), [state, weeks])

  return (
    <div className="list">
      {state.krs.map(kr => {
        const s = summaries.find(x => x.krId === kr.id)
        const pacePct = s?.latestPacePct !== undefined ? Math.round(s.latestPacePct * 100) : undefined
        const variance = s?.latestVariance
        const health = s?.health
        return (
          <div key={kr.id} className="list-item" style={{ alignItems: 'center' }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <div><strong>{kr.name}</strong></div>
              <div className="muted" style={{ fontSize: 12 }}>{kr.aggregation} • {kr.unit}</div>
              <div className="row" style={{ gap: 8 }}>
                <div className="badge" title="Weekly variance (actual - plan)">Δ {variance !== undefined ? variance.toFixed(2) : '—'}</div>
                <div className="badge" title="Pace to date">Pace {pacePct !== undefined ? `${pacePct}%` : '—'}</div>
                {health && <div className={`badge ${health}`}>Health {health}</div>}
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
