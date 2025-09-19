export type ID = string

// Enums for type safety and consistency
export enum FunctionalArea {
  Engineering = 'engineering',
  Product = 'product',
  Analytics = 'analytics',
  Design = 'design',
  SnO = 'sno',
  Operations = 'operations',
  Strategy = 'strategy'
}

export enum PersonLevel {
  IC = 'ic',
  Senior = 'senior',
  Staff = 'staff',
  Principal = 'principal',
  Manager = 'manager',
  Director = 'director',
  VP = 'vp',
  Executive = 'executive'
}

export enum PodRole {
  Lead = 'lead',
  TechLead = 'tech_lead',
  PM = 'pm',
  Analyst = 'analyst',
  Designer = 'designer',
  Engineer = 'engineer',
  Member = 'member'
}

export type Objective = {
  id: ID
  name: string
  podId?: ID  // Pod that owns this objective
  teamIds?: ID[]  // Legacy field for backward compatibility
  periodId?: ID  // Which period this objective belongs to
}

export type Aggregation = 'cumulative' | 'snapshot' | 'average'
export type Unit = 'count' | 'percent' | 'currency'
export type KrStatus = 'on_track' | 'at_risk' | 'off_track' | 'deprioritized'

export type KeyResult = {
  id: ID
  objectiveId?: ID
  name: string
  unit: Unit
  aggregation: Aggregation
  status?: KrStatus
  teamId?: ID  // Legacy - will be derived through objective->pod->team
  podId?: ID   // Legacy - will be derived through objective->pod
  driId?: ID   // Directly Responsible Individual (Person.id)
  // Goal and measurement fields
  goalStart?: number
  goalEnd?: number
  currentValue?: number  // Current actual value
  description?: string   // Detailed description of what this KR measures
  sqlQuery?: string      // SQL query to auto-populate metrics
}

export type Pod = {
  id: ID
  name: string
  mission?: string  // What this pod exists to do
  teamId: ID  // Which team this pod belongs to
  memberIds?: ID[]  // Legacy field for backward compatibility
}

export type PodMembership = {
  podId: ID
  personId: ID
  role: PodRole
  allocation: number  // 0.0 to 1.0 (percentage as decimal)
  startDate?: string  // When they joined the pod
  endDate?: string    // When they left (if applicable)
}

// Person replaces Individual with improved structure
export type Person = {
  id: ID
  name: string
  email?: string
  function: FunctionalArea
  level: PersonLevel
  managerId?: ID  // Optional for top of hierarchy
  // Legacy fields for compatibility
  teamId?: ID  // Will be derived from pod memberships
  podId?: ID  // Legacy field for current pod assignment
  role?: 'executive' | 'team_lead' | 'pod_lead' | 'contributor'  // Legacy
  discipline?: Discipline  // Legacy field for functional discipline
}

// Legacy Individual type alias for backward compatibility
export type Individual = Person
export type Discipline = 'analytics' | 'strategy' | 'operations' | 'engineering' | 'product' | 'design'

export type Organization = {
  id: ID
  name: string
}

export type WeekDef = {
  index: number
  startISO: string
  label: string
}

export type PlanDraft = Record<ID /* krId */, Record<string /* weekKey */, number>>
export type PlanMeta = Record<ID /* krId */, Record<string /* weekKey */, { at?: string | null; by?: string | null }>>

export type PlanBaseline = {
  id: ID
  version: number
  lockedAt: string // ISO
  lockedBy: string
  data: PlanDraft // frozen snapshot
}

export type Period = {
  startISO: string
  endISO: string
}

export type Initiative = {
  id: ID
  krId: ID
  name: string
  impact: number
  confidence: number // 0-1
  isPlaceholder: boolean
  status?: InitiativeStatus
}

export type InitiativeWeekly = Record<ID /* initiativeId */, Record<string /* weekKey */, { impact?: number; confidence?: number }>>
export type InitiativeWeeklyMeta = Record<ID /* initiativeId */, Record<string /* weekKey */, { at?: string | null; by?: string | null }>>

// Leadership-oriented universal statuses
export type InitiativeStatus =
  | 'on_track'        // No action needed
  | 'at_risk'         // Monitor closely; owner mitigating
  | 'blocked'         // External/internal blocker; action needed
  | 'needs_decision'  // Leadership decision required
  | 'needs_support'   // Additional resourcing/assist requested

export type Phase = 'planning' | 'execution'

export type Theme = 'light' | 'dark'

export type NavigationUIState = {
  expandedSectionIds: string[]
  activeSectionId?: string
  lastFocusedItemId?: string
  drawerOpen?: boolean
}

export type WizardStepKey =
  | 'welcome'
  | 'organization'
  | 'objectives'
  | 'keyResults'
  | 'complete'

export type WizardSkipLogEntry = {
  step: WizardStepKey
  atISO: string
  reason?: string
}

export type WizardOrganizationDraft = {
  name: string
  periodStartISO?: string
  periodEndISO?: string
  templateId?: string
}

export type WizardObjectiveDraft = {
  id: ID
  name: string
  teamId?: ID
  isSuggestion?: boolean
  createdObjectiveId?: ID
}

