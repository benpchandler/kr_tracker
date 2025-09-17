import React from 'react'
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar, Line, ReferenceLine, Cell } from 'recharts'
import { ID, WaterfallScenarioKey } from '../../models/types'
import { useWaterfallData } from '../../hooks/useWaterfallData'

const DEFAULT_HEIGHT = 320
const POSITIVE_COLOR = '#2E86AB'
const NEGATIVE_COLOR = '#C0392B'
const BASELINE_COLOR = '#6C757D'
const GAP_POSITIVE_COLOR = '#1E8449'
const GAP_NEGATIVE_COLOR = '#C0392B'

type Props = {
  krId: ID
  scenario?: WaterfallScenarioKey
  height?: number
  className?: string
}

type ChartDatum = {
  key: string
  label: string
  range: [number, number]
  deltaActual: number
  isNegative: boolean
  cumulative: number
  renderTotal: boolean
  fill: string
}

export function WaterfallChart({ krId, scenario, height = DEFAULT_HEIGHT, className }: Props) {
  const { result } = useWaterfallData({ krId, scenario })

  const data = React.useMemo<ChartDatum[]>(() => {
    return result.steps.map(step => {
      const isTotal = step.renderAsTotal
      const previous = isTotal ? 0 : step.previousValue
      const next = step.nextValue
      const deltaActual = next - (isTotal ? 0 : step.previousValue)
      const isNegative = !isTotal && deltaActual < 0

      let fill = step.color
      if (!fill) {
        if (step.kind === 'baseline') fill = BASELINE_COLOR
        else if (step.kind === 'gap') fill = isNegative ? GAP_NEGATIVE_COLOR : GAP_POSITIVE_COLOR
        else fill = isNegative ? NEGATIVE_COLOR : POSITIVE_COLOR
      }

      const low = Math.min(previous, next)
      const high = Math.max(previous, next)

      return {
        key: step.id,
        label: step.label,
        range: [low, high],
        deltaActual,
        isNegative,
        cumulative: step.nextValue,
        renderTotal: isTotal,
        fill,
      }
    })
  }, [result.steps])

  const formatter = React.useCallback((value: number) => {
    if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }, [])

  const tooltipFormatter = React.useCallback(
    (value: number | string, name: string, payload: any) => {
      if (!name) return ['', '']
      if (typeof value !== 'number') return [value, name]
      if (name === 'Cumulative') return [formatter(value), 'Cumulative']
      const datum: ChartDatum | undefined = payload?.payload
      if (!datum) return [formatter(value), name]
      const label = datum.renderTotal ? 'Total' : 'Change'
      return [formatter(datum.deltaActual), label]
    },
    [formatter]
  )

  return (
    <div className={className} aria-label="Waterfall chart">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 24, bottom: 32, left: 16, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" interval={0} tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(value: number) => formatter(value)} width={72} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={label => label as string} />
          <ReferenceLine y={result.baseline} stroke={BASELINE_COLOR} strokeDasharray="4 4" label={{ value: 'Baseline', position: 'left', fill: BASELINE_COLOR }} />
          <ReferenceLine y={result.target} stroke={GAP_POSITIVE_COLOR} strokeDasharray="2 2" label={{ value: 'Target', position: 'left', fill: GAP_POSITIVE_COLOR }} />
          <Bar dataKey="range" name="Contribution" isAnimationActive={false}>
            {data.map(datum => (
              <Cell key={datum.key} fill={datum.fill} fillOpacity={datum.renderTotal ? 0.85 : 1} />
            ))}
          </Bar>
          <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#34495E" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
