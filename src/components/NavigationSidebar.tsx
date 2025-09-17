import React from 'react'
import { useStore, useDispatch } from '../state/store'
import { ViewFilter, ID } from '../models/types'

export function NavigationSidebar() {
  const state = useStore(s => s)
  const dispatch = useDispatch()
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({
    org: true,
    teams: true,
    people: true,
  })
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  const currentView = state.currentView
  const isActiveView = (level: ViewFilter['level'], targetId?: ID) => {
    return currentView?.level === level && currentView?.targetId === targetId
  }

  const setView = (filter: ViewFilter) => {
    dispatch({ type: 'SET_VIEW_FILTER', filter })
  }

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Group pods by team
  const podsByTeam = React.useMemo(() => {
    const map: Record<ID, typeof state.pods> = {}
    state.teams.forEach(t => {
      map[t.id] = state.pods.filter(p => p.teamId === t.id)
    })
    return map
  }, [state.teams, state.pods])

  // Group individuals by team
  const individualsByTeam = React.useMemo(() => {
    const map: Record<ID, typeof state.individuals> = {}
    state.teams.forEach(t => {
      map[t.id] = state.individuals.filter(i => i.teamId === t.id)
    })
    return map
  }, [state.teams, state.individuals])

  return (
    <div className={`navigation-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="nav-header">
        <h3>Organization</h3>
        <button className="sidebar-toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Quick Views */}
        <div className="nav-section nav-quick-views">
          <div className="nav-header-sub">Quick Views</div>
          <div
            className={`nav-item ${isActiveView('organization') ? 'active' : ''}`}
            onClick={() => state.organization && setView({ level: 'organization', targetId: state.organization.id })}
          >
            <span className="nav-icon">🌐</span>
            <span className="nav-label">All Organization</span>
          </div>

          {/* Settings */}
          <div
            className={`nav-item ${isActiveView('settings') ? 'active' : ''}`}
            onClick={() => setView({ level: 'settings' })}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </div>

          {/* My Team - placeholder quick views */}
          {state.teams[0] && (
            <div
              className={`nav-item ${isActiveView('team', state.teams[0].id) ? 'active' : ''}`}
              onClick={() => setView({ level: 'team', targetId: state.teams[0].id })}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-label">My Team</span>
            </div>
          )}

          {state.pods[0] && (
            <div
              className={`nav-item ${isActiveView('pod', state.pods[0].id) ? 'active' : ''}`}
              onClick={() => setView({ level: 'pod', targetId: state.pods[0].id })}
            >
              <span className="nav-icon">🎯</span>
              <span className="nav-label">My Pod</span>
            </div>
          )}

          {state.individuals[0] && (
            <div
              className={`nav-item ${isActiveView('individual', state.individuals[0].id) ? 'active' : ''}`}
              onClick={() => setView({ level: 'individual', targetId: state.individuals[0].id })}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-label">My KRs</span>
            </div>
          )}
        </div>

        {/* Organization Level */}
        <div className="nav-section">
          <div
            className={`nav-item ${isActiveView('organization', state.organization?.id) ? 'active' : ''}`}
            onClick={() => state.organization && setView({ level: 'organization', targetId: state.organization.id })}
          >
            <span className="nav-icon">🏢</span>
            <span className="nav-label">{state.organization?.name || 'Organization'}</span>
          </div>
        </div>

        {/* Teams Level */}
        <div className="nav-section">
          <div className="nav-header-sub" onClick={() => toggleExpand('teams')}>
            <span className="nav-expand">{expanded.teams ? '▼' : '▶'}</span>
            <span>Teams</span>
          </div>
          {expanded.teams && !isCollapsed && state.teams.map(team => (
            <div key={team.id}>
              <div
                className={`nav-item nav-level-1 ${isActiveView('team', team.id) ? 'active' : ''}`}
                onClick={() => setView({ level: 'team', targetId: team.id })}
              >
                <span className="nav-icon" style={{ color: team.color }}>●</span>
                <span className="nav-label">{team.name}</span>
              </div>

              {/* Pods under this team */}
              {podsByTeam[team.id]?.length > 0 && (
                <div className="nav-pods">
                  {podsByTeam[team.id].map(pod => (
                    <div
                      key={pod.id}
                      className={`nav-item nav-level-2 ${isActiveView('pod', pod.id) ? 'active' : ''}`}
                      onClick={() => setView({ level: 'pod', targetId: pod.id })}
                    >
                      <span className="nav-icon">└─</span>
                      <span className="nav-label">{pod.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* People */}
        <div className="nav-section">
          <div className="nav-header-sub" onClick={() => toggleExpand('people')}>
            <span className="nav-expand">{expanded.people ? '▼' : '▶'}</span>
            <span>People</span>
          </div>
          {expanded.people && !isCollapsed && state.teams.map(team => (
            <div key={team.id}>
              <div className="nav-item nav-level-1">
                <span className="nav-icon">🏷️</span>
                <span className="nav-label">{team.name}</span>
                <span className="nav-badge">{individualsByTeam[team.id]?.length || 0}</span>
              </div>
              {individualsByTeam[team.id]?.map(ind => {
                const disc = ind.discipline ? ind.discipline.charAt(0).toUpperCase() + ind.discipline.slice(1) : undefined
                return (
                  <div
                    key={ind.id}
                    className={`nav-item nav-level-2 ${isActiveView('individual', ind.id) ? 'active' : ''}`}
                    onClick={() => setView({ level: 'individual', targetId: ind.id })}
                  >
                    <span className="nav-icon">👤</span>
                    <span className="nav-label">{ind.name}</span>
                    <span className="nav-badge">{ind.role?.replace('_',' ') || 'contributor'}{disc ? ` • ${disc}` : ''}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="nav-footer">
        <div
          className="nav-item"
          onClick={() => dispatch({ type: 'SET_VIEW_FILTER', filter: { level: 'setup' } as any })}
          style={{ cursor: 'pointer' }}
        >
          <span className="nav-icon">🔧</span>
          <span className="nav-label">Setup Area</span>
        </div>
      </div>
    </div>
  )
}
