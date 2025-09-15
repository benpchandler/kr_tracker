import React from 'react'
import { useDispatch, useStore } from '../state/store'
import { KeyResult, Initiative, InitiativeStatus } from '../models/types'
import { computeMetrics } from '../metrics/engine'
import { Sparkline } from './Sparkline'

type Week = { index: number; startISO: string; iso: string }

type Props = {
  kr: KeyResult
  weeks: Week[]
}

export function InitiativesGrid({ kr, weeks }: Props) {
  const state = useStore(s => s)
  const dispatch = useDispatch()
  const { initiatives } = useStore(s => ({ initiatives: s.initiatives.filter(i => i.krId === kr.id) }))
  const reportingISO = state.reportingDateISO
  const reportingWeek = React.useMemo(() => {
    if (!reportingISO) return undefined
    return weeks.find(w => {
      const start = new Date(w.startISO + 'T00:00:00Z')
      const end = new Date(start.getTime()); end.setUTCDate(end.getUTCDate()+6)
      const d = new Date(reportingISO + 'T00:00:00Z')
      return d >= start && d <= end
    })
  }, [weeks, reportingISO])

  const krMetrics = React.useMemo(() => computeMetrics(state, weeks).get(kr.id), [state, weeks, kr.id])

  let totalTarget = 0
  // Prefer structured goalStart/goalEnd when available for clearer target math
  if (typeof kr.goalStart === 'number' && typeof kr.goalEnd === 'number') {
    totalTarget = kr.goalEnd - kr.goalStart
  } else if (krMetrics && krMetrics.length > 0) {
    const firstWeekMetrics = krMetrics[0]
    const lastWeekMetrics = krMetrics[krMetrics.length - 1]
    if (kr.aggregation === 'cumulative') {
      totalTarget = (lastWeekMetrics.cumulativePlan ?? 0) - (firstWeekMetrics.cumulativePlan ?? 0)
    } else if (kr.aggregation === 'snapshot' || kr.aggregation === 'average') {
      totalTarget = (lastWeekMetrics.plan ?? 0) - (firstWeekMetrics.plan ?? 0)
    }
  }

  const sumOfInitiativeImpacts = initiatives.reduce((sum, i) => sum + i.impact, 0)
  const completionPct = totalTarget !== 0 ? (sumOfInitiativeImpacts / totalTarget) : 0

  const onAdd = () => {
    dispatch({ type: 'ADD_INITIATIVE', initiative: {
      id: `i-${Date.now()}`,
      krId: kr.id,
      name: 'New Initiative',
      impact: 0,
      confidence: 0.95,
      isPlaceholder: false,
    }})
  }

  return (
    <div className="panel">
      <h2>Initiatives for {kr.name}</h2>
      <div>
        Initiative Walk: {sumOfInitiativeImpacts.toFixed(2)} / {totalTarget.toFixed(2)} ({ (completionPct * 100).toFixed(0) }%) 
        {completionPct < 0.95 && totalTarget > 0 && (
          <span style={{ color: 'orange', marginLeft: '10px' }}> (Target 95% coverage)</span>
        )}
      </div>
      {reportingWeek && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Reporting week: {reportingWeek.iso}
        </div>
      )}
      <button onClick={onAdd}>Add Initiative</button>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            {reportingWeek && <th>Impact (last wk)</th>}
            {reportingWeek && <th>Impact (this wk)</th>}
            <th>Impact Trend</th>
            {reportingWeek && <th>Conf. (last wk)</th>}
            {reportingWeek && <th>Conf. (this wk)</th>}
            <th>Confidence Trend</th>
            <th>Status</th>
            <th>Placeholder</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {initiatives.map(i => <InitiativeRow key={i.id} initiative={i} reportingWeek={reportingWeek} />)}
        </tbody>
      </table>
    </div>
  )
}

