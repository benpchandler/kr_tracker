import React from 'react'
import { useStore } from '../state/store'

export function Sidebar() {
  const state = useStore(s => s)
  const { teams, pods, individuals, krs } = state

  const teamLead = (teamId: string) => individuals.find(i => i.teamId === teamId && i.role === 'team_lead')
  const podLead = (podId: string) => individuals.find(i => i.podId === podId && i.role === 'pod_lead')

  return (
    <div className="navigation-sidebar">
      <div className="nav-header">
        <h3>Navigation</h3>
      </div>

      <div className="nav-section">
        <div className="nav-header-sub">
          <span className="nav-expand">▸</span>
          <span>Teams</span>
        </div>
        {teams.map(team => {
          const teamPods = pods.filter(p => p.teamId === team.id)
          const lead = teamLead(team.id)
          return (
            <div key={team.id} className="nav-item">
              <span className="nav-icon">👥</span>
              <span className="nav-label">{team.name}</span>
              <span className="nav-badge">{teamPods.length} pods</span>
              {/* team lead inline note */}
            </div>
          )
        })}
      </div>

      <div className="nav-section">
        <div className="nav-header-sub">
          <span className="nav-expand">▸</span>
          <span>Pods</span>
        </div>
        {pods.map(pod => {
          const lead = podLead(pod.id)
          const count = krs.filter(kr => kr.podId === pod.id).length
          return (
            <div key={pod.id} className="nav-item nav-level-1">
              <span className="nav-icon">📦</span>
              <span className="nav-label">{pod.name}</span>
              <span className="nav-badge">{count} KRs</span>
            </div>
          )
        })}
      </div>

      <div className="nav-section nav-quick-views">
        <div className="nav-header-sub">
          <span className="nav-expand">▸</span>
          <span>People</span>
        </div>
        {teams.map(team => {
          const people = individuals.filter(p => p.teamId === team.id)
          return (
            <div key={team.id}>
              <div className="nav-item nav-level-1">
                <span className="nav-icon">🏷️</span>
                <span className="nav-label">{team.name}</span>
                <span className="nav-badge">{people.length}</span>
              </div>
              {people.map(p => {
                const disc = p.discipline ? p.discipline.charAt(0).toUpperCase() + p.discipline.slice(1) : undefined
                return (
                  <div key={p.id} className="nav-item nav-level-2">
                    <span className="nav-icon">👤</span>
                    <span className="nav-label">{p.name}</span>
                    <span className="nav-badge">{p.role?.replace('_',' ') || 'contributor'}{disc ? ` • ${disc}` : ''}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
