import React from 'react'
import { useStore } from '../state/store'

export function PeopleOverview() {
  const state = useStore(s => s)
  const { individuals, teams, pods, krs } = state

  const byTeam: Record<string, typeof individuals> = {}
  for (const person of individuals) {
    if (!byTeam[person.teamId]) byTeam[person.teamId] = []
    byTeam[person.teamId].push(person)
  }

  const personKrs = new Map<string, string[]>()
  for (const kr of krs) {
    if (kr.driId) {
      const arr = personKrs.get(kr.driId) || []
      arr.push(kr.name)
      personKrs.set(kr.driId, arr)
    }
  }

  return (
    <div className="panel">
      <h2>People</h2>
      <div className="list" style={{ marginTop: 8 }}>
        {Object.keys(byTeam).map(teamId => {
          const team = teams.find(t => t.id === teamId)
          const people = byTeam[teamId]
          return (
            <div key={teamId} className="list-item" style={{ alignItems: 'flex-start' }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div><strong>{team?.name || teamId}</strong></div>
                {people.sort((a, b) => a.name.localeCompare(b.name)).map(p => {
                  const role = p.role.replace(/_/g, ' ')
                  const pod = p.podId ? pods.find(pd => pd.id === p.podId) : undefined
                  const linked = personKrs.get(p.id) || []
                  const discipline = p.discipline ? p.discipline.charAt(0).toUpperCase() + p.discipline.slice(1) : undefined
                  return (
                    <div key={p.id} className="muted" style={{ fontSize: 12 }}>
                      • {p.name} — {role}{discipline ? ` • ${discipline}` : ''}{pod ? ` • ${pod.name}` : ''}
                      {linked.length > 0 && (
                        <div style={{ marginLeft: 16 }}>
                          <span>DRI on: {linked.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
                {people.length === 0 && <div className="muted" style={{ fontSize: 12 }}>No people</div>}
              </div>
              <span className="muted">{teamId}</span>
            </div>
          )
        })}
        {Object.keys(byTeam).length === 0 && <div className="muted">No people yet.</div>}
      </div>
    </div>
  )
}
