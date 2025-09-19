import React from 'react'
import { SetupWizard } from '../components/SetupWizard'

export function Setup() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <SetupWizard />
    </div>
  )
}