function InitiativeRow({ initiative, reportingWeek }: { initiative: Initiative; reportingWeek?: Week }) {
  const dispatch = useDispatch()
  const [name, setName] = React.useState(initiative.name)
  // Overall impact/confidence considered planning-time; omit from execution UI
  const [isPlaceholder, setIsPlaceholder] = React.useState(initiative.isPlaceholder)
  const [status, setStatus] = React.useState<InitiativeStatus>(initiative.status || 'on_track')
  const state = useStore(s => s)
  const weekKey = reportingWeek?.iso || reportingWeek?.startISO
  const weekly = weekKey ? (state.initiativeWeekly?.[initiative.id]?.[weekKey] || {}) : undefined
  const meta = weekKey ? (state.initiativeWeeklyMeta?.[initiative.id]?.[weekKey] || {}) : undefined
  const [wkImpact, setWkImpact] = React.useState<number | undefined>(weekly?.impact)
  const [wkConf, setWkConf] = React.useState<number | undefined>(weekly?.confidence)
  // compute last week key
  const lastWeekKey = React.useMemo(() => {
    if (!reportingWeek) return undefined
    // naive: previous index is reportingWeek.index - 1; we don't have index, but weeks array not here. Instead, we can derive by date: 7 days prior.
    try {
      const d = new Date((reportingWeek.startISO || reportingWeek.iso) + 'T00:00:00Z')
      d.setUTCDate(d.getUTCDate() - 7)
      const iso = d.toISOString().slice(0,10)
      return iso
    } catch { return undefined }
  }, [reportingWeek])
  const lastWeekly = lastWeekKey ? (state.initiativeWeekly?.[initiative.id]?.[lastWeekKey] || {}) : {}

  // Build trend series across known weeks in state.period range if available via utils? fallback to keys present
  const trendWeeks = React.useMemo(() => {
    const map = state.initiativeWeekly?.[initiative.id] || {}
    const keys = Object.keys(map).sort()
    return keys
  }, [state.initiativeWeekly, initiative.id])
  const impactSeries = trendWeeks.map(k => state.initiativeWeekly?.[initiative.id]?.[k]?.impact)
  const confSeries = trendWeeks.map(k => state.initiativeWeekly?.[initiative.id]?.[k]?.confidence)

  const onSave = () => {
    dispatch({ type: 'UPDATE_INITIATIVE', initiative: { ...initiative, name, impact: initiative.impact, confidence: initiative.confidence, isPlaceholder, status } })
  }

  const onDelete = () => {
    dispatch({ type: 'DELETE_INITIATIVE', initiativeId: initiative.id })
  }

  return (
    <tr>
      <td><input type="text" value={name} onChange={e => setName(e.target.value)} /></td>
      {reportingWeek && (
        <>
          <td className="muted">{lastWeekly.impact ?? '—'}</td>
          <td>
            <input type="number" step="any" value={wkImpact ?? ''} onChange={e => setWkImpact(e.target.value === '' ? undefined : Number(e.target.value))} />
          </td>
        </>
      )}
      <td>
        <div title="Impact trend">
          <Sparkline width={120} height={32} actual={impactSeries} plan={[]} />
        </div>
      </td>
      {reportingWeek && (
        <>
          <td className="muted">{lastWeekly.confidence ?? '—'}</td>
          <td>
            <input type="number" min="0" max="1" step="0.05" value={wkConf ?? ''} onChange={e => setWkConf(e.target.value === '' ? undefined : Number(e.target.value))} />
            {meta?.at && <div className="muted" style={{ fontSize: 11 }}>Updated {new Date(meta.at).toLocaleString()} {meta.by ? `by ${meta.by}` : ''}</div>}
          </td>
        </>
      )}
      <td>
        <div title="Confidence trend">
          <Sparkline width={120} height={32} actual={confSeries} plan={[]} />
        </div>
      </td>
      <td>
        <select value={status} onChange={e => setStatus(e.target.value as InitiativeStatus)}>
          <option value="on_track">On Track</option>
          <option value="at_risk">At Risk</option>
          <option value="blocked">Blocked</option>
          <option value="needs_decision">Needs Decision</option>
          <option value="needs_support">Needs Support</option>
        </select>
      </td>
      <td><input type="checkbox" checked={isPlaceholder} onChange={e => setIsPlaceholder(e.target.checked)} /></td>
      <td>
        <button onClick={onSave}>Save</button>
        {reportingWeek && <button onClick={() => {
          if (!weekKey) return
          const patch: any = {}
          if (wkImpact !== undefined) patch.impact = wkImpact
          if (wkConf !== undefined) patch.confidence = wkConf
          dispatch({ type: 'UPDATE_INITIATIVE_WEEKLY', initiativeId: initiative.id, weekKey, patch })
        }}>Save This Week</button>}
        <button onClick={onDelete}>Delete</button>
      </td>
    </tr>
  )
}
