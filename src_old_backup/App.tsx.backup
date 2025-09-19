import React from 'react'
import { StoreProvider, useStore } from './state/store'
import { Setup } from './pages/Setup'
import { SetupArea } from './pages/SetupArea'
import { PlanGrid } from './components/PlanGrid'
import { LockBanner } from './components/LockBanner'
import { generateWeeks } from './utils/weeks'
import { ActualsGrid } from './components/ActualsGrid'
import { InitiativesGrid } from './components/InitiativesGrid'
import { UnifiedNavigation, UnifiedNavigationToggle } from './components/UnifiedNavigation'
import { ContextBar } from './components/ContextBar'
import { StatusBar } from './components/StatusBar'
import { Settings } from './pages/Settings'
import { filterKRsByView } from './utils/filtering'
import { WorksheetToggle } from './components/WorksheetToggle'
import { AppHeader } from './components/AppHeader'
import { PlanModeDashboard } from './components/PlanModeDashboard'

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

  const isPlanningPhase = (state.phase ?? 'planning') === 'planning'
  const isExecutionPhase = (state.phase ?? 'planning') === 'execution'
  const wizardState = state.ui?.wizard
  const wizardCompleted = Boolean(wizardState?.completedAt)
  const shouldShowPlanBuilder = isPlanningPhase && weeks.length > 0 && (filteredKRs.length > 0 || wizardCompleted)

  // Reset to actuals view when phase changes
  React.useEffect(() => {
    if (state.phase === 'execution') {
      setWorksheetView('actuals')
    }
  }, [state.phase])

  // Determine current mode based on baseline lock status
  const isExecutionMode = !!state.currentBaselineId
  const showNewDesign = true // Feature flag for new design

  if (showNewDesign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        {!isExecutionMode ? (
          <PlanModeDashboard />
        ) : (
          <div className="px-6 py-8">
            {/* Execution Mode Content */}
            {weeks.length > 0 && filteredKRs.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="mb-4">
                  <WorksheetToggle currentView={worksheetView} onViewChange={setWorksheetView} />
                </div>
                {worksheetView === 'plan' ? (
                  <PlanGrid weeks={weeks} filteredKRs={filteredKRs} />
                ) : (
                  <ActualsGrid weeks={weeks} filteredKRs={filteredKRs} />
                )}
              </div>
            )}

            {/* Initiatives Section */}
            {weeks.length > 0 && filteredKRs.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Initiatives</h2>
                {filteredKRs.map(kr => (
                  <InitiativesGrid key={kr.id} kr={kr} weeks={weeks} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Legacy layout (fallback)
  return (
    <div className="app-shell">
      <UnifiedNavigation />
      <div className="app-shell__main" data-app-shell-main>
        <div className="app-shell__mobile-header">
          <div className="app-shell__mobile-header-inner">
            <UnifiedNavigationToggle className="navigation-toggle" />
            <span className="app-shell__mobile-title">KR Tracker</span>
          </div>
        </div>
        <StatusBar />
        <ContextBar />
        <main className="app-shell__content" data-app-shell-main-content>
          <div className="app-shell__content-inner">
            {state.currentView?.level === 'settings' && <Settings />}

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
                {isPlanningPhase && (
                  <>
                    <Setup />
                    {shouldShowPlanBuilder && (
                      <div className="panel" data-plan-builder-panel>
                        <div className="grid-actions">
                          <h2>Plan Builder</h2>
                          <LockBanner />
                        </div>
                        {filteredKRs.length > 0 ? (
                          <PlanGrid weeks={weeks} filteredKRs={filteredKRs} />
                        ) : (
                          <div className="muted" style={{ padding: '16px 0' }}>
                            Add a key result to start planning.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {isExecutionPhase && weeks.length > 0 && filteredKRs.length > 0 && (
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
        </main>
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
