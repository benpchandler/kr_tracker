import React from 'react'
import { useDispatch, useStore } from '../state/store'
import { generateWeeks } from '../utils/weeks'
import { SCENARIO_OPTIONS, buildScenario } from '../lib/testScenarios'

export function Settings() {
  const state = useStore(s => s)
  const dispatch = useDispatch()

  const [phase, setPhase] = React.useState(state.phase || 'planning')
  const [reportingWeek, setReportingWeek] = React.useState(state.reportingDateISO || '')
  // Force Hybrid C/A; remove other theme options
  const [userName, setUserName] = React.useState<string>(() => {
    try { return localStorage.getItem('kr-user-name') || '' } catch { return '' }
  })

  const weeks = React.useMemo(() => {
    if (!state.period.startISO || !state.period.endISO) return []
    return generateWeeks(state.period.startISO, state.period.endISO)
  }, [state.period.startISO, state.period.endISO])

  function savePhase(p: 'planning' | 'execution') {
    setPhase(p)
    dispatch({ type: 'SET_PHASE', phase: p })
  }

  function saveReportingWeek(weekStartISO: string) {
    setReportingWeek(weekStartISO)
    dispatch({ type: 'SET_REPORTING_DATE', dateISO: weekStartISO })
  }

  function saveUserName(name: string) {
    setUserName(name)
    try { localStorage.setItem('kr-user-name', name) } catch {}
  }

  return (
    <div className="panel" style={{ display: 'grid', gap: 16 }}>
      <h2>Settings</h2>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Phase</div>
        <div className="row" style={{ gap: 8 }}>
          <button className={phase === 'planning' ? 'primary' : ''} onClick={() => savePhase('planning')}>Planning</button>
          <button className={phase === 'execution' ? 'primary' : ''} onClick={() => savePhase('execution')}>Execution</button>
        </div>
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>Locking a plan automatically switches to Execution.</div>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Reporting week</div>
        <div className="row" style={{ gap: 8 }}>
          <select
            value={reportingWeek}
            onChange={(e) => saveReportingWeek(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)' }}
          >
            <option value="">Select a week...</option>
            {weeks.map(w => (
              <option key={w.iso} value={w.startISO}>
                {w.iso} — {w.dateLabel}
              </option>
            ))}
          </select>
        </div>
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>We highlight this week's column in Plan & Actuals for quick entry.</div>
        {reportingWeek && (
          <div style={{ marginTop: 8 }}>
            <span className="muted" style={{ fontSize: 12 }}>Current: </span>
            <span style={{
              fontWeight: 600,
              fontSize: 12,
              background: 'var(--highlight)',
              padding: '2px 6px',
              borderRadius: 4
            }}>
              {weeks.find(w => w.startISO === reportingWeek)?.iso || reportingWeek}
            </span>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Theme</div>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">Using Hybrid C/A</span>
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Display name</div>
        <div className="row" style={{ gap: 8 }}>
          <input type="text" placeholder="Your name (used in update history)" value={userName} onChange={(e) => saveUserName(e.target.value)} />
        </div>
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>We tag plan/actuals updates with this name for recency chips.</div>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Period</div>
        <div className="row" style={{ gap: 8 }}>
          <div className="muted" style={{ fontSize: 12 }}>Weeks in current period: {weeks.length}</div>
        </div>
      </div>

      {/* Test Scenarios (dev-only helper to seed deterministic states) */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Test Scenarios</div>
        <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            defaultValue=""
            onChange={(e) => {
              const key = e.target.value as any
              if (!key) return
              const next = buildScenario(state, key)
              if (confirm('Load selected scenario and replace current data?')) {
                dispatch({ type: 'IMPORT_STATE', state: next })
              }
            }}
            style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)' }}
            title="Replace data with a deterministic scenario"
          >
            <option value="">Select a scenario…</option>
            {SCENARIO_OPTIONS.map(s => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>
          <span className="muted" style={{ fontSize: 12 }}>
            {`Loads preset plan/actuals; persists to localStorage.`}
          </span>
        </div>
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          Scenarios overwrite current data. Export first if you want a backup.
        </div>
      </div>
    </div>
  )
}
