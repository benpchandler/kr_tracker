import React from 'react'
import { ID, WaterfallConfig, WaterfallScenarioKey } from '../models/types'
import { useStore } from '../state/store'
import { buildWaterfallSeries, WaterfallComputationResult } from '../metrics/waterfall'

type UseWaterfallDataArgs = {
  krId: ID
  scenario?: WaterfallScenarioKey
}

export type WaterfallHookResult = {
  activeScenario: WaterfallScenarioKey
  config?: WaterfallConfig
  result: WaterfallComputationResult
  annotations: WaterfallConfig['annotations']
}

export function useWaterfallData({ krId, scenario }: UseWaterfallDataArgs): WaterfallHookResult {
  const state = useStore()
  const config = state.waterfall?.configs[krId]

  const activeScenario = React.useMemo<WaterfallScenarioKey>(() => {
    if (scenario) return scenario
    if (state.waterfall?.scenarioSelections?.[krId]) return state.waterfall.scenarioSelections[krId]
    return config?.defaultScenario ?? 'plan'
  }, [scenario, state.waterfall, krId, config?.defaultScenario])

  const result = React.useMemo<WaterfallComputationResult>(() => {
    return buildWaterfallSeries(state, krId, activeScenario)
  }, [state, krId, activeScenario])

  return {
    activeScenario,
    config,
    result,
    annotations: config?.annotations || [],
  }
}
