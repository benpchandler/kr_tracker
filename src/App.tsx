import React from 'react'
import { StoreProvider, useStore } from './state/store'
import { Setup } from './pages/Setup'
import { PlanGrid } from './components/PlanGrid'
import { LockBanner } from './components/LockBanner'
import { generateWeeks } from './utils/weeks'
import { ActualsGrid } from './components/ActualsGrid'
import { KrRowKpis } from './components/KrRowKpis'
import { InitiativesGrid } from './components/InitiativesGrid'

function AppInner() {
  const state = useStore(s => s)
  const weeks = React.useMemo(() => {
    if (!state.period.startISO || !state.period.endISO) return []
    return generateWeeks(state.period.startISO, state.period.endISO)
  }, [state.period.startISO, state.period.endISO])

  return (
    <div className="container">
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="panel">
          <h1>KR Tracker — MVP</h1>
          <div className="muted">Define period, add KRs, set a weekly plan, then lock it.</div>
        </div>

        <Setup />

        {weeks.length > 0 && state.krs.length > 0 && (
          <div className="panel">
            <div className="grid-actions">
              <h2>Plan Builder</h2>
              <LockBanner />
            </div>
            <PlanGrid weeks={weeks} />
          </div>
        )}

        {weeks.length > 0 && state.krs.length > 0 && (
          <div className="panel">
            <div className="grid-actions">
              <h2>Actuals</h2>
              {!state.currentBaselineId && <div className="muted">Lock a baseline to enable editing</div>}
            </div>
            <ActualsGrid weeks={weeks} />
          </div>
        )}

        {weeks.length > 0 && state.krs.length > 0 && (
          <div className="panel">
            <div className="grid-actions">
              <h2>Metrics</h2>
            </div>
            <KrRowKpis weeks={weeks} />
          </div>
        )}

        {weeks.length > 0 && state.krs.length > 0 && (
          <div className="panel">
            <div className="grid-actions">
              <h2>Initiatives</h2>
            </div>
            {state.krs.map(kr => (
              <InitiativesGrid key={kr.id} kr={kr} weeks={weeks} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  )
}
