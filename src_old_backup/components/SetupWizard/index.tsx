import React from 'react'
import { useDispatch } from '../../state/store'
import { useSetupWizard } from './useSetupWizard'
import { getOrganizationTemplate, ORGANIZATION_TEMPLATES } from '../../lib/templates/organizationTemplates'
import { ConfirmDialog } from './ConfirmDialog'
import { WelcomeStep } from './WelcomeStep'
import { OrganizationStep } from './OrganizationStep'
import { ObjectivesStep, ObjectiveSuggestion } from './ObjectivesStep'
import { KeyResultsStep } from './KeyResultsStep'
import { CompleteStep, CompleteSeedSummary } from './CompleteStep'
import {
  AppState,
  ID,
  WizardObjectiveDraft,
  WizardKeyResultDraft,
  WizardStepKey,
  WizardUIState,
} from '../../models/types'

const randomSuffix = () => Math.random().toString(36).slice(2, 8)

const generateLocalId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${randomSuffix()}`

const generateKrId = (periodStart?: string) => {
  const now = new Date()
  const baseDate = periodStart ? new Date(periodStart) : now
  const year = baseDate.getUTCFullYear()
  const month = baseDate.getUTCMonth() + 1
  const quarter = Math.floor((month - 1) / 3) + 1
  return `kr-${year}Q${quarter}-${Date.now().toString(36)}${randomSuffix()}`
}

const TEAM_COLOR_CYCLE = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#0ea5e9', '#dc2626']

const createObjectiveDraft = (): WizardObjectiveDraft => ({
  id: generateLocalId('objdraft'),
  name: '',
})

const createKeyResultDraft = (): WizardKeyResultDraft => ({
  id: generateLocalId('krdraft'),
  name: '',
  unit: 'count',
  aggregation: 'cumulative',
  goalStart: undefined,
  goalEnd: undefined,
})

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(query).matches
  })

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia(query)
    const handleChange = () => setMatches(media.matches)
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [query])

  return matches
}
export function SetupWizard() {
  const dispatch = useDispatch()
  const {
    state,
    wizard,
    steps,
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
  } = useSetupWizard()

  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [errors, setErrors] = React.useState<string[]>([])
  const [skipModalOpen, setSkipModalOpen] = React.useState(false)
  const [templateModal, setTemplateModal] = React.useState<{ open: boolean; templateId?: string }>({ open: false })
  const [restartModalOpen, setRestartModalOpen] = React.useState(false)

  React.useEffect(() => {
    if (wizard.objectives.drafts.length === 0) {
      updateWizard({ objectives: { drafts: [createObjectiveDraft()] } })
    }
    if (wizard.keyResults.drafts.length === 0) {
      updateWizard({ keyResults: { drafts: [createKeyResultDraft()] } })
    }
  }, [wizard.objectives.drafts.length, wizard.keyResults.drafts.length, updateWizard])

  React.useEffect(() => {
    setErrors([])
  }, [currentStep.id])

  const objectiveDraft = wizard.objectives.drafts[0] ?? createObjectiveDraft()
  const keyResultDraft = wizard.keyResults.drafts[0] ?? createKeyResultDraft()

  const organizationName = wizard.organization.name || state.organization?.name || ''
  const appliedTemplate = wizard.organization.templateId ? getOrganizationTemplate(wizard.organization.templateId) : undefined

  const objectiveSuggestions: ObjectiveSuggestion[] = React.useMemo(() => {
    if (!appliedTemplate) return []
    const existing = new Set(state.objectives.map(obj => obj.name.toLowerCase()))
    return appliedTemplate.seeded.objectives
      .filter(obj => !existing.has(obj.name.toLowerCase()))
      .map(obj => ({ id: obj.key, name: obj.name }))
  }, [appliedTemplate, state.objectives])

  const skippedStepsDetailed = wizard.skippedSteps.map(stepKey => {
    const target = steps.find(step => step.id === stepKey)
    return { key: stepKey, title: target?.title ?? stepKey }
  })

  const seededSummary: CompleteSeedSummary = React.useMemo(() => ({
    teams: state.teams
      .filter(team => wizard.seeded.teamIds.includes(team.id))
      .map(team => ({ id: team.id, name: team.name })),
    objectives: state.objectives
      .filter(obj => wizard.seeded.objectiveIds.includes(obj.id))
      .map(obj => ({ id: obj.id, name: obj.name })),
    krs: state.krs
      .filter(kr => wizard.seeded.krIds.includes(kr.id))
      .map(kr => ({ id: kr.id, name: kr.name })),
  }), [state.teams, state.objectives, state.krs, wizard.seeded])

  const removeSeededEntities = React.useCallback((seeded: WizardUIState['seeded']) => {
    if (!seeded.teamIds.length && !seeded.objectiveIds.length && !seeded.krIds.length) return
    const nextPlanDraft = { ...state.planDraft }
    const nextActuals = { ...state.actuals }
    const nextPlanMeta = state.planMeta ? { ...state.planMeta } : undefined
    const nextActualMeta = state.actualMeta ? { ...state.actualMeta } : undefined
    seeded.krIds.forEach(id => {
      delete nextPlanDraft[id]
      delete nextActuals[id]
      if (nextPlanMeta) delete nextPlanMeta[id]
      if (nextActualMeta) delete nextActualMeta[id]
    })

    const nextState: AppState = {
      ...state,
      teams: state.teams.filter(team => !seeded.teamIds.includes(team.id)),
      objectives: state.objectives.filter(obj => !seeded.objectiveIds.includes(obj.id)),
      krs: state.krs.filter(kr => !seeded.krIds.includes(kr.id)),
      initiatives: state.initiatives.filter(init => !seeded.krIds.includes(init.krId)),
      planDraft: nextPlanDraft,
      actuals: nextActuals,
      planMeta: nextPlanMeta,
      actualMeta: nextActualMeta,
    }

    dispatch({ type: 'HYDRATE', full: nextState })
  }, [dispatch, state])

  const scrollToPlanBuilder = React.useCallback(() => {
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      const el = document.querySelector('[data-plan-builder-panel]')
      if (el && 'scrollIntoView' in el) {
        ;(el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }, [])

  const applyTemplate = React.useCallback((templateId: string) => {
    const template = getOrganizationTemplate(templateId)
    if (!template) return

    if (wizard.seeded.teamIds.length || wizard.seeded.objectiveIds.length || wizard.seeded.krIds.length) {
      removeSeededEntities(wizard.seeded)
    }

    const teamKeyMap = new Map<string, string>()
    const newTeamIds: string[] = []
    template.seeded.teams.forEach(team => {
      const id = generateLocalId('team')
      dispatch({ type: 'ADD_TEAM', team: { id, name: team.name, color: team.color } })
      teamKeyMap.set(team.key, id)
      newTeamIds.push(id)
    })

    const objectiveKeyMap = new Map<string, string>()
    const newObjectiveIds: string[] = []
    template.seeded.objectives.forEach(obj => {
      const id = generateLocalId('obj')
      const teamIds = (obj.teamKeys || [])
        .map(teamKey => teamKeyMap.get(teamKey))
        .filter((value): value is string => Boolean(value))
      dispatch({ type: 'ADD_OBJECTIVE', obj: { id, name: obj.name, teamIds } })
      objectiveKeyMap.set(obj.key, id)
      newObjectiveIds.push(id)
    })

    const newKrIds: string[] = []
    template.seeded.keyResults.forEach(kr => {
      const id = generateKrId(state.period.startISO)
      const teamId = kr.teamKey ? teamKeyMap.get(kr.teamKey) : undefined
      const objectiveId = kr.objectiveKey ? objectiveKeyMap.get(kr.objectiveKey) : undefined
      dispatch({
        type: 'ADD_KR',
        kr: {
          id,
          name: kr.name,
          unit: kr.unit,
          aggregation: kr.aggregation,
          teamId,
          objectiveId,
          goalStart: kr.goalStart,
          goalEnd: kr.goalEnd,
        },
      })
      newKrIds.push(id)
    })

    if ((!wizard.organization.name || !wizard.organization.name.trim()) && template.seeded.organizationName) {
      const currentOrg = state.organization
      if (currentOrg) {
        dispatch({ type: 'SET_ORGANIZATION', org: { ...currentOrg, name: template.seeded.organizationName } })
      } else {
        dispatch({ type: 'SET_ORGANIZATION', org: { id: generateLocalId('org'), name: template.seeded.organizationName } })
      }
    }

    updateWizard({
      organization: {
        ...wizard.organization,
        name: wizard.organization.name || template.seeded.organizationName || wizard.organization.name,
        templateId: template.id,
      },
      seeded: {
        templateId: template.id,
        pendingTemplateId: undefined,
        teamIds: newTeamIds,
        objectiveIds: newObjectiveIds,
        krIds: newKrIds,
        lastSeededAt: new Date().toISOString(),
        resetRequired: false,
      },
    })

    setErrors([])
    setTemplateModal({ open: false, templateId: undefined })
  }, [dispatch, wizard, state.organization, state.period.startISO, updateWizard, removeSeededEntities])

  const handleOrganizationNameChange = React.useCallback((value: string) => {
    updateWizard({ organization: { ...wizard.organization, name: value } })
    const trimmed = value.trim()
    if (!trimmed) return
    const currentOrg = state.organization
    if (currentOrg) {
      if (currentOrg.name !== trimmed) {
        dispatch({ type: 'SET_ORGANIZATION', org: { ...currentOrg, name: trimmed } })
      }
    } else {
      dispatch({ type: 'SET_ORGANIZATION', org: { id: generateLocalId('org'), name: trimmed } })
    }
  }, [dispatch, state.organization, updateWizard, wizard.organization])

  const handlePeriodChange = React.useCallback((patch: { startISO?: string; endISO?: string }) => {
    const start = patch.startISO ?? state.period.startISO
    const end = patch.endISO ?? state.period.endISO
    dispatch({ type: 'SET_PERIOD', startISO: start, endISO: end })
  }, [dispatch, state.period])

  const handleTemplateSelect = React.useCallback((templateId: string) => {
    const hasSeeded = wizard.seeded.teamIds.length || wizard.seeded.objectiveIds.length || wizard.seeded.krIds.length
    if (hasSeeded) {
      updateWizard({ seeded: { ...wizard.seeded, pendingTemplateId: templateId } })
      setTemplateModal({ open: true, templateId })
      return
    }
    applyTemplate(templateId)
  }, [wizard.seeded, updateWizard, applyTemplate])

  const handleCreateTeam = React.useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return { ok: false as const, error: 'Team name is required.' }
    }
    const exists = state.teams.some(team => team.name.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      return { ok: false as const, error: 'A team with that name already exists.' }
    }
    const color = TEAM_COLOR_CYCLE[state.teams.length % TEAM_COLOR_CYCLE.length]
    const teamId = generateLocalId('team')
    dispatch({ type: 'ADD_TEAM', team: { id: teamId, name: trimmed, color } })
    return { ok: true as const, teamId }
  }, [dispatch, state.teams])

  const handleObjectiveDraftChange = React.useCallback((patch: Partial<WizardObjectiveDraft>) => {
    const next = { ...objectiveDraft, ...patch }
    updateWizard({ objectives: { drafts: [next] } })
  }, [objectiveDraft, updateWizard])

  const handleAddObjective = React.useCallback(() => {
    const name = objectiveDraft.name?.trim()
    if (!name) return
    const teamIds = objectiveDraft.teamId ? [objectiveDraft.teamId] : []
    dispatch({ type: 'ADD_OBJECTIVE', obj: { id: generateLocalId('obj'), name, teamIds } })
    updateWizard({ objectives: { drafts: [createObjectiveDraft()] } })
  }, [dispatch, objectiveDraft, updateWizard])

  const handleKeyResultDraftChange = React.useCallback((patch: Partial<WizardKeyResultDraft>) => {
    const next = { ...keyResultDraft, ...patch }
    updateWizard({ keyResults: { drafts: [next] } })
  }, [keyResultDraft, updateWizard])

  const handleAddKeyResult = React.useCallback(() => {
    const name = keyResultDraft.name?.trim()
    if (!name) return
    const goalStart = Number.isFinite(keyResultDraft.goalStart) ? keyResultDraft.goalStart : undefined
    const goalEnd = Number.isFinite(keyResultDraft.goalEnd) ? keyResultDraft.goalEnd : undefined
    if (goalStart === undefined || goalEnd === undefined) return
    dispatch({
      type: 'ADD_KR',
      kr: {
        id: generateKrId(state.period.startISO),
        name,
        unit: keyResultDraft.unit,
        aggregation: keyResultDraft.aggregation,
        teamId: keyResultDraft.teamId,
        objectiveId: keyResultDraft.objectiveId,
        goalStart,
        goalEnd,
      },
    })
    updateWizard({ keyResults: { drafts: [{ ...createKeyResultDraft(), unit: keyResultDraft.unit, aggregation: keyResultDraft.aggregation }] } })
  }, [dispatch, keyResultDraft, state.period.startISO, updateWizard])

  const validateStep = React.useCallback((step: WizardStepKey) => {
    const issues: string[] = []
    if (step === 'organization') {
      if (!organizationName.trim()) issues.push('Add an organization name to continue.')
      if (!state.period.startISO || !state.period.endISO) issues.push('Set both period start and end dates.')
      if (state.period.startISO && state.period.endISO && state.period.startISO > state.period.endISO) {
        issues.push('Period start must occur before the end date.')
      }
    }
    if (step === 'objectives') {
      if (state.objectives.length === 0) issues.push('Add at least one objective before moving on.')
    }
    if (step === 'keyResults') {
      if (state.krs.length === 0) issues.push('Add at least one key result before continuing.')
    }
    return issues
  }, [organizationName, state.period, state.objectives.length, state.krs.length])

  const progressIndex = (() => {
    const completedIndices = wizard.completedSteps
      .map(stepId => steps.findIndex(step => step.id === stepId))
      .filter(index => index >= 0)
    const furthestCompleted = completedIndices.length ? Math.max(...completedIndices) : -1
    return Math.max(furthestCompleted, currentStepIndex)
  })()
  const progressPercent = steps.length > 1 ? (progressIndex / (steps.length - 1)) * 100 : 100
  const primaryCtaLabel = isLastStep ? (wizard.completedAt ? 'View plan builder' : 'Finish') : 'Next'

  const handleNext = () => {
    const issues = validateStep(currentStep.id)
    if (issues.length) {
      setErrors(issues)
      return
    }
    setErrors([])
    markStepComplete(currentStep.id)
    if (isLastStep) {
      if (wizard.completedAt) {
        handleGoToPlanner()
        return
      }
      finishWizard()
      dispatch({ type: 'SET_PHASE', phase: 'planning' })
      dispatch({
        type: 'SET_VIEW_FILTER',
        filter: { level: 'organization', targetId: state.organization?.id },
      })
      scrollToPlanBuilder()
      return
    }
    goNext()
  }

  const handleBack = () => {
    setErrors([])
    goBack()
  }

  const handleConfirmSkip = () => {
    skipStep(currentStep.id, 'Skipped during setup')
    setSkipModalOpen(false)
    setErrors([])
  }

  const handleTemplateConfirm = () => {
    if (templateModal.templateId) {
      applyTemplate(templateModal.templateId)
    } else {
      setTemplateModal({ open: false, templateId: undefined })
    }
  }

  const handleTemplateCancel = () => {
    setTemplateModal({ open: false, templateId: undefined })
    updateWizard({ seeded: { ...wizard.seeded, pendingTemplateId: undefined, resetRequired: false } })
  }

  const handleGoToPlanner = React.useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'planning' })
    dispatch({
      type: 'SET_VIEW_FILTER',
      filter: { level: 'organization', targetId: state.organization?.id },
    })
    scrollToPlanBuilder()
  }, [dispatch, state.organization?.id, scrollToPlanBuilder])

  const handleRequestRestart = React.useCallback(() => {
    setRestartModalOpen(true)
  }, [])

  const handleConfirmRestart = React.useCallback(() => {
    removeSeededEntities(wizard.seeded)
    resetWizard()
    setErrors([])
    setRestartModalOpen(false)
  }, [removeSeededEntities, resetWizard, wizard.seeded])

  const handleCancelRestart = React.useCallback(() => {
    setRestartModalOpen(false)
  }, [])

  const stats = {
    teams: state.teams.length,
    objectives: state.objectives.length,
    krs: state.krs.length,
    initiatives: state.initiatives.length,
    individuals: state.individuals.length,
  }

  const currentStepContent = (() => {
    switch (currentStep.id) {
      case 'welcome':
        return (
          <WelcomeStep
            organizationName={organizationName}
            periodLabel={state.period.startISO && state.period.endISO ? `${state.period.startISO} → ${state.period.endISO}` : undefined}
            stats={{ teams: stats.teams, objectives: stats.objectives, krs: stats.krs, individuals: stats.individuals }}
          />
        )
      case 'organization':
        return (
          <OrganizationStep
            organization={wizard.organization}
            organizationName={organizationName}
            period={state.period}
            templates={ORGANIZATION_TEMPLATES}
            selectedTemplateId={wizard.organization.templateId}
            pendingTemplateId={wizard.seeded.pendingTemplateId}
            seededTemplateId={wizard.seeded.templateId}
            seededTeamCount={wizard.seeded.teamIds.length}
            existingTeams={state.teams}
            onCreateTeam={handleCreateTeam}
            onOrganizationNameChange={handleOrganizationNameChange}
            onPeriodChange={handlePeriodChange}
            onTemplateSelect={handleTemplateSelect}
          />
        )
      case 'objectives':
        return (
          <ObjectivesStep
            draft={objectiveDraft}
            onDraftChange={handleObjectiveDraftChange}
            onSubmit={handleAddObjective}
            suggestions={objectiveSuggestions}
            teams={state.teams}
            objectives={state.objectives}
            seededObjectiveIds={wizard.seeded.objectiveIds}
          />
        )
      case 'keyResults':
        return (
          <KeyResultsStep
            draft={keyResultDraft}
            onDraftChange={handleKeyResultDraftChange}
            onSubmit={handleAddKeyResult}
            teams={state.teams}
            objectives={state.objectives}
            krs={state.krs}
            seededKrIds={wizard.seeded.krIds}
          />
        )
      case 'complete':
      default:
        return (
          <CompleteStep
            wizard={wizard}
            stats={stats}
            templateTitle={appliedTemplate?.title}
            seeded={seededSummary}
            skippedSteps={skippedStepsDetailed}
            onGoToStep={goToStep}
            onGoToPlanner={handleGoToPlanner}
            onReset={handleRequestRestart}
            onDismissReminder={() => acknowledgeReminder()}
          />
        )
    }
  })()

  const containerStyle: React.CSSProperties = isDesktop
    ? { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32, alignItems: 'start' }
    : { display: 'grid', gap: 24 }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ height: 4, background: 'var(--border, rgba(148, 163, 184, 0.35))', borderRadius: 999 }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, progressPercent))}%`,
            background: 'var(--accent, #2563eb)',
            borderRadius: 999,
            transition: 'width 0.25s ease',
          }}
        />
      </div>

      <div style={containerStyle}>
        <aside style={{ display: 'grid', gap: 24 }}>
          <nav style={{ display: 'grid', gap: 16 }}>
            {steps.map((step, index) => {
              const isCompleted = wizard.completedSteps.includes(step.id)
              const isCurrent = step.id === currentStep.id
              const isFuture = index > currentStepIndex
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id)}
                  style={{
                    textAlign: 'left',
                    display: 'grid',
                    gap: 4,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <StepChip index={index + 1} state={isCompleted ? 'done' : isCurrent ? 'current' : 'future'} />
                    <div>
                      <div style={{ fontWeight: isCurrent ? 700 : 600, color: isFuture ? 'var(--text-secondary, #475569)' : 'var(--text-primary, #0f172a)' }}>
                        {step.title}
                        {step.badge && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 999,
                              background: 'var(--warning-50, rgba(234,179,8,0.2))',
                              color: 'var(--warning, #d97706)',
                            }}
                          >
                            {step.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary, #475569)' }}>{step.description}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>
        </aside>

        <main style={{ display: 'grid', gap: 24 }}>
          {errors.length > 0 && (
            <div
              role="alert"
              style={{
                borderRadius: 8,
                borderLeft: '3px solid var(--danger, #dc2626)',
                background: 'var(--danger-50, rgba(220,38,38,0.12))',
                padding: '12px 16px',
                display: 'grid',
                gap: 6,
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--danger, #dc2626)' }}>Resolve the following before continuing:</span>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary, #475569)', fontSize: 13, display: 'grid', gap: 4 }}>
                {errors.map(issue => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {currentStepContent}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              {currentStep.optional && currentStep.id !== 'complete' && (
                <button
                  type="button"
                  onClick={() => setSkipModalOpen(true)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-secondary, #475569)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Skip step
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                  background: 'transparent',
                  color: 'var(--text-primary, #0f172a)',
                  padding: '10px 18px',
                  cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                style={{
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--accent, #2563eb)',
                  color: '#fff',
                  padding: '10px 24px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {primaryCtaLabel}
              </button>
            </div>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={skipModalOpen}
        title="Skip this step?"
        description="You can revisit skipped steps anytime. We'll remind you on the complete screen."
        confirmLabel="Skip step"
        onConfirm={handleConfirmSkip}
        onCancel={() => setSkipModalOpen(false)}
      />

      <ConfirmDialog
        open={restartModalOpen}
        title="Restart setup?"
        description="This clears any seeded teams, objectives, and key results added by the wizard and returns you to the welcome step."
        confirmLabel="Restart"
        onConfirm={handleConfirmRestart}
        onCancel={handleCancelRestart}
      />

      <ConfirmDialog
        open={templateModal.open}
        title="Replace seeded template data?"
        description="Reapplying a template replaces seeded teams, objectives, and key results added by the wizard."
        confirmLabel="Replace"
        onConfirm={handleTemplateConfirm}
        onCancel={handleTemplateCancel}
      />
    </div>
  )
}

type StepChipProps = {
  index: number
  state: 'done' | 'current' | 'future'
}

function StepChip({ index, state }: StepChipProps) {
  const baseStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    fontSize: 14,
  }

  if (state === 'done') {
    return (
      <span
        style={{
          ...baseStyle,
          background: 'var(--accent, #2563eb)',
          color: '#fff',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.333 11.333 3.667 8.667l1.176-1.176 1.49 1.49 4.323-4.323 1.176 1.176-5.5 5.5Z" fill="currentColor" />
        </svg>
      </span>
    )
  }

  if (state === 'current') {
    return (
      <span
        style={{
          ...baseStyle,
          border: '2px solid var(--accent, #2563eb)',
          color: 'var(--accent, #2563eb)',
          background: 'var(--accent-50, rgba(37,99,235,0.12))',
        }}
      >
        {index}
      </span>
    )
  }

  return (
    <span
      style={{
        ...baseStyle,
        border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
        color: 'var(--text-secondary, #475569)',
        background: 'var(--panel, #fff)',
      }}
    >
      {index}
    </span>
  )
}
