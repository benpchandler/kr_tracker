import React from 'react'
import { useStore, useDispatch } from '../state/store'
import { OrganizationStructure } from '../components/OrganizationStructure'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Grid, Col, Metric, Text, Card as TremorCard } from '@tremor/react'

type SetupSection = 'overview' | 'organization' | 'krs' | 'initiatives' | 'data'

// PIN protection component
function PinProtection({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = React.useState('')
  const [error, setError] = React.useState(false)

  // In production, this would be hashed and stored securely
  const SETUP_PIN = '1234' // Default PIN for MVP

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === SETUP_PIN) {
      sessionStorage.setItem('setup-authenticated', 'true')
      onSuccess()
    } else {
      setError(true)
      setPin('')
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg)'
    }}>
      <div className="panel" style={{ maxWidth: 400, width: '100%', margin: 20 }}>
        <h2 style={{ marginBottom: 24 }}>Setup Area</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          This area contains sensitive configuration. Please enter the setup PIN to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={{ width: '100%', marginBottom: 12 }}
            autoFocus
          />
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>
              Incorrect PIN. Please try again.
            </div>
          )}
          <button type="submit" style={{ width: '100%' }}>
            Access Setup
          </button>
        </form>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
          Default PIN: 1234 (change in production)
        </div>
      </div>
    </div>
  )
}

