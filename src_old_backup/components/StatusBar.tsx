import React from 'react'
import { useStore } from '../state/store'
import { generateWeeks } from '../utils/weeks'
import { filterKRsByView, getViewLabel } from '../utils/filtering'

export function StatusBar() {
  const state = useStore(s => s)
  // View context for compact header
  const viewLabel = getViewLabel(state.currentView, state)
  const filteredKRs = React.useMemo(
    () => filterKRsByView(state.krs, state.currentView, state),
    [state.krs, state.currentView, state]
  )

  // Get current reporting week
  const reportingWeek = React.useMemo(() => {
    if (!state.reportingDateISO || !state.period.startISO || !state.period.endISO) return null

    const weeks = generateWeeks(state.period.startISO, state.period.endISO)
    const reportingDate = new Date(state.reportingDateISO + 'T00:00:00Z')

    // Find which week the reporting date falls into
    const week = weeks.find(w => {
      const start = new Date(w.startISO + 'T00:00:00Z')
      const end = new Date(start.getTime())
      end.setUTCDate(end.getUTCDate() + 6)
      return reportingDate >= start && reportingDate <= end
    })

    return week
  }, [state.reportingDateISO, state.period.startISO, state.period.endISO])

  // Calculate baseline info
  const baselineInfo = React.useMemo(() => {
    if (!state.currentBaselineId) return null
    const baseline = state.baselines.find(b => b.id === state.currentBaselineId)
    if (!baseline) return null

    const lockedDate = new Date(baseline.lockedAt)
    const daysAgo = Math.floor((Date.now() - lockedDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      version: baseline.version,
      lockedBy: baseline.lockedBy,
      daysAgo
    }
  }, [state.currentBaselineId, state.baselines])

  // Count KRs and initiatives
  const krCount = state.krs.length
  const initiativeCount = state.initiatives.filter(i => !i.isPlaceholder).length
  const placeholderCount = state.initiatives.filter(i => i.isPlaceholder).length

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      fontSize: 13,
      color: 'var(--text-secondary)',
      minHeight: 36,
      flexShrink: 0
    }}>
      {/* Compact header + in-view count */}
      <div style={{
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: 'var(--text)'
      }}>
        <span style={{ fontWeight: 600 }}>KR Tracker — {viewLabel}</span>
        {state.currentView?.level !== 'settings' && (
          <span className="muted" style={{ marginLeft: 8 }}>
            {filteredKRs.length} Key Result{filteredKRs.length !== 1 ? 's' : ''} in view
          </span>
        )}
      </div>
      {/* Phase indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 500 }}>Phase:</span>
        <span style={{
          background: state.phase === 'execution' ? 'var(--success)' : 'var(--warning)',
          color: 'white',
          padding: '2px 8px',
          borderRadius: 4,
          fontWeight: 600,
          fontSize: 11,
          textTransform: 'uppercase'
        }}>
          {state.phase || 'planning'}
        </span>
      </div>

      {/* Reporting week */}
      {reportingWeek && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500 }}>Reporting Week:</span>
          <span style={{
            fontWeight: 600,
            color: 'var(--text)',
            background: 'var(--highlight)',
            padding: '2px 8px',
            borderRadius: 4
          }}>
            {reportingWeek.iso} ({reportingWeek.dateLabel})
          </span>
        </div>
      )}

      {/* Baseline info */}
      {baselineInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500 }}>Baseline:</span>
          <span>
            v{baselineInfo.version} locked {baselineInfo.daysAgo === 0 ? 'today' : `${baselineInfo.daysAgo} day${baselineInfo.daysAgo !== 1 ? 's' : ''} ago`}
          </span>
        </div>
      )}

      {/* KR and Initiative counts */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
        <span>{krCount} KRs</span>
        <span>{initiativeCount} Initiatives</span>
        {placeholderCount > 0 && (
          <span style={{ color: 'var(--warning)' }}>
            {placeholderCount} Placeholder{placeholderCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
