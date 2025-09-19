import React from 'react'
import { WizardStepKey, WizardUIState } from '../../models/types'

export type CompleteSeedSummary = {
  teams: { id: string; name: string }[]
  objectives: { id: string; name: string }[]
  krs: { id: string; name: string }[]
}

export type CompleteStepProps = {
  wizard: WizardUIState
  stats: {
    teams: number
    objectives: number
    krs: number
    initiatives: number
  }
  templateTitle?: string
  seeded: CompleteSeedSummary
  skippedSteps: { key: WizardStepKey; title: string }[]
  onGoToStep: (key: WizardStepKey) => void
  onGoToPlanner: () => void
  onReset: () => void
  onDismissReminder: () => void
}

export function CompleteStep({ wizard, stats, templateTitle, seeded, skippedSteps, onGoToStep, onGoToPlanner, onReset, onDismissReminder }: CompleteStepProps) {
  const hasSkipReminder = skippedSteps.length > 0 && !wizard.reminderAcknowledged
  const completionDate = wizard.completedAt ? new Date(wizard.completedAt) : undefined
  const completionLabel = completionDate ? completionDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : undefined

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>Setup complete</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary, #475569)' }}>
          Nice work! Everything is saved to local storage so you can pick up where you left off. Review the
          highlights below before moving on to plan building or actuals tracking.
        </p>
        {completionLabel && (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary, #94a3b8)' }}>
            Finished on {completionLabel}
          </span>
        )}
      </section>

      {hasSkipReminder && (
        <div
          role="alert"
          style={{
            borderRadius: 10,
            borderLeft: '3px solid var(--danger, #dc2626)',
            background: 'var(--danger-50, rgba(220,38,38,0.12))',
            padding: '16px 18px',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--danger, #dc2626)' }}>
              {skippedSteps.length} {skippedSteps.length === 1 ? 'step needs' : 'steps need'} attention
            </span>
            <button
              type="button"
              onClick={onDismissReminder}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary, #475569)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Dismiss
            </button>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary, #475569)', fontSize: 13, display: 'grid', gap: 4 }}>
            {skippedSteps.map(item => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onGoToStep(item.key)}
                  style={{ border: 'none', background: 'none', color: 'var(--accent, #2563eb)', cursor: 'pointer', padding: 0 }}
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section
        style={{
          display: 'grid',
          gap: 16,
          background: 'var(--panel, #fff)',
          borderRadius: 12,
          border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
          padding: 24,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18 }}>Workspace summary</h3>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <SummaryStat label="Teams" value={stats.teams} />
          <SummaryStat label="Objectives" value={stats.objectives} />
          <SummaryStat label="Key results" value={stats.krs} />
          <SummaryStat label="Initiatives" value={stats.initiatives} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #475569)' }}>
          Template applied: <strong>{templateTitle || 'Custom setup'}</strong>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Seeded items</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <SeedGroup title="Teams" items={seeded.teams} />
          <SeedGroup title="Objectives" items={seeded.objectives} />
          <SeedGroup title="Key results" items={seeded.krs} />
        </div>
      </section>

      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            borderRadius: 8,
            border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
            background: 'transparent',
            color: 'var(--text-primary, #0f172a)',
            padding: '10px 18px',
            cursor: 'pointer',
          }}
        >
          Restart wizard
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={() => onGoToStep('objectives')}
            style={{
              borderRadius: 8,
              border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
              background: 'transparent',
              color: 'var(--text-primary, #0f172a)',
              padding: '10px 18px',
              cursor: 'pointer',
            }}
          >
            Review objectives
          </button>
          <button
            type="button"
            onClick={onGoToPlanner}
            style={{
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent, #2563eb)',
              color: '#fff',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Go to plan builder
          </button>
        </div>
      </section>
    </div>
  )
}

type SummaryStatProps = {
  label: string
  value: number
}

function SummaryStat({ label, value }: SummaryStatProps) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid var(--border, rgba(148, 163, 184, 0.35))',
        padding: '14px 16px',
        background: 'var(--panel, #fff)',
        display: 'grid',
        gap: 6,
      }}
    >
      <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-secondary, #475569)' }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

type SeedGroupProps = {
  title: string
  items: { id: string; name: string }[]
}

function SeedGroup({ title, items }: SeedGroupProps) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      {items.length === 0 ? (
        <span style={{ fontSize: 13, color: 'var(--text-secondary, #475569)' }}>None from template.</span>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary, #475569)', fontSize: 13, display: 'grid', gap: 4 }}>
          {items.map(item => (
            <li key={item.id}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{item.name}</span>
              <span style={{ marginLeft: 8, color: 'var(--text-tertiary, #94a3b8)', fontSize: 12 }}>{item.id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
