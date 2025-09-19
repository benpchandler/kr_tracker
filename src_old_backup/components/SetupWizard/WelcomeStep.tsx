import React from 'react'

export type WelcomeStepProps = {
  organizationName?: string
  periodLabel?: string
  stats: {
    teams: number
    objectives: number
    krs: number
    individuals: number
  }
}

export function WelcomeStep({ organizationName, periodLabel, stats }: WelcomeStepProps) {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 24 }}>Welcome {organizationName ? `back to ${organizationName}` : 'to the setup wizard'}</h2>
        <p style={{ marginTop: 8, color: 'var(--text-secondary, #475569)', maxWidth: 600 }}>
          We will walk through five quick steps to configure your workspace, seed starting data, and confirm
          your OKR tracking defaults. You can revisit any step using the navigation rail.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
        }}
      >
        <WelcomeStat label="Period" value={periodLabel || 'Unset'} />
        <WelcomeStat label="Teams" value={String(stats.teams)} />
        <WelcomeStat label="Objectives" value={String(stats.objectives)} />
        <WelcomeStat label="Key Results" value={String(stats.krs)} />
        <WelcomeStat label="People" value={String(stats.individuals)} />
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>What we will cover</h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary, #475569)', display: 'grid', gap: 6 }}>
          <li>Confirm organization basics and apply an optional starter template.</li>
          <li>Draft objectives aligned to your teams.</li>
          <li>Create measurable key results with right-sized targets.</li>
          <li>Review reminders and next steps before launching.</li>
        </ol>
      </div>
    </div>
  )
}

type WelcomeStatProps = {
  label: string
  value: string
}

function WelcomeStat({ label, value }: WelcomeStatProps) {
  return (
    <div
      style={{
        border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
        borderRadius: 12,
        padding: '16px 18px',
        background: 'var(--panel, #fff)',
        display: 'grid',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-secondary, #475569)' }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{value}</span>
    </div>
  )
}
