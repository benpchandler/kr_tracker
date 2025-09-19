import React from 'react'
import { useDispatch, useStore } from '../state/store'

export function LockBanner() {
  const dispatch = useDispatch()
  const baseline = useStore(s => s.baselines.find(b => b.id === s.currentBaselineId))
  const [name, setName] = React.useState('')

  if (baseline) {
    const when = new Date(baseline.lockedAt).toLocaleString()
    return (
      <div className="badge green" title={`Version ${baseline.version}`}>
        Baseline v{baseline.version} • locked {when} by {baseline.lockedBy}
      </div>
    )
  }

  return (
    <div className="row" style={{ gap: 8 }}>
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        className="primary"
        onClick={() => dispatch({ type: 'LOCK_PLAN', lockedBy: name || 'user' })}
        title="Locks the current draft plan as baseline"
      >
        Lock Plan
      </button>
    </div>
  )
}

