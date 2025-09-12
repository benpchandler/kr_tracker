import React from 'react'

type Props = {
  width?: number
  height?: number
  actual: (number | undefined)[]
  plan: (number | undefined)[]
}

export function Sparkline({ width = 180, height = 40, actual, plan }: Props) {
  const padding = 2
  const w = width - padding * 2
  const h = height - padding * 2
  const values = [...actual, ...plan].filter((v): v is number => typeof v === 'number' && !isNaN(v))
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const rng = max - min || 1

  function toPoint(idx: number, v?: number) {
    const x = values.length <= 1 ? 0 : (idx / Math.max(1, (actual.length - 1))) * w
    const y = v === undefined ? undefined : h - ((v - min) / rng) * h
    return { x: x + padding, y: y !== undefined ? y + padding : undefined }
  }

  function linePath(arr: (number | undefined)[]) {
    const pts = arr.map((v, i) => toPoint(i, v)).filter(p => p.y !== undefined) as {x:number;y:number}[]
    if (pts.length === 0) return ''
    return 'M ' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')
  }

  const planPath = linePath(plan)
  const actualPath = linePath(actual)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect x={0} y={0} width={width} height={height} rx={4} ry={4} fill="#0b1020" stroke="#1f2937" />
      {planPath && <path d={planPath} stroke="#64748b" fill="none" strokeWidth={1} />}
      {actualPath && <path d={actualPath} stroke="#22c55e" fill="none" strokeWidth={1.5} />}
    </svg>
  )
}