export type WizardKeyResultDraft = {
  id: ID
  name: string
  unit: Unit
  aggregation: Aggregation
  goalStart?: number
  goalEnd?: number
  objectiveId?: ID
  teamId?: ID
}

export type WizardSeededEntities = {
  templateId?: string
  pendingTemplateId?: string
  teamIds: ID[]
  objectiveIds: ID[]
  krIds: ID[]
  lastSeededAt?: string
  resetRequired?: boolean
}

export type WizardUIState = {
  currentStep: WizardStepKey
  completedSteps: WizardStepKey[]
  skippedSteps: WizardStepKey[]
  lastVisitedStep?: WizardStepKey
  organization: WizardOrganizationDraft
  objectives: {
    drafts: WizardObjectiveDraft[]
  }
  keyResults: {
    drafts: WizardKeyResultDraft[]
  }
  seeded: WizardSeededEntities
  skipLog: WizardSkipLogEntry[]
  reminderAcknowledged?: boolean
  completedAt?: string
}

export type GridUIState = {
  expandedRows: Record<string, Set<string>>  // gridType -> Set of expanded KR IDs
  focusedRowId?: string
  lastInteractionTime?: number
}

export type UIState = {
  navigation: NavigationUIState
  wizard: WizardUIState
  grids?: GridUIState  // Optional for backward compatibility
}

export type AppState = {
  organization?: Organization
  objectives: Objective[]
  krs: KeyResult[]
  teams: Team[]
  pods: Pod[]
  podMemberships: PodMembership[]  // New: tracks who's on which pods
  individuals: Individual[]  // Will transition to Person[]
  people: Person[]  // New: improved person model
  period: Period
  planDraft: PlanDraft
  planMeta?: PlanMeta
  actuals: PlanDraft
  actualMeta?: PlanMeta
  baselines: PlanBaseline[]
  currentBaselineId?: ID
  initiatives: Initiative[]
  initiativeWeekly?: InitiativeWeekly
  initiativeWeeklyMeta?: InitiativeWeeklyMeta
  currentView?: ViewFilter
  phase?: Phase
  reportingDateISO?: string
  theme?: Theme
  waterfall?: WaterfallState
  ui?: UIState
  // UI hint: focus a particular KR row in Plan Builder
  focusKrId?: ID
}

export type ViewFilter = {
  level: 'organization' | 'team' | 'pod' | 'individual' | 'settings' | 'setup'
  targetId?: ID  // ID of the team/pod/individual to filter by
}

export type KrWeekMetrics = {
  krId: ID
  isoWeek: string
  index: number
  actual?: number
  plan?: number
  deltaWoW?: number
  deltaWoWPct?: number
  rolling3?: number
  varianceWeekly?: number
  cumulativeActual?: number
  cumulativePlan?: number
  paceToDatePct?: number
  forecastEOP?: number
  health?: 'green' | 'yellow' | 'red'
}

export type KrMetricsSummary = {
  krId: ID
  latestWeek?: string
  latestPacePct?: number
  latestVariance?: number
  health?: 'green' | 'yellow' | 'red'
  series: {
    weeks: string[]
    actual: (number | undefined)[]
    plan: (number | undefined)[]
  }
}

export type Team = {
  id: ID
  name: string
  leadId?: ID  // Person who leads this team
  color?: string
}

export type WaterfallScenarioKey = string

export type WaterfallStepKind = 'baseline' | 'delta' | 'subtotal' | 'total' | 'gap'

export type WaterfallStepConfig = {
  id: ID
  label: string
  sourceInitiativeIds?: ID[]
  kind?: WaterfallStepKind
  color?: string
  showValue?: boolean
}

export type WaterfallSeries = {
  key: WaterfallScenarioKey
  name: string
  steps: WaterfallStepConfig[]
  showTotal?: boolean
  stackedSeriesKeys?: string[]
}

export type WaterfallAnnotationType = 'label' | 'difference' | 'value_line' | 'cagr' | 'highlight' | 'axis_break'

export type WaterfallAnnotation = {
  id: ID
  type: WaterfallAnnotationType
  stepId?: ID
  targetStepId?: ID
  text?: string
  value?: number
  color?: string
  position?: 'inside' | 'outside' | 'auto'
  metadata?: Record<string, string | number | boolean | null>
}

export type WaterfallFormattingOptions = {
  palette?: string[]
  numberFormat?: 'auto' | 'percent' | 'currency' | 'compact'
  unitLabel?: string
  showLegends?: boolean
}

export type WaterfallGroupingRule = {
  id: ID
  label: string
  includeInitiativeIds: ID[]
  kind?: 'regular' | 'subtotal'
}

export type WaterfallConfig = {
  krId: ID
  defaultScenario: WaterfallScenarioKey
  scenarios: Record<WaterfallScenarioKey, WaterfallSeries>
  formatting?: WaterfallFormattingOptions
  annotations?: WaterfallAnnotation[]
  groupingRules?: WaterfallGroupingRule[]
}

export type WaterfallState = {
  configs: Record<ID, WaterfallConfig>
  scenarioSelections: Record<ID, WaterfallScenarioKey>
}
