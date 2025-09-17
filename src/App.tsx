import React from 'react'
import { StoreProvider, useStore } from './state/store'
import { Setup } from './pages/Setup'
import { SetupArea } from './pages/SetupArea'
import { PlanGrid } from './components/PlanGrid'
import { LockBanner } from './components/LockBanner'
import { generateWeeks } from './utils/weeks'
import { ActualsGrid } from './components/ActualsGrid'
import { InitiativesGrid } from './components/InitiativesGrid'
import { NavigationSidebar } from './components/NavigationSidebar'
import { StatusBar } from './components/StatusBar'
import { Settings } from './pages/Settings'
import { filterKRsByView } from './utils/filtering'
import { WorksheetToggle } from './components/WorksheetToggle'

function AppInner() {
  const state = useStore(s => s)
  const [worksheetView, setWorksheetView] = React.useState<'plan' | 'actuals'>('actuals')

  const weeks = React.useMemo(() => {
    if (!state.period.startISO || !state.period.endISO) return []
    return generateWeeks(state.period.startISO, state.period.endISO)
  }, [state.period.startISO, state.period.endISO])

  // Apply theme on mount (Hybrid C/A is the only theme now)
  React.useEffect(() => {
    const cls = document.body.classList
    cls.remove('theme-contrast-a', 'theme-contrast-b', 'theme-contrast-c')
    cls.add('theme-contrast-ca')
  }, [])

  const filteredKRs = React.useMemo(
    () => filterKRsByView(state.krs, state.currentView, state),
    [state.krs, state.currentView, state]
  )

  // Reset to actuals view when phase changes
  React.useEffect(() => {
    if (state.phase === 'execution') {
      setWorksheetView('actuals');
    }
  }, [state.phase]);

  return (
    <div className="app-layout">
      <div style={{ display: 'flex', height: '100vh' }}>
        <NavigationSidebar />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <StatusBar />
          <div className="main-content" style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'grid', gap: 16 }}>
              {state.currentView?.level === 'settings' && (
                <Settings />
              )}

              {state.currentView?.level === 'setup' && (
                <div className="panel">
                  <div className="grid-actions">
                    <h2>Setup Area</h2>
                  </div>
                  <SetupArea />
                </div>
              )}

              {state.currentView?.level !== 'settings' && state.currentView?.level !== 'setup' && (
                <>
                  {(state.phase ?? 'planning') === 'planning' && (
                    <>
                      <Setup />
                      {weeks.length > 0 && filteredKRs.length > 0 && (
                        <div className="panel">
                          <div className="grid-actions">
                            <h2>Plan Builder</h2>
                            <LockBanner />
                          </div>
                          <PlanGrid weeks={weeks} filteredKRs={filteredKRs} />
                        </div>
                      )}
                    </>
                  )}

                  {(state.phase ?? 'planning') === 'execution' && weeks.length > 0 && filteredKRs.length > 0 && (
                    <div className="panel">
                      <div className="grid-actions">
                        <WorksheetToggle currentView={worksheetView} onViewChange={setWorksheetView} />
                        {!state.currentBaselineId && <div className="muted">Lock a baseline to enable editing</div>}
                      </div>
                      {worksheetView === 'plan' ? (
                        <PlanGrid weeks={weeks} filteredKRs={filteredKRs} />
                      ) : (
                        <ActualsGrid weeks={weeks} filteredKRs={filteredKRs} />
                      )}
                    </div>
                  )}
                </>
              )}

              {weeks.length > 0 && filteredKRs.length > 0 && (
                <div className="panel">
                  <div className="grid-actions">
                    <h2>Initiatives</h2>
                  </div>
                  {filteredKRs.map(kr => (
                    <InitiativesGrid key={kr.id} kr={kr} weeks={weeks} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
