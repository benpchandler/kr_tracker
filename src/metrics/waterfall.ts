import { AppState, ID, Initiative, WaterfallScenarioKey, WaterfallSeries, WaterfallStepKind } from '../models/types'

const EPSILON = 1e-9

type DeltaBuildResult = {
  steps: WaterfallStepData[]
  finalValue: number
}

export type WaterfallStepData = {
  id: ID
  label: string
  kind: WaterfallStepKind
  previousValue: number
  deltaValue: number
  nextValue: number
  renderAsTotal: boolean
  color?: string
  totalValue?: number
}

export type WaterfallComputationResult = {
  scenario: WaterfallScenarioKey
  seriesName: string
  steps: WaterfallStepData[]
  baseline: number
  subtotal: number
  target: number
  gap: number
}

export function buildWaterfallSeries(state: AppState, krId: ID, scenario: WaterfallScenarioKey): WaterfallComputationResult {
  const kr = state.krs.find(k => k.id === krId)
  const baselineValue = typeof kr?.goalStart === 'number' ? kr.goalStart : 0
  const targetValue = typeof kr?.goalEnd === 'number' ? kr.goalEnd : baselineValue
  const config = state.waterfall?.configs[krId]

  const definition = config?.scenarios?.[scenario]
  const deltaResult = definition
    ? buildStepsFromConfig(definition, state.initiatives, krId, baselineValue)
    : buildFallbackSteps(state.initiatives, krId, baselineValue)

  const steps: WaterfallStepData[] = []

  // Baseline column
  steps.push(makeBaselineStep(krId, baselineValue))

  // Initiative / configured deltas
  steps.push(...deltaResult.steps)

  const subtotalValue = deltaResult.finalValue
  steps.push(makeTotalStep(`${krId}-subtotal`, 'Subtotal', 'subtotal', subtotalValue))

  const gapValue = targetValue - subtotalValue
  if (Math.abs(gapValue) > EPSILON) {
    steps.push({
      id: `${krId}-gap`,
      label: gapValue >= 0 ? 'Gap to goal' : 'Surplus to goal',
      kind: 'gap',
      previousValue: subtotalValue,
      deltaValue: gapValue,
      nextValue: subtotalValue + gapValue,
      renderAsTotal: false,
      color: gapValue >= 0 ? undefined : '#1E8449',
    })
  }

  steps.push(makeTotalStep(`${krId}-target`, 'Target', 'total', targetValue))

  return {
    scenario,
    seriesName: definition?.name ?? 'Plan impact',
    steps,
    baseline: baselineValue,
    subtotal: subtotalValue,
    target: targetValue,
    gap: gapValue,
  }
}

function buildStepsFromConfig(series: WaterfallSeries, initiatives: Initiative[], krId: ID, startValue: number): DeltaBuildResult {
  const steps: WaterfallStepData[] = []
  let running = startValue

  series.steps.forEach(step => {
    const delta = deriveValueForStep(step.sourceInitiativeIds, initiatives, krId)
    const previous = running
    const next = running + delta
    steps.push({
      id: step.id,
      label: step.label,
      kind: step.kind ?? 'delta',
      previousValue: previous,
      deltaValue: delta,
      nextValue: next,
      renderAsTotal: false,
      color: step.color,
    })
    running = next
  })

  return { steps, finalValue: running }
}

function buildFallbackSteps(initiatives: Initiative[], krId: ID, startValue: number): DeltaBuildResult {
  const filtered = initiatives.filter(i => i.krId === krId)
  const steps: WaterfallStepData[] = []
  let running = startValue

  filtered.forEach(init => {
    const previous = running
    const next = running + init.impact
    steps.push({
      id: init.id,
      label: init.name,
      kind: 'delta',
      previousValue: previous,
      deltaValue: init.impact,
      nextValue: next,
      renderAsTotal: false,
    })
    running = next
  })

  return { steps, finalValue: running }
}

function deriveValueForStep(sourceIds: ID[] | undefined, initiatives: Initiative[], krId: ID): number {
  if (!sourceIds || sourceIds.length === 0) {
    const fallback = initiatives.filter(i => i.krId === krId)
    return fallback.reduce((sum, item) => sum + item.impact, 0)
  }
  return sourceIds.reduce((sum, id) => {
    const match = initiatives.find(i => i.id === id)
    if (!match) return sum
    return sum + match.impact
  }, 0)
}

function makeBaselineStep(krId: ID, baselineValue: number): WaterfallStepData {
  return {
    id: `${krId}-baseline`,
    label: 'Baseline',
    kind: 'baseline',
    previousValue: 0,
    deltaValue: baselineValue,
    nextValue: baselineValue,
    renderAsTotal: true,
    totalValue: baselineValue,
  }
}

function makeTotalStep(id: ID, label: string, kind: WaterfallStepKind, total: number): WaterfallStepData {
  return {
    id,
    label,
    kind,
    previousValue: total,
    deltaValue: total,
    nextValue: total,
    renderAsTotal: true,
    totalValue: total,
  }
}
