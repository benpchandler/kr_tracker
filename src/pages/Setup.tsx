import React from 'react'
import { STORAGE_KEY, LEGACY_STORAGE_KEYS } from '../config'
import { useDispatch, useStore } from '../state/store'
import type { Aggregation, Unit, ID, KrStatus } from '../models/types'
import { generateWeeks } from '../utils/weeks'
import { TeamAdder } from './TeamAdder'

type SetupTab = 'organization' | 'objectives' | 'krs' | 'data'

export function Setup() {
  const state = useStore(s => s)
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = React.useState<SetupTab>('organization')

  const view = state.currentView
  const viewLevel = view?.level
  const viewTeamId = viewLevel === 'team' ? view?.targetId : (viewLevel === 'pod' ? state.pods.find(p => p.id === view?.targetId)?.teamId : undefined)
  const viewPodId = viewLevel === 'pod' ? view?.targetId : undefined

  const [objName, setObjName] = React.useState('')
  const [objTeamsEditing, setObjTeamsEditing] = React.useState<string | null>(null)
  const [objTeamsSel, setObjTeamsSel] = React.useState<Record<ID, boolean>>({})
  const [krName, setKrName] = React.useState('')
  const [krUnit, setKrUnit] = React.useState<Unit>('count')
  const [krAgg, setKrAgg] = React.useState<Aggregation>('cumulative')
  const [krObj, setKrObj] = React.useState<string>('')
  const [krTeam, setKrTeam] = React.useState<string>('')
  const [krPod, setKrPod] = React.useState<string>('')
  const [krDri, setKrDri] = React.useState<string>('')
  const [krStart, setKrStart] = React.useState<string>('')
  const [krEnd, setKrEnd] = React.useState<string>('')
  const [krStatus, setKrStatus] = React.useState<KrStatus>('on_track')
  const [seedPlanFromGoals, setSeedPlanFromGoals] = React.useState<boolean>(true)

  // When scoping to a team/pod, pre-select and lock the team/pod for KR creation
  React.useEffect(() => {
    if (viewTeamId) setKrTeam(viewTeamId)
    if (viewPodId) setKrPod(viewPodId)
    if (!viewTeamId) setKrTeam('')
    if (!viewPodId) setKrPod('')
  }, [viewTeamId, viewPodId])

  const hasPeriod = Boolean(state.period.startISO && state.period.endISO)

  // Calculate stats for the overview
  const stats = {
    teams: state.teams.length,
    objectives: state.objectives.length,
    krs: state.krs.length,
    individuals: state.individuals.length,
    pods: state.pods.length,
    initiatives: state.initiatives.length,
  }

  return (
    <div className="panel" style={{ display: 'grid', gap: 24 }}>
      {/* Setup Header with Stats */}
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
        <h2 style={{ marginBottom: 8 }}>Setup & Configuration</h2>
        <div className="row" style={{ gap: 24, flexWrap: 'wrap' }}>
          <div className="stat-item">
            <span className="muted" style={{ fontSize: 12 }}>Period</span>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {hasPeriod ? `${state.period.startISO} to ${state.period.endISO}` : 'Not set'}
            </div>
          </div>
          <div className="stat-item">
            <span className="muted" style={{ fontSize: 12 }}>Teams</span>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{stats.teams}</div>
          </div>
          <div className="stat-item">
            <span className="muted" style={{ fontSize: 12 }}>Objectives</span>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{stats.objectives}</div>
          </div>
          <div className="stat-item">
            <span className="muted" style={{ fontSize: 12 }}>Key Results</span>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{stats.krs}</div>
          </div>
          <div className="stat-item">
            <span className="muted" style={{ fontSize: 12 }}>People</span>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{stats.individuals}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation" style={{ display: 'flex', gap: 8, borderBottom: '2px solid var(--border-color)', marginBottom: 16 }}>
        <button
          className={`tab-button ${activeTab === 'organization' ? 'active' : ''}`}
          onClick={() => setActiveTab('organization')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'organization' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'organization' ? 'white' : 'inherit',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'organization' ? 600 : 400,
          }}
        >
          Organization
        </button>
        <button
          className={`tab-button ${activeTab === 'objectives' ? 'active' : ''}`}
          onClick={() => setActiveTab('objectives')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'objectives' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'objectives' ? 'white' : 'inherit',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'objectives' ? 600 : 400,
          }}
        >
          Objectives
        </button>
        <button
          className={`tab-button ${activeTab === 'krs' ? 'active' : ''}`}
          onClick={() => setActiveTab('krs')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'krs' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'krs' ? 'white' : 'inherit',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'krs' ? 600 : 400,
          }}
        >
          Key Results
        </button>
        <button
          className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'data' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'data' ? 'white' : 'inherit',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'data' ? 600 : 400,
          }}
        >
          Data Management
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'organization' && (!viewLevel || viewLevel === 'organization') && (
        <>
          <div>
            <h2>Period</h2>
            <div className="row" style={{ gap: 12 }}>
              <div className="col">
                <label>Start date</label>
                <input type="date" value={state.period.startISO} onChange={(e) => dispatch({ type: 'SET_PERIOD', startISO: e.target.value, endISO: state.period.endISO })} />
              </div>
              <div className="col">
                <label>End date</label>
                <input type="date" value={state.period.endISO} onChange={(e) => dispatch({ type: 'SET_PERIOD', startISO: state.period.startISO, endISO: e.target.value })} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <h3>Teams</h3>
            <div className="row" style={{ gap: 8 }}>
              <TeamAdder />
            </div>
            <div className="list" style={{ marginTop: 8 }}>
              {state.teams.map(t => (
                <div key={t.id} className="list-item"><span>{t.name}</span><span className="muted">{t.id}</span></div>
              ))}
              {state.teams.length === 0 && <div className="muted">No teams yet.</div>}
            </div>
          </div>
        </>
      )}

      {activeTab === 'objectives' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3>Objectives</h3>
            <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
              Define high-level objectives that your Key Results will support. Objectives can be assigned to teams.
            </p>
          </div>
        <div className="row" style={{ gap: 8 }}>
          <input type="text" placeholder="Objective name" value={objName} onChange={(e) => setObjName(e.target.value)} />
          <button
            onClick={() => {
              if (!objName.trim()) return
              const assignedTeams: string[] = []
              if (viewTeamId) assignedTeams.push(viewTeamId)
              dispatch({ type: 'ADD_OBJECTIVE', obj: { id: `obj-${Date.now()}`, name: objName.trim(), teamIds: assignedTeams } })
              setObjName('')
            }}
          >Add Objective</button>
        </div>
        <div className="list" style={{ marginTop: 8 }}>
          {(state.objectives
            .filter(o => {
              if (viewLevel === 'team' && viewTeamId) return (o.teamIds || []).includes(viewTeamId)
              if (viewLevel === 'pod' && viewPodId) {
                const podTeamId = state.pods.find(p => p.id === viewPodId)?.teamId
                return podTeamId ? (o.teamIds || []).includes(podTeamId) : true
              }
              return true
            })
          ).map(o => {
            const teamNames = (o.teamIds || []).map(id => state.teams.find(t => t.id === id)?.name || id)
            const editing = objTeamsEditing === o.id
            return (
              <div key={o.id} className="list-item" style={{ alignItems: 'center' }}>
                <div>
                  <div>{o.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>Teams: {teamNames.length ? teamNames.join(', ') : '—'}</div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {!editing && (
                    <button onClick={() => {
                      if (viewLevel === 'team') {
                        // Reassign Team flow: single-select to a team
                        const map: Record<ID, boolean> = {}
                        for (const t of state.teams) map[t.id] = Boolean(o.teamIds?.includes(t.id))
                        setObjTeamsSel(map)
                        setObjTeamsEditing(o.id)
                      } else {
                        const map: Record<ID, boolean> = {}
                        for (const t of state.teams) map[t.id] = Boolean(o.teamIds?.includes(t.id))
                        setObjTeamsSel(map)
                        setObjTeamsEditing(o.id)
                      }
                    }}>{viewLevel === 'team' ? 'Reassign Team' : 'Assign teams'}</button>
                  )}
                  {editing && viewLevel === 'team' && (
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <select value={Object.keys(objTeamsSel).find(id => objTeamsSel[id]) || ''} onChange={(e) => {
                        const sel: Record<ID, boolean> = {}
                        state.teams.forEach(t => sel[t.id] = false)
                        if (e.target.value) sel[e.target.value] = true
                        setObjTeamsSel(sel)
                      }}>
                        <option value="">— select team —</option>
                        {state.teams.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                      </select>
                      <button onClick={() => {
                        const id = Object.keys(objTeamsSel).find(id => objTeamsSel[id])
                        const ids = id ? [id] : []
                        dispatch({ type: 'SET_OBJECTIVE_TEAMS', objectiveId: o.id, teamIds: ids })
                        setObjTeamsEditing(null)
                      }}>Save</button>
                      <button onClick={() => setObjTeamsEditing(null)}>Cancel</button>
                    </div>
                  )}
                  {editing && viewLevel !== 'team' && (
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      {state.teams.map(t => (
                        <label key={t.id} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <input type="checkbox" checked={!!objTeamsSel[t.id]} onChange={(e) => setObjTeamsSel(prev => ({ ...prev, [t.id]: e.target.checked }))} />
                          {t.name}
                        </label>
                      ))}
                      <button onClick={() => {
                        const ids = Object.keys(objTeamsSel).filter(id => objTeamsSel[id])
                        dispatch({ type: 'SET_OBJECTIVE_TEAMS', objectiveId: o.id, teamIds: ids })
                        setObjTeamsEditing(null)
                      }}>Save</button>
                      <button onClick={() => setObjTeamsEditing(null)}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {state.objectives.length === 0 && <div className="muted">No objectives yet.</div>}
        </div>
        </div>
      )}

      {activeTab === 'krs' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3>Key Results</h3>
            <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
              Create measurable Key Results that track progress toward your objectives. Set units, aggregation types, and assign ownership.
            </p>
          </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input type="text" placeholder="KR name" value={krName} onChange={(e) => setKrName(e.target.value)} />
          <select value={krUnit} onChange={(e) => setKrUnit(e.target.value as Unit)}>
            <option value="count">count</option>
            <option value="percent">percent</option>
            <option value="currency">currency</option>
          </select>
          <select value={krAgg} onChange={(e) => setKrAgg(e.target.value as Aggregation)}>
            <option value="cumulative">cumulative</option>
            <option value="snapshot">snapshot</option>
            <option value="average">average</option>
          </select>
          <input
            type="number"
            placeholder="start (x)"
            value={krStart}
            onChange={(e) => setKrStart(e.target.value)}
            title="Starting point (x)"
            style={{ width: 140 }}
          />
          <span style={{ alignSelf: 'center' }}>→</span>
          <input
            type="number"
            placeholder="end (y)"
            value={krEnd}
            onChange={(e) => setKrEnd(e.target.value)}
            title="End target (y)"
            style={{ width: 140 }}
          />
          <select value={krStatus} onChange={(e) => setKrStatus(e.target.value as KrStatus)} title="KR status">
            <option value="on_track">On Track | Green</option>
            <option value="at_risk">At Risk | Yellow</option>
            <option value="off_track">Off Track | Red</option>
            <option value="deprioritized">Deprioritized | Grey</option>
          </select>
          <select value={krObj} onChange={(e) => setKrObj(e.target.value)}>
            <option value="">— objective (optional) —</option>
            {state.objectives.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select value={krTeam} onChange={(e) => {
            setKrTeam(e.target.value)
            setKrPod('') // Reset pod when team changes
            setKrDri('') // Reset DRI when team changes
          }} disabled={!!viewTeamId}>
            <option value="">— team (optional) —</option>
            {state.teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select value={krPod} onChange={(e) => {
            setKrPod(e.target.value)
            setKrDri('') // Reset DRI when pod changes
          }} disabled={!krTeam || !!viewPodId}>
            <option value="">— pod (optional) —</option>
            {krTeam && state.pods.filter(p => p.teamId === krTeam).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={krDri} onChange={(e) => setKrDri(e.target.value)} disabled={!krTeam}>
            <option value="">— DRI (optional) —</option>
            {krTeam && state.individuals.filter(i => i.teamId === krTeam && (!krPod || i.podId === krPod)).map(i => {
              const role = i.role?.replace('_', ' ') || 'contributor'
              const disc = i.discipline ? i.discipline.charAt(0).toUpperCase() + i.discipline.slice(1) : undefined
              return (
                <option key={i.id} value={i.id}>{i.name} ({role}{disc ? ` • ${disc}` : ''})</option>
              )
            })}
          </select>
          <label className="row" style={{ gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={seedPlanFromGoals} onChange={(e) => setSeedPlanFromGoals(e.target.checked)} />
            <span className="muted" style={{ fontSize: 12 }}>Seed plan start/end from goals</span>
          </label>
          <button
            onClick={() => {
              if (!krName.trim()) return
              const goalStartNum = krStart.trim() === '' ? undefined : Number(krStart)
              const goalEndNum = krEnd.trim() === '' ? undefined : Number(krEnd)
              // Generate KR id with Year+Quarter suffix, e.g., kr-2025Q3-<ts>
              const startISO = state.period.startISO
              const y = startISO ? Number(startISO.slice(0,4)) : new Date().getUTCFullYear()
              const m = startISO ? Number(startISO.slice(5,7)) : (new Date().getUTCMonth()+1)
              const q = Math.floor((m - 1) / 3) + 1
              const newKrId = `kr-${y}Q${q}-${Date.now()}`
              // Auto-map objective if none chosen and exactly one objective exists for selected team
              let objectiveId = krObj || undefined
              if (!objectiveId && (krTeam || viewTeamId)) {
                const teamId = krTeam || viewTeamId!
                const teamObjectives = state.objectives.filter(o => (o.teamIds || []).includes(teamId))
                if (teamObjectives.length === 1) objectiveId = teamObjectives[0].id
              }
              dispatch({ type: 'ADD_KR', kr: {
                id: newKrId,
                name: krName.trim(),
                unit: krUnit,
                aggregation: krAgg,
                status: krStatus,
                objectiveId,
                teamId: krTeam || undefined,
                podId: krPod || undefined,
                driId: krDri || undefined,
                goalStart: goalStartNum,
                goalEnd: goalEndNum,
              } })
              // Optionally seed plan endpoints to tie out with intended goals
              if (seedPlanFromGoals && hasPeriod && (goalStartNum !== undefined || goalEndNum !== undefined)) {
                const weeks = generateWeeks(state.period.startISO, state.period.endISO)
                if (weeks.length > 0) {
                  const firstKey = weeks[0].iso
                  const lastKey = weeks[weeks.length - 1].iso
                  if (goalStartNum !== undefined) dispatch({ type: 'UPDATE_PLAN_DRAFT', krId: newKrId, weekKey: firstKey, value: goalStartNum })
                  if (goalEndNum !== undefined) dispatch({ type: 'UPDATE_PLAN_DRAFT', krId: newKrId, weekKey: lastKey, value: goalEndNum })
                }
              }
              setKrName('')
              setKrTeam('')
              setKrPod('')
              setKrDri('')
              setKrStart('')
              setKrEnd('')
              setKrStatus('on_track')
            }}
            disabled={!hasPeriod}
            title={hasPeriod ? '' : 'Set a period first'}
          >Add KR</button>
        </div>
        <div className="list" style={{ marginTop: 8 }}>
          {(state.krs.filter(kr => {
            if (viewLevel === 'team' && viewTeamId) return kr.teamId === viewTeamId
            if (viewLevel === 'pod' && viewPodId) return kr.podId === viewPodId
            return true
          })).map(kr => {
            const obj = kr.objectiveId && state.objectives.find(o => o.id === kr.objectiveId)
            const team = kr.teamId && state.teams.find(t => t.id === kr.teamId)
            const pod = kr.podId && state.pods.find(p => p.id === kr.podId)
            const dri = kr.driId && state.individuals.find(i => i.id === kr.driId)
            const unitSuffix = kr.unit === 'percent' ? ' (%)' : (kr.unit === 'currency' ? ' ($)' : '')
            return (
              <div key={kr.id} className="list-item">
                <div style={{ display: 'grid', gap: 4 }}>
                  <div><strong>{kr.name}</strong></div>
                  {(typeof kr.goalStart === 'number' || typeof kr.goalEnd === 'number') && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      <span className="badge accent">🎯 Goal: {typeof kr.goalStart === 'number' ? kr.goalStart : '—'} → {typeof kr.goalEnd === 'number' ? kr.goalEnd : '—'}{unitSuffix}</span>
                    </div>
                  )}
                  <div className="muted" style={{ fontSize: 12 }}>
                    {team ? team.name : ''}{team && pod ? ' / ' : ''}{pod ? pod.name : ''}
                    {(team || pod) ? ' • ' : ''}{kr.unit} • {kr.aggregation}
                    {obj ? ` • ${obj.name}` : ''}
                    {dri ? ` • DRI: ${dri.name}` : ''}
                    {!obj && <span className="badge unmapped" title="No objective mapped">Unmapped</span>}
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label className="muted" style={{ fontSize: 12 }}>Status</label>
                    <select value={kr.status || 'on_track'} onChange={(e) => {
                      const updated = { ...kr, status: e.target.value as KrStatus }
                      dispatch({ type: 'UPDATE_KR', kr: updated })
                    }}>
                      <option value="on_track">On Track | Green</option>
                      <option value="at_risk">At Risk | Yellow</option>
                      <option value="off_track">Off Track | Red</option>
                      <option value="deprioritized">Deprioritized | Grey</option>
                    </select>
                    <span className={`badge ${(() => {
                      const s = kr.status || 'on_track'
                      return s === 'on_track' ? 'green' : s === 'at_risk' ? 'yellow' : s === 'off_track' ? 'red' : 'grey'
                    })()}`}>{(() => {
                      const s = kr.status || 'on_track'
                      return s === 'on_track' ? 'On Track' : s === 'at_risk' ? 'At Risk' : s === 'off_track' ? 'Off Track' : 'Deprioritized'
                    })()}</span>
                  </div>
                  {!obj && (
                    <div className="row" style={{ gap: 8 }}>
                      <select value="" onChange={(e) => {
                        const targetId = e.target.value
                        if (!targetId) return
                        const updated = { ...kr, objectiveId: targetId }
                        dispatch({ type: 'UPDATE_KR', kr: updated })
                      }}>
                        <option value="">Map to objective…</option>
                        {state.objectives
                          .filter(o => {
                            // Limit options to KR team (if any) for clarity
                            return kr.teamId ? (o.teamIds || []).includes(kr.teamId) : true
                          })
                          .map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
                      </select>
                    </div>
                  )}
                </div>
                <span className="muted">{kr.id}</span>
              </div>
            )
          })}
          {state.krs.length === 0 && <div className="muted">Add at least one KR.</div>}
        </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div>
          <h3>Data Management</h3>
          <div style={{ display: 'grid', gap: 24, marginTop: 16 }}>
            <div className="data-section" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <h4>Export Data</h4>
              <p className="muted" style={{ fontSize: 14, marginTop: 4, marginBottom: 12 }}>
                Export your KR Tracker data for backup or analysis.
              </p>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(state, null, 2)
                  const dataBlob = new Blob([dataStr], { type: 'application/json' })
                  const url = URL.createObjectURL(dataBlob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `kr-tracker-export-${new Date().toISOString().split('T')[0]}.json`
                  link.click()
                  URL.revokeObjectURL(url)
                }}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Export to JSON
              </button>
            </div>

            <div className="data-section" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <h4>Import Data</h4>
              <p className="muted" style={{ fontSize: 14, marginTop: 4, marginBottom: 12 }}>
                Import previously exported KR Tracker data. This will replace all current data.
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
                      if (confirm('This will replace all current data. Are you sure?')) {
                        dispatch({ type: 'IMPORT_STATE', state: data })
                      }
                    } catch (error) {
                      alert('Invalid JSON file')
                    }
                  }
                  reader.readAsText(file)
                }}
                style={{ marginBottom: 8 }}
              />
            </div>

            <div className="data-section" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <h4>Reset Data</h4>
              <p className="muted" style={{ fontSize: 14, marginTop: 4, marginBottom: 12 }}>
                Clear all data and start fresh. This action cannot be undone.
              </p>
              <button
                onClick={() => {
                  if (confirm('This will delete all your data. Are you sure?')) {
                    if (confirm('This action cannot be undone. Really delete all data?')) {
                      try { localStorage.removeItem(STORAGE_KEY) } catch {}
                      for (const legacy of LEGACY_STORAGE_KEYS) {
                        try { localStorage.removeItem(legacy) } catch {}
                      }
                      window.location.reload()
                    }
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Reset All Data
              </button>
            </div>

            <div className="data-section" style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <h4>Storage Info</h4>
              <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                Data is stored locally in your browser's localStorage.
              </p>
              <div style={{ marginTop: 12, fontSize: 14 }}>
                <div>Storage Key: <code style={{ background: 'var(--bg-color)', padding: '2px 6px', borderRadius: 3 }}>{STORAGE_KEY}</code></div>
                <div style={{ marginTop: 4 }}>Data Size: <strong>{(JSON.stringify(state).length / 1024).toFixed(2)} KB</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
