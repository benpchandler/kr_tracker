import React from 'react'
import { useDispatch, useStore } from '../state/store'
import type { Aggregation, Unit, ID } from '../models/types'
import { TeamAdder } from './TeamAdder'

export function Setup() {
  const state = useStore(s => s)
  const dispatch = useDispatch()

  const [objName, setObjName] = React.useState('')
  const [objTeamsEditing, setObjTeamsEditing] = React.useState<string | null>(null)
  const [objTeamsSel, setObjTeamsSel] = React.useState<Record<ID, boolean>>({})
  const [krName, setKrName] = React.useState('')
  const [krUnit, setKrUnit] = React.useState<Unit>('count')
  const [krAgg, setKrAgg] = React.useState<Aggregation>('cumulative')
  const [krObj, setKrObj] = React.useState<string>('')
  const [krTeam, setKrTeam] = React.useState<string>('')

  const hasPeriod = Boolean(state.period.startISO && state.period.endISO)

  return (
    <div className="panel" style={{ display: 'grid', gap: 16 }}>
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

      <div>
        <h2>Teams</h2>
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

      <div>
        <h2>Objectives</h2>
        <div className="row" style={{ gap: 8 }}>
          <input type="text" placeholder="Objective name" value={objName} onChange={(e) => setObjName(e.target.value)} />
          <button
            onClick={() => {
              if (!objName.trim()) return
              dispatch({ type: 'ADD_OBJECTIVE', obj: { id: `obj-${Date.now()}`, name: objName.trim(), teamIds: [] } })
              setObjName('')
            }}
          >Add Objective</button>
        </div>
        <div className="list" style={{ marginTop: 8 }}>
          {state.objectives.map(o => {
            const teamNames = (o.teamIds || []).map(id => state.teams.find(t => t.id === id)?.name || id)
            const editing = objTeamsEditing === o.id
            return (
              <div key={o.id} className="list-item" style={{ alignItems: 'center' }}>
                <div>
                  <div>{o.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>Teams: {teamNames.length ? teamNames.join(', ') : '—'}</div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {!editing && <button onClick={() => {
                    const map: Record<ID, boolean> = {}
                    for (const t of state.teams) map[t.id] = Boolean(o.teamIds?.includes(t.id))
                    setObjTeamsSel(map)
                    setObjTeamsEditing(o.id)
                  }}>Assign teams</button>}
                  {editing && (
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

      <div>
        <h2>Key Results</h2>
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
          <select value={krObj} onChange={(e) => setKrObj(e.target.value)}>
            <option value="">— objective (optional) —</option>
            {state.objectives.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select value={krTeam} onChange={(e) => setKrTeam(e.target.value)}>
            <option value="">— team (optional) —</option>
            {state.teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={() => {
              if (!krName.trim()) return
              dispatch({ type: 'ADD_KR', kr: {
                id: `kr-${Date.now()}`,
                name: krName.trim(),
                unit: krUnit,
                aggregation: krAgg,
                objectiveId: krObj || undefined,
                teamId: krTeam || undefined,
              } })
              setKrName('')
              setKrTeam('')
            }}
            disabled={!hasPeriod}
            title={hasPeriod ? '' : 'Set a period first'}
          >Add KR</button>
        </div>
        <div className="list" style={{ marginTop: 8 }}>
          {state.krs.map(kr => {
            const obj = kr.objectiveId && state.objectives.find(o => o.id === kr.objectiveId)
            const team = kr.teamId && state.teams.find(t => t.id === kr.teamId)
            return (
              <div key={kr.id} className="list-item">
                <div>
                  <div><strong>{kr.name}</strong></div>
                  <div className="muted" style={{ fontSize: 12 }}>{kr.aggregation} • {kr.unit}{obj ? ` • ${obj.name}` : ''}{team ? ` • ${team.name}` : ''}</div>
                </div>
                <span className="muted">{kr.id}</span>
              </div>
            )
          })}
          {state.krs.length === 0 && <div className="muted">Add at least one KR.</div>}
        </div>
      </div>
    </div>
  )
}
