import React from 'react'
import { useStore } from '../state/store'

export function OrgOverview() {
  const state = useStore(s => s)
  const { organization, teams, pods, individuals, krs } = state

  return (
    <div className="panel">
      <h2>Organization Overview</h2>
      <div className="list" style={{ marginTop: 8 }}>
        <div className="list-item">
          <div>
            <div><strong>{organization?.name || 'Organization'}</strong></div>
            <div className="muted" style={{ fontSize: 12 }}>Teams: {teams.length} • Pods: {pods.length} • KRs: {krs.length}</div>
          </div>
          <span className="muted">{organization?.id}</span>
        </div>
      </div>

      <div className="list" style={{ marginTop: 8 }}>
        {teams.map(team => {
          const lead = individuals.find(i => i.role === 'team_lead' && i.teamId === team.id)
          const teamPods = pods.filter(p => p.teamId === team.id)
          const teamPeople = individuals.filter(i => i.teamId === team.id)
          return (
            <div key={team.id} className="list-item" style={{ alignItems: 'flex-start' }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div><strong>{team.name}</strong></div>
                <div className="muted" style={{ fontSize: 12 }}>Team Lead: {lead ? lead.name : '—'}</div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>People</div>
                  {teamPeople.length > 0 ? teamPeople.map(person => {
                    const role = person.role.replace(/_/g, ' ')
                    const pod = person.podId ? pods.find(p => p.id === person.podId) : undefined
                    return (
                      <div key={person.id} className="muted" style={{ fontSize: 12 }}>
                        • {person.name} — {role}{pod ? ` — ${pod.name}` : ''}
                      </div>
                    )
                  }) : <div className="muted" style={{ fontSize: 12 }}>No people</div>}
                </div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Pods</div>
                  {teamPods.map(pod => {
                    const podLead = individuals.find(i => i.role === 'pod_lead' && i.podId === pod.id)
                    const podKrs = krs.filter(kr => kr.podId === pod.id)
                    return (
                      <div key={pod.id} className="muted" style={{ fontSize: 12 }}>
                        • {pod.name} — Lead: {podLead ? podLead.name : '—'} — KRs: {podKrs.length}
                      </div>
                    )
                  })}
                  {teamPods.length === 0 && <div className="muted" style={{ fontSize: 12 }}>No pods</div>}
                </div>
              </div>
              <span className="muted">{team.id}</span>
            </div>
          )
        })}
        {teams.length === 0 && <div className="muted">No teams yet.</div>}
      </div>
    </div>
  )
}
