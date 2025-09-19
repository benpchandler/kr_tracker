import React from 'react'
import { useDispatch, useStore } from '../../state/store'
import { WizardStepKey, WizardUIState } from '../../models/types'
import { createDefaultWizardState, SETUP_WIZARD_STEPS } from '../../state/store'

export type WizardStepConfig = {
  id: WizardStepKey
  title: string
  description: string
  optional?: boolean
  badge?: string
}

const STEP_CONFIG: WizardStepConfig[] = [
  { id: 'welcome', title: 'Welcome', description: 'Overview and how it works.' },
  { id: 'organization', title: 'Organization', description: 'Set period, teams, and templates.' },
  { id: 'objectives', title: 'Objectives', description: 'Draft focus areas for teams.', optional: true, badge: 'Optional' },
  { id: 'keyResults', title: 'Key Results', description: 'Create measurable outcomes.', optional: true, badge: 'Optional' },
  { id: 'complete', title: 'Complete', description: 'Review setup and next steps.' },
]

const STEP_INDEX: Record<WizardStepKey, number> = SETUP_WIZARD_STEPS.reduce((acc, key, index) => {
  acc[key] = index
  return acc
}, {} as Record<WizardStepKey, number>)

const uniqueSteps = (values: WizardStepKey[]): WizardStepKey[] => Array.from(new Set(values)) as WizardStepKey[]

const firstStepKey = SETUP_WIZARD_STEPS[0]

export function useSetupWizard() {
  const dispatch = useDispatch()
  const state = useStore(s => s)
  const storedWizard = state.ui?.wizard
  const wizard = React.useMemo<WizardUIState>(() => storedWizard ?? createDefaultWizardState(), [storedWizard])

  React.useEffect(() => {
    if (!storedWizard) {
      dispatch({ type: 'UPDATE_WIZARD_UI_STATE', patch: wizard })
    }
  }, [storedWizard, wizard, dispatch])

  const effectiveStep: WizardStepKey = STEP_INDEX[wizard.currentStep as WizardStepKey] !== undefined
    ? (wizard.currentStep as WizardStepKey)
    : firstStepKey

  React.useEffect(() => {
    if (wizard.currentStep !== effectiveStep) {
      dispatch({ type: 'UPDATE_WIZARD_UI_STATE', patch: { currentStep: effectiveStep, lastVisitedStep: effectiveStep } })
    }
  }, [wizard.currentStep, effectiveStep, dispatch])

  const currentStepIndex = STEP_INDEX[effectiveStep] ?? 0
  const currentStep = STEP_CONFIG[currentStepIndex]
  const isLastStep = currentStepIndex === STEP_CONFIG.length - 1

  const updateWizard = React.useCallback((patch: Partial<WizardUIState>) => {
    dispatch({ type: 'UPDATE_WIZARD_UI_STATE', patch })
  }, [dispatch])

  const goToStep = React.useCallback((target: WizardStepKey) => {
    if (STEP_INDEX[target] === undefined) return
    updateWizard({ currentStep: target, lastVisitedStep: target })
  }, [updateWizard])

  const goNext = React.useCallback(() => {
    if (isLastStep) return
    const next = STEP_CONFIG[currentStepIndex + 1]
    const completed = uniqueSteps([...wizard.completedSteps, currentStep.id])
    const filteredSkip = wizard.skippedSteps.filter(step => step !== currentStep.id)
    updateWizard({
      currentStep: next.id,
      lastVisitedStep: next.id,
      completedSteps: completed,
      skippedSteps: filteredSkip,
    })
  }, [isLastStep, currentStepIndex, wizard.completedSteps, wizard.skippedSteps, currentStep.id, updateWizard])

  const goBack = React.useCallback(() => {
    if (currentStepIndex === 0) return
    const prev = STEP_CONFIG[currentStepIndex - 1]
    updateWizard({ currentStep: prev.id, lastVisitedStep: prev.id })
  }, [currentStepIndex, updateWizard])

  const markStepComplete = React.useCallback((step: WizardStepKey) => {
    const completed = uniqueSteps([...wizard.completedSteps, step])
    const filteredSkip = wizard.skippedSteps.filter(s => s !== step)
    updateWizard({ completedSteps: completed, skippedSteps: filteredSkip })
  }, [wizard.completedSteps, wizard.skippedSteps, updateWizard])

  const skipStep = React.useCallback((step: WizardStepKey, reason?: string) => {
    const skipSet = uniqueSteps([...wizard.skippedSteps, step])
    const completedSet = wizard.completedSteps.filter(item => item !== step)
    const currentIndex = STEP_INDEX[step] ?? currentStepIndex
    const nextIndex = Math.min(currentIndex + 1, STEP_CONFIG.length - 1)
    const next = STEP_CONFIG[nextIndex]
    const skipLog = [...wizard.skipLog, { step, atISO: new Date().toISOString(), reason }]
    updateWizard({
      skippedSteps: skipSet,
      completedSteps: uniqueSteps(completedSet),
      currentStep: next.id,
      lastVisitedStep: next.id,
      skipLog,
      reminderAcknowledged: false,
    })
  }, [wizard.skippedSteps, wizard.completedSteps, wizard.skipLog, currentStepIndex, updateWizard])

  const acknowledgeReminder = React.useCallback(() => {
    if (wizard.reminderAcknowledged) return
    updateWizard({ reminderAcknowledged: true })
  }, [wizard.reminderAcknowledged, updateWizard])

  const finishWizard = React.useCallback(() => {
    const completed = uniqueSteps([...wizard.completedSteps, ...SETUP_WIZARD_STEPS])
    updateWizard({
      completedSteps: completed,
      currentStep: 'complete',
      lastVisitedStep: 'complete',
      reminderAcknowledged: true,
      completedAt: new Date().toISOString(),
    })
  }, [updateWizard, wizard.completedSteps])

  const resetWizard = React.useCallback(() => {
    const nextWizard = createDefaultWizardState()
    updateWizard({ ...nextWizard })
  }, [updateWizard])

  return {
    state,
    wizard,
    steps: STEP_CONFIG,
    currentStep,
    currentStepIndex,
    goToStep,
    goNext,
    goBack,
    skipStep,
    markStepComplete,
    acknowledgeReminder,
    finishWizard,
    resetWizard,
    updateWizard,
    isLastStep,
  }
}