// Main setup area with navigation
export function SetupArea() {
  const state = useStore(s => s)
  const dispatch = useDispatch()
  // PIN protection disabled for development
  // const [authenticated, setAuthenticated] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState<SetupSection>('overview')

  // PIN protection disabled for development
  // React.useEffect(() => {
  //   const isAuth = sessionStorage.getItem('setup-authenticated') === 'true'
  //   setAuthenticated(isAuth)
  // }, [])

  // if (!authenticated) {
  //   return <PinProtection onSuccess={() => setAuthenticated(true)} />
  // }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar Navigation */}
      <div style={{
        width: 240,
        background: 'var(--panel)',
        borderRight: '1px solid var(--border)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0 }}>Setup Area</h3>
          <button
            onClick={() => {
              window.location.href = '/'
            }}
            style={{
              marginTop: 8,
              fontSize: 12,
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid var(--border)'
            }}
          >
            ← Back to App
          </button>
        </div>

        <button
          className={`setup-nav-item ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
          style={{
            textAlign: 'left',
            padding: '8px 12px',
            background: activeSection === 'overview' ? 'var(--accent-50)' : 'transparent',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          📊 Overview
        </button>

        <button
          className={`setup-nav-item ${activeSection === 'organization' ? 'active' : ''}`}
          onClick={() => setActiveSection('organization')}
          style={{
            textAlign: 'left',
            padding: '8px 12px',
            background: activeSection === 'organization' ? 'var(--accent-50)' : 'transparent',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          🏢 Organization Structure
        </button>

        <button
          className={`setup-nav-item ${activeSection === 'krs' ? 'active' : ''}`}
          onClick={() => setActiveSection('krs')}
          style={{
            textAlign: 'left',
            padding: '8px 12px',
            background: activeSection === 'krs' ? 'var(--accent-50)' : 'transparent',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          🎯 Key Results
        </button>

        <button
          className={`setup-nav-item ${activeSection === 'initiatives' ? 'active' : ''}`}
          onClick={() => setActiveSection('initiatives')}
          style={{
            textAlign: 'left',
            padding: '8px 12px',
            background: activeSection === 'initiatives' ? 'var(--accent-50)' : 'transparent',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          🚀 Initiatives
        </button>

        <button
          className={`setup-nav-item ${activeSection === 'data' ? 'active' : ''}`}
          onClick={() => setActiveSection('data')}
          style={{
            textAlign: 'left',
            padding: '8px 12px',
            background: activeSection === 'data' ? 'var(--accent-50)' : 'transparent',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          💾 Data Management
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div className="panel" style={{ maxWidth: 1200, margin: '0 auto' }}>
          {activeSection === 'overview' && <SetupOverview />}
          {activeSection === 'organization' && <OrganizationSetup />}
          {activeSection === 'krs' && <KRSetup />}
          {activeSection === 'initiatives' && <InitiativeSetup />}
          {activeSection === 'data' && <DataManagement />}
        </div>
      </div>
    </div>
  )
}

// Overview section
function SetupOverview() {
  const state = useStore(s => s)

  return (
    <div>
      <h2>Setup Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 24 }}>
        <div className="stat-card" style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 8 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Period</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {state.period.startISO && state.period.endISO
              ? `${state.period.startISO} → ${state.period.endISO}`
              : 'Not configured'}
          </div>
        </div>

        <div className="stat-card" style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 8 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Teams</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{state.teams.length}</div>
        </div>

        <div className="stat-card" style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 8 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>People</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{state.individuals.length}</div>
        </div>

        <div className="stat-card" style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 8 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Objectives</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{state.objectives.length}</div>
        </div>

        <div className="stat-card" style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 8 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Key Results</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{state.krs.length}</div>
        </div>

        <div className="stat-card" style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 8 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Initiatives</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{state.initiatives.length}</div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>Quick Actions</h3>
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <div style={{ padding: 12, background: 'var(--panel-2)', borderRadius: 8 }}>
            ✅ Period configured
          </div>
          <div style={{ padding: 12, background: 'var(--panel-2)', borderRadius: 8 }}>
            ✅ {state.teams.length} teams created
          </div>
          <div style={{ padding: 12, background: 'var(--panel-2)', borderRadius: 8 }}>
            {state.krs.length > 0 ? '✅' : '⚠️'} {state.krs.length} Key Results defined
          </div>
          <div style={{ padding: 12, background: state.currentBaselineId ? 'var(--success-50)' : 'var(--warning-50)', borderRadius: 8 }}>
            {state.currentBaselineId ? '✅ Baseline locked' : '⚠️ No baseline locked'}
          </div>
        </div>
      </div>
    </div>
  )
}

// Organization Structure section
function OrganizationSetup() {
  return <OrganizationStructure />
}

// KR Configuration section
function KRSetup() {
  const state = useStore(s => s)

  return (
    <div>
      <h2>Key Results Configuration</h2>
      <p className="muted">Define KRs with descriptions, SQL queries, and ownership.</p>

      <div style={{ marginTop: 24 }}>
        {state.krs.map(kr => (
          <div key={kr.id} style={{
            padding: 16,
            marginBottom: 12,
            background: 'var(--panel-2)',
            borderRadius: 8,
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h4 style={{ margin: 0 }}>{kr.name}</h4>
                <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                  {kr.unit} • {kr.aggregation}
                  {kr.goalStart !== undefined && kr.goalEnd !== undefined &&
                    ` • Goal: ${kr.goalStart} → ${kr.goalEnd}`}
                </div>
              </div>
              <button style={{ padding: '4px 12px', fontSize: 14 }}>
                Configure
              </button>
            </div>

            {/* Expandable section for SQL query, description, etc. */}
          </div>
        ))}
      </div>
    </div>
  )
}

// Initiative Setup section
function InitiativeSetup() {
  const state = useStore(s => s)

  return (
    <div>
      <h2>Initiative Configuration</h2>
      <p className="muted">Link PRDs, designs, and experiments to initiatives.</p>

      <div style={{ marginTop: 24 }}>
        {state.initiatives.map(init => (
          <div key={init.id} style={{
            padding: 16,
            marginBottom: 12,
            background: 'var(--panel-2)',
            borderRadius: 8,
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h4 style={{ margin: 0 }}>{init.name}</h4>
                <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                  Impact: {init.impact} • Confidence: {init.confidence}%
                </div>
              </div>
              <button style={{ padding: '4px 12px', fontSize: 14 }}>
                Add Links
              </button>
            </div>

            {/* Expandable section for document links, CURIEs, etc. */}
          </div>
        ))}
      </div>
    </div>
  )
}

// Data Management section
function DataManagement() {
  const state = useStore(s => s)
  const dispatch = useDispatch()

  return (
    <div>
      <h2>Data Management</h2>
      <p className="muted">Import, export, and manage your KR Tracker data.</p>

      <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        <div style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 8 }}>
          <h3>Export Data</h3>
          <p className="muted" style={{ fontSize: 14 }}>
            Download a backup of all your data.
          </p>
          <button onClick={() => {
            const dataStr = JSON.stringify(state, null, 2)
            const blob = new Blob([dataStr], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `kr-tracker-${new Date().toISOString().split('T')[0]}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}>
            Export JSON
          </button>
        </div>

        <div style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 8 }}>
          <h3>Import Data</h3>
          <p className="muted" style={{ fontSize: 14 }}>
            Restore from a previous export.
          </p>
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = (event) => {
                try {
                  const data = JSON.parse(event.target?.result as string)
                  if (confirm('Replace all current data?')) {
                    dispatch({ type: 'IMPORT_STATE', state: data })
                  }
                } catch {
                  alert('Invalid JSON file')
                }
              }
              reader.readAsText(file)
            }}
          />
        </div>
      </div>
    </div>
  )
}