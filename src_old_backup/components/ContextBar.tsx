import React from 'react'
import clsx from 'clsx'
import { useStoreSelector } from '../state/store'
import {
  selectFilteredKRs,
  selectHealthCounts,
  selectPeriodLabel,
  selectPhase,
  selectReportingWeekInfo,
  selectViewContextSummary,
} from '../state/selectors'

// Context bar reference
// ┌───────── primary context ─────────┐
// │ chip • chip • chip • chip │ meta |
// └───────────────────────────────────┘
type ChipTint = 'accent' | 'neutral' | 'success' | 'warning' | 'danger'

const CHIP_TINT_CLASSES: Record<ChipTint, string> = {
  accent: 'bg-[color:var(--accent-50)] text-[color:var(--text)]',
  neutral: 'bg-[color:var(--panel)] text-[color:var(--text)]',
  success: 'bg-[color:var(--success-50)] text-[color:var(--text)]',
  warning: 'bg-[color:var(--warning-50)] text-[color:var(--text)]',
  danger: 'bg-[color:var(--danger-50)] text-[color:var(--text)]',
}
export function ContextBar() {
  const periodLabel = useStoreSelector(selectPeriodLabel)
  const viewSummary = useStoreSelector(selectViewContextSummary)
  const reportingWeek = useStoreSelector(selectReportingWeekInfo)
  const phase = useStoreSelector(selectPhase)
  const healthCounts = useStoreSelector(selectHealthCounts)
  const filteredCount = useStoreSelector(state => selectFilteredKRs(state).length)

  const reportingValue = reportingWeek ? reportingWeek.iso : '—'
  const reportingSecondary = reportingWeek?.dateLabel
  const phaseLabel = phase.charAt(0).toUpperCase() + phase.slice(1)

  return (
    <section className="context-bar" aria-label="Current context">
      <div className="context-bar__inner">
        <div className="context-bar__primary">
          <ContextChip
            icon={iconForView(viewSummary.level)}
            label="View"
            value={viewSummary.primaryLabel}
            secondary={`${filteredCount} KR${filteredCount === 1 ? '' : 's'}`}
            tint="accent"
          />
          <Separator />
          <ContextChip icon="🗓️" label="Period" value={periodLabel} tint="neutral" />
          <Separator />
          <ContextChip
            icon={phase === 'execution' ? '🚀' : '📝'}
            label="Phase"
            value={phaseLabel}
            tint={phase === 'execution' ? 'success' : 'warning'}
          />
          <Separator />
          <ContextChip
            icon="📅"
            label="Reporting"
            value={reportingValue}
            secondary={reportingSecondary}
            tint="neutral"
          />
        </div>

        <div className="context-bar__health">
          <HealthPill icon="🟢" label="Healthy" count={healthCounts.green} tint="success" />
          <HealthPill icon="⚠️" label="At Risk" count={healthCounts.yellow} tint="warning" />
          <HealthPill icon="🔴" label="Off Track" count={healthCounts.red} tint="danger" />
        </div>
      </div>
    </section>
  )
}
type ContextChipProps = {
  icon: string
  label: string
  value: string
  secondary?: string
  tint: ChipTint
}

function ContextChip({ icon, label, value, secondary, tint }: ContextChipProps) {
  return (
    <div className="context-chip flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className={clsx('context-chip__icon flex h-6 w-6 items-center justify-center rounded-full text-sm', CHIP_TINT_CLASSES[tint])}
      >
        {icon}
      </span>
      <div className="context-chip__copy flex min-w-0 flex-col">
        <span className="context-chip__label text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          {label}
        </span>
        <span className="context-chip__value truncate text-sm font-medium text-[color:var(--text)]" title={value}>
          {value}
        </span>
        {secondary && (
          <span className="context-chip__secondary truncate text-xs text-[color:var(--text-secondary)]">{secondary}</span>
        )}
      </div>
    </div>
  )
}

type HealthPillProps = {
  icon: string
  label: string
  count: number
  tint: ChipTint
}

function HealthPill({ icon, label, count, tint }: HealthPillProps) {
  return (
    <div
      className={clsx(
        'health-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold',
        CHIP_TINT_CLASSES[tint]
      )}
      aria-label={`${label}: ${count}`}
    >
      <span aria-hidden className="health-pill__icon">{icon}</span>
      <span className="health-pill__label">{label}</span>
      <span className="health-pill__count">{count}</span>
    </div>
  )
}

function Separator() {
  return (
    <span className="context-bar__separator" aria-hidden>
      •
    </span>
  )
}

type ViewLevel = ReturnType<typeof selectViewContextSummary>['level']

function iconForView(level: ViewLevel) {
  switch (level) {
    case 'team':
      return '👥'
    case 'pod':
      return '🧩'
    case 'individual':
      return '👤'
    case 'settings':
      return '⚙️'
    case 'setup':
      return '🛠️'
    case 'organization':
    default:
      return '🌐'
  }
}
