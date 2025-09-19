import React from 'react'

export function Sparkline({ plan, actual }: { plan: number[]; actual: number[] }): React.ReactElement {
  return <div data-testid="sparkline" data-plan={plan.join(',')} data-actual={actual.join(',')} />
}
