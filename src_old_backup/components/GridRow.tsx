import React from 'react'
import { ChevronDown, ChevronRight, Target } from 'lucide-react'
import { KeyResult, KrMetricsSummary } from '../models/types'
import { Sparkline } from './Sparkline'
import { ContextMenu, createKrContextMenuItems } from './shared/ContextMenu'
import { useStore } from '../state/store'

interface GridRowProps {
  kr: KeyResult
  metrics?: KrMetricsSummary
  gridType: string
  isExpanded: boolean
  isFocused: boolean
  onToggle: () => void
  onFocusRow?: () => void
  onContextMenuAction: (action: string) => void
  renderWeekCells: () => React.ReactNode
  renderExpandedContent?: () => React.ReactNode
}

export function GridRow({
  kr,
  metrics,
  gridType,
  isExpanded,
  isFocused,
  onToggle,
  onFocusRow,
  onContextMenuAction,
  renderWeekCells,
  renderExpandedContent,
}: GridRowProps) {
  const state = useStore(s => s)
  const rowRef = React.useRef<HTMLTableRowElement>(null)

  // Get related data
  const team = kr.teamId ? state.teams.find(t => t.id === kr.teamId) : undefined
  const pod = kr.podId ? state.pods.find(p => p.id === kr.podId) : undefined
  const objective = kr.objectiveId ? state.objectives.find(o => o.id === kr.objectiveId) : undefined
  const baseline = state.baselines.find(b => b.id === state.currentBaselineId)
  const hasPlan = baseline?.data[kr.id] && Object.keys(baseline.data[kr.id]).length > 0

  // Calculate display values
  const pacePct = metrics?.latestPacePct !== undefined ? Math.round(metrics.latestPacePct * 100) : undefined
  const variance = metrics?.latestVariance
  const health = metrics?.health || kr.status
  const unitSuffix = kr.unit === 'percent' ? '%' : kr.unit === 'currency' ? '$' : ''

  // Health indicator colors
  const healthColor = health === 'green' || health === 'on_track' ? 'var(--success)' :
                      health === 'yellow' || health === 'at_risk' ? 'var(--warning)' :
                      health === 'red' || health === 'off_track' ? 'var(--danger)' :
                      'var(--muted)'

  const healthLabel = health === 'green' ? 'On Track' :
                      health === 'yellow' ? 'At Risk' :
                      health === 'red' ? 'Off Track' :
                      health === 'on_track' ? 'On Track' :
                      health === 'at_risk' ? 'At Risk' :
                      health === 'off_track' ? 'Off Track' :
                      health === 'deprioritized' ? 'Deprioritized' :
                      'No Status'

  // Focus handling
  React.useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.focus()
    }
  }, [isFocused])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }

  // Context menu items
  const contextMenuItems = createKrContextMenuItems(kr.id, {
    canEdit: state.phase === 'planning',
    canDelete: state.phase === 'planning',
    hasInitiatives: state.initiatives.some(i => i.krId === kr.id),
  })

  // Recent activity (for expanded view)
  const recentActivity = React.useMemo(() => {
    const activities: Array<{ date: string; description: string }> = []

    // Check recent actuals updates
    const actualMeta = (state as any).actualMeta?.[kr.id]
    if (actualMeta) {
      const recentUpdates = Object.entries(actualMeta)
        .filter(([_, meta]: [string, any]) => meta?.at)
        .map(([week, meta]: [string, any]) => ({
          week,
          at: new Date(meta.at),
          by: meta.by || 'user',
        }))
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, 3)

      recentUpdates.forEach(update => {
        activities.push({
          date: update.at.toLocaleDateString(),
          description: `Updated ${update.week} actuals (by ${update.by})`,
        })
      })
    }

    return activities
  }, [kr.id, state])

  return (
    <>
      <tr
        ref={rowRef}
        className={`grid-row ${isExpanded ? 'grid-row-expanded' : 'grid-row-collapsed'}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => onFocusRow?.()}
        onClick={onToggle}
        style={{ cursor: 'pointer' }}
      >
        <td className="kr" style={{ minWidth: 320 }}>
          <div className="grid-row-content">
            {/* Expand/Collapse Icon */}
            <button
              className="expand-toggle"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--muted)',
              }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* KR Name and Goal */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                {kr.name}
              </div>
              {(kr.goalStart !== undefined || kr.goalEnd !== undefined) && (
                <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Target size={12} />
                  <span>
                    {kr.goalStart ?? '—'} → {kr.goalEnd ?? '—'}{unitSuffix}
                  </span>
                  {!hasPlan && (
                    <span className="badge unmapped" style={{ marginLeft: 4, fontSize: 10 }}>No plan</span>
                  )}
                </div>
              )}
            </div>

            {/* Health Indicator */}
            <div
              className="health-indicator"
              aria-label={`Status: ${healthLabel}`}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: healthColor,
                flexShrink: 0,
              }}
              title={healthLabel}
            />

            {/* Pace % */}
            {pacePct !== undefined && (
              <div
                style={{
                  fontSize: 14,
                  fontFamily: 'monospace',
                  color: healthColor,
                  minWidth: 50,
                  textAlign: 'right',
                }}
              >
                {pacePct}%
              </div>
            )}

            {/* Sparkline */}
            {metrics && (
              <div style={{ width: 80, height: 36 }}>
                <Sparkline
                  width={80}
                  height={36}
                  plan={metrics.series.plan.slice(-8)}
                  actual={metrics.series.actual.slice(-8)}
                />
              </div>
            )}

            {/* Context Menu */}
            <div onClick={(e) => e.stopPropagation()}>
              <ContextMenu
                items={contextMenuItems}
                onAction={onContextMenuAction}
              />
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="grid-row-details">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginTop: 12,
              }}>
                {/* Team/Pod Assignment */}
                {(team || pod) && (
                  <div className="detail-card" style={{
                    padding: 12,
                    background: 'var(--panel-2)',
                    borderRadius: 8,
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                      Assignment
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {team && (
                        <span className="badge" style={{ background: team.color || 'var(--accent-50)' }}>
                          {team.name}
                        </span>
                      )}
                      {pod && (
                        <span className="badge">
                          {pod.name}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Metrics Detail */}
                <div className="detail-card" style={{
                  padding: 12,
                  background: 'var(--panel-2)',
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                    Metrics
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13 }}>Variance</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {variance !== undefined ? variance.toFixed(2) : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13 }}>Aggregation</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{kr.aggregation}</span>
                    </div>
                    {objective && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13 }}>Objective</span>
                        <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{objective.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                {recentActivity.length > 0 && (
                  <div className="detail-card" style={{
                    padding: 12,
                    background: 'var(--panel-2)',
                    borderRadius: 8,
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                      Recent Activity
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {recentActivity.map((activity, idx) => (
                        <div key={idx} style={{ fontSize: 12 }}>
                          <span style={{ color: 'var(--muted)' }}>{activity.date}:</span>{' '}
                          {activity.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {renderExpandedContent?.()}
            </div>
          )}
        </td>
        {renderWeekCells()}
      </tr>
    </>
  )
}