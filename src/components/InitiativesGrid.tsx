import React from 'react'
import { useDispatch, useStore } from '../state/store'
import { KeyResult, Initiative } from '../models/types'
import { computeMetrics } from '../metrics/engine'

type Week = { index: number; startISO: string; iso: string }

type Props = {
  kr: KeyResult
  weeks: Week[]
}

export function InitiativesGrid({ kr, weeks }: Props) {
  const state = useStore(s => s)
  const dispatch = useDispatch()
  const { initiatives } = useStore(s => ({ initiatives: s.initiatives.filter(i => i.krId === kr.id) }))

  const krMetrics = React.useMemo(() => computeMetrics(state, weeks).get(kr.id), [state, weeks, kr.id])

  let totalTarget = 0
  if (krMetrics && krMetrics.length > 0) {
    const firstWeekMetrics = krMetrics[0]
    const lastWeekMetrics = krMetrics[krMetrics.length - 1]

    if (kr.aggregation === 'cumulative') {
      totalTarget = (lastWeekMetrics.cumulativePlan ?? 0) - (firstWeekMetrics.cumulativePlan ?? 0)
    } else if (kr.aggregation === 'snapshot' || kr.aggregation === 'average') {
      totalTarget = (lastWeekMetrics.plan ?? 0) - (firstWeekMetrics.plan ?? 0)
    }
  }

  const sumOfInitiativeImpacts = initiatives.reduce((sum, i) => sum + i.impact, 0)
  const completionPct = totalTarget > 0 ? (sumOfInitiativeImpacts / totalTarget) : 0

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
      <button onClick={onAdd}>Add Initiative</button>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Impact</th>
            <th>Confidence</th>
            <th>Placeholder</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {initiatives.map(i => <InitiativeRow key={i.id} initiative={i} />)}
        </tbody>
      </table>
    </div>
  )
}

function InitiativeRow({ initiative }: { initiative: Initiative }) {
  const dispatch = useDispatch()
  const [name, setName] = React.useState(initiative.name)
  const [impact, setImpact] = React.useState(initiative.impact)
  const [confidence, setConfidence] = React.useState(initiative.confidence)
  const [isPlaceholder, setIsPlaceholder] = React.useState(initiative.isPlaceholder)

  const onSave = () => {
    dispatch({ type: 'UPDATE_INITIATIVE', initiative: { ...initiative, name, impact, confidence, isPlaceholder } })
  }

  const onDelete = () => {
    dispatch({ type: 'DELETE_INITIATIVE', initiativeId: initiative.id })
  }

  return (
    <tr>
      <td><input type="text" value={name} onChange={e => setName(e.target.value)} /></td>
      <td><input type="number" value={impact} onChange={e => setImpact(Number(e.target.value))} /></td>
      <td><input type="number" min="0" max="1" step="0.05" value={confidence} onChange={e => setConfidence(Number(e.target.value))} /></td>
      <td><input type="checkbox" checked={isPlaceholder} onChange={e => setIsPlaceholder(e.target.checked)} /></td>
      <td>
        <button onClick={onSave}>Save</button>
        <button onClick={onDelete}>Delete</button>
      </td>
    </tr>
  )
}