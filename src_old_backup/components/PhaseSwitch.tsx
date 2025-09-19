import React from 'react'
import { useDispatch, useStore } from '../state/store'

export function PhaseSwitch() {
  const state = useStore(s => s)
  const dispatch = useDispatch()
  const phase = state.phase || 'planning'
  const hasBaseline = Boolean(state.currentBaselineId)

  return (
    <div className="row" style={{ gap: 8 }}>
      <button
        className={phase === 'planning' ? 'primary' : ''}
        onClick={() => dispatch({ type: 'SET_PHASE', phase: 'planning' })}
      >Planning</button>
      <button
        className={phase === 'execution' ? 'primary' : ''}
        onClick={() => dispatch({ type: 'SET_PHASE', phase: 'execution' })}
        title={hasBaseline ? '' : 'Execution works best after locking a baseline'}
      >Execution</button>
    </div>
  )
}
