const STORAGE_KEY = 'kr-tracker-state-v3'
const LEGACY_STORAGE_KEYS = ['kr-tracker-state-v2', 'kr-tracker-state-v1'] as const

const HEALTH_THRESHOLDS = {
  healthy: 0.99,
  atRisk: 0.95,
} as const

const DEFAULT_NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

export function formatNumeric(value: number | null | undefined, options?: { fallback?: string; maximumFractionDigits?: number }) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return options?.fallback ?? '—'
  }
  const format = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? DEFAULT_NUMBER_FORMAT.resolvedOptions().maximumFractionDigits,
  })
  return format.format(value)
}

export { STORAGE_KEY, LEGACY_STORAGE_KEYS, HEALTH_THRESHOLDS, DEFAULT_NUMBER_FORMAT }
