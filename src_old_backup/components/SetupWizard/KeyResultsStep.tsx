import React from 'react'
import { WizardKeyResultDraft, Unit, Aggregation, Objective, KeyResult, Team, ID } from '../../models/types'

const UNIT_OPTIONS: Unit[] = ['count', 'percent', 'currency']
const AGG_OPTIONS: Aggregation[] = ['cumulative', 'average', 'snapshot']

export type KeyResultsStepProps = {
  draft: WizardKeyResultDraft
  onDraftChange: (patch: Partial<WizardKeyResultDraft>) => void
  onSubmit: () => void
  teams: Team[]
  objectives: Objective[]
  krs: KeyResult[]
  seededKrIds: ID[]
}

export function KeyResultsStep({ draft, onDraftChange, onSubmit, teams, objectives, krs, seededKrIds }: KeyResultsStepProps) {
  const baseline = Number.isFinite(draft.goalStart ?? NaN) ? draft.goalStart : undefined
  const target = Number.isFinite(draft.goalEnd ?? NaN) ? draft.goalEnd : undefined

  const goalSummary = React.useMemo(() => {
    if (typeof baseline !== 'number' && typeof target !== 'number') {
      return 'Set a baseline and target to preview the change.'
    }
    if (typeof baseline !== 'number' && typeof target === 'number') {
      return `Target: ${formatValue(target, draft.unit)}`
    }
    if (typeof baseline === 'number' && typeof target !== 'number') {
      return `Baseline: ${formatValue(baseline, draft.unit)}`
    }
    if (typeof baseline === 'number' && typeof target === 'number') {
      const change = describeGoalChange(baseline, target, draft.unit)
      return `Goal: ${formatValue(baseline, draft.unit)} → ${formatValue(target, draft.unit)}${change ? ` (${change})` : ''}`
    }
    return 'Set a baseline and target to preview the change.'
  }, [baseline, target, draft.unit])

  const canSubmit = Boolean(draft.name.trim()) && typeof baseline === 'number' && typeof target === 'number'

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20 }}>Create key results</h3>
          <p style={{ marginTop: 8, color: 'var(--text-secondary, #475569)', maxWidth: 640 }}>
            Key results measure progress toward your objectives. Set a baseline and target to lock in the goal and
            we'll calculate the change automatically.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 16,
            background: 'var(--panel, #fff)',
            padding: 24,
            borderRadius: 12,
            border: '1px solid var(--border, rgba(148, 163, 184, 0.35))',
          }}
        >
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Key result name</span>
            <input
              value={draft.name}
              onChange={(event) => onDraftChange({ name: event.target.value })}
              placeholder="Increase weekly active merchants"
              style={{
                borderRadius: 8,
                border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                padding: '10px 12px',
                fontSize: 14,
              }}
            />
          </label>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Unit</span>
              <select
                value={draft.unit}
                onChange={(event) => onDraftChange({ unit: event.target.value as Unit })}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                  padding: '10px 12px',
                  fontSize: 14,
                  background: 'var(--panel, #fff)',
                }}
              >
                {UNIT_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Aggregation</span>
              <select
                value={draft.aggregation}
                onChange={(event) => onDraftChange({ aggregation: event.target.value as Aggregation })}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                  padding: '10px 12px',
                  fontSize: 14,
                  background: 'var(--panel, #fff)',
                }}
              >
                {AGG_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Baseline value</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step={draft.unit === 'percent' ? 0.1 : 0.01}
                  value={typeof baseline === 'number' ? baseline : ''}
                  onChange={(event) => {
                    const value = event.target.value
                    onDraftChange({ goalStart: value === '' ? undefined : Number(value) })
                  }}
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                    padding: '10px 12px',
                    fontSize: 14,
                  }}
                />
              </label>
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Target value</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step={draft.unit === 'percent' ? 0.1 : 0.01}
                  min={draft.unit === 'percent' ? 0 : undefined}
                  max={draft.unit === 'percent' ? 200 : undefined}
                  value={typeof target === 'number' ? target : ''}
                  onChange={(event) => {
                    const value = event.target.value
                    onDraftChange({ goalEnd: value === '' ? undefined : Number(value) })
                  }}
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                    padding: '10px 12px',
                    fontSize: 14,
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary, #475569)' }}>
                  Specify the end-of-period goal. We'll calculate the delta for you.
                </span>
              </label>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #475569)' }}>{goalSummary}</div>
          </div>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Owning team</span>
              <select
                value={draft.teamId || ''}
                onChange={(event) => onDraftChange({ teamId: event.target.value || undefined })}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                  padding: '10px 12px',
                  fontSize: 14,
                  background: 'var(--panel, #fff)',
                }}
              >
                <option value="">Unassigned</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Linked objective</span>
              <select
                value={draft.objectiveId || ''}
                onChange={(event) => onDraftChange({ objectiveId: event.target.value || undefined })}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                  padding: '10px 12px',
                  fontSize: 14,
                  background: 'var(--panel, #fff)',
                }}
              >
                <option value="">Unmapped</option>
                {objectives.map(obj => (
                  <option key={obj.id} value={obj.id}>{obj.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: canSubmit ? 'var(--accent, #2563eb)' : 'var(--border, rgba(148, 163, 184, 0.45))',
                color: canSubmit ? '#fff' : 'var(--text-secondary, #475569)',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              Add key result
            </button>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 16 }}>Current key results</h4>
        <div style={{ display: 'grid', gap: 8 }}>
          {krs.map(kr => {
            const objective = kr.objectiveId && objectives.find(obj => obj.id === kr.objectiveId)
            const team = kr.teamId && teams.find(t => t.id === kr.teamId)
            const isSeeded = seededKrIds.includes(kr.id)
            return (
              <div
                key={kr.id}
                style={{
                  display: 'grid',
                  gap: 6,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                  background: isSeeded ? 'var(--accent-50, rgba(37,99,235,0.10))' : 'var(--panel, #fff)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{kr.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary, #94a3b8)' }}>{kr.id}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #475569)' }}>
                  {team ? `${team.name} • ` : ''}{kr.unit} • {kr.aggregation}{objective ? ` • ${objective.name}` : ''}
                </div>
                {(kr.goalStart !== undefined || kr.goalEnd !== undefined) && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary, #475569)' }}>
                    Goal: {formatValue(kr.goalStart ?? 0, kr.unit)} → {formatValue(kr.goalEnd ?? 0, kr.unit)}
                  </div>
                )}
              </div>
            )
          })}
          {krs.length === 0 && (
            <div
              style={{
                padding: '16px',
                borderRadius: 10,
                border: '1px dashed var(--border, rgba(148, 163, 184, 0.45))',
                color: 'var(--text-secondary, #475569)',
                fontSize: 14,
              }}
            >
              No key results yet. Add one to continue.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function describeGoalChange(baseline: number, target: number, unit: Unit) {
  if (!Number.isFinite(baseline) || !Number.isFinite(target)) {
    return ''
  }
  if (unit === 'percent') {
    const delta = target - baseline
    return `${delta >= 0 ? '+' : '-'}${Math.abs(delta).toFixed(1)} pts`
  }
  const absoluteDelta = target - baseline
  if (baseline === 0) {
    if (!absoluteDelta) return ''
    return `${absoluteDelta >= 0 ? '+' : '-'}${formatValue(Math.abs(absoluteDelta), unit)}`
  }
  const percentDelta = ((target - baseline) / Math.abs(baseline)) * 100
  if (!Number.isFinite(percentDelta)) return ''
  return `${percentDelta >= 0 ? '+' : ''}${Math.abs(percentDelta).toFixed(1)}%`
}

function formatValue(value: number, unit: Unit) {
  if (!Number.isFinite(value)) return '—'
  if (unit === 'currency') {
    return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  if (unit === 'percent') {
    return `${Number(value).toFixed(1)}%`
  }
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
}
