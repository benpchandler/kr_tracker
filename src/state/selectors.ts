import { AppState, NavigationUIState, Phase, ViewFilter } from '../models/types'
import { generateWeeks, parseISO } from '../utils/weeks'
import { filterKRsByView } from '../utils/filtering'
import { summarizeMetrics } from '../metrics/engine'
import {
  DEFAULT_NAVIGATION_SECTION_IDS,
  NavigationItem,
  NavigationMatch,
  NavigationSection,
  buildNavigationSections,
  buildPrimaryNavigationItems,
  findNavigationMatch,
} from '../config/navigationMap'

export type NavigationSnapshot = {
  sections: NavigationSection[]
  primaryItems: NavigationItem[]
  phase: Phase
  currentView?: ViewFilter
  match?: NavigationMatch
}

export type HealthCounts = {
  green: number
  yellow: number
  red: number
}
export const selectNavigationUIState = (state: AppState): NavigationUIState => {
  const navigation = state.ui?.navigation
  if (navigation) {
    return {
      ...navigation,
      expandedSectionIds: [...navigation.expandedSectionIds],
    }
  }
  return {
    expandedSectionIds: Array.from(DEFAULT_NAVIGATION_SECTION_IDS),
    activeSectionId: DEFAULT_NAVIGATION_SECTION_IDS[0] ?? 'workspace',
    drawerOpen: false,
  }
}

export const selectNavigationSnapshot = (state: AppState): NavigationSnapshot => {
  const sections = buildNavigationSections(state)
  const primaryItems = buildPrimaryNavigationItems(state)
  return {
    sections,
    primaryItems,
    phase: state.phase ?? 'planning',
    currentView: state.currentView,
    match: findNavigationMatch(sections, state.currentView),
  }
}
export const selectWeeksInPeriod = (state: AppState) => {
  if (!state.period?.startISO || !state.period?.endISO) return []
  return generateWeeks(state.period.startISO, state.period.endISO)
}

export const selectFilteredKRs = (state: AppState) => filterKRsByView(state.krs, state.currentView, state)

export type ReportingWeekInfo = {
  iso: string
  isoLabel: string
  dateLabel: string
}

export const selectReportingWeekInfo = (state: AppState): ReportingWeekInfo | undefined => {
  if (!state.reportingDateISO) return undefined
  const weeks = selectWeeksInPeriod(state)
  if (!weeks.length) return undefined

  const reportingDate = parseISO(state.reportingDateISO)

  for (const week of weeks) {
    const start = parseISO(week.startISO)
    const end = new Date(start.getTime())
    end.setUTCDate(end.getUTCDate() + 6)
    if (reportingDate >= start && reportingDate <= end) {
      return week
    }
  }

  return weeks[0]
}
export const selectHealthCounts = (state: AppState): HealthCounts => {
  const filtered = selectFilteredKRs(state)
  if (!filtered.length) return { green: 0, yellow: 0, red: 0 }

  const weeks = selectWeeksInPeriod(state)
  if (!weeks.length) return { green: 0, yellow: 0, red: 0 }

  const summaries = summarizeMetrics(state, weeks)
  const ids = new Set(filtered.map(kr => kr.id))

  const counts: HealthCounts = { green: 0, yellow: 0, red: 0 }
  for (const summary of summaries) {
    if (!ids.has(summary.krId)) continue
    switch (summary.health) {
      case 'green':
        counts.green += 1
        break
      case 'yellow':
        counts.yellow += 1
        break
      case 'red':
        counts.red += 1
        break
    }
  }

  return counts
}
const formatDateUTC = (iso: string, options: Intl.DateTimeFormatOptions) => {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options })
  return formatter.format(parseISO(iso))
}

export const selectPeriodLabel = (state: AppState): string => {
  const startISO = state.period?.startISO
  const endISO = state.period?.endISO
  if (!startISO || !endISO) return 'Period not set'

  const startYear = parseISO(startISO).getUTCFullYear()
  const endYear = parseISO(endISO).getUTCFullYear()
  const startPart = formatDateUTC(startISO, { month: 'short', day: 'numeric' })
  const endPart = formatDateUTC(endISO, { month: 'short', day: 'numeric' })

  if (startYear === endYear) {
    return `${startPart} – ${endPart}, ${endYear}`
  }

  return `${startPart}, ${startYear} – ${endPart}, ${endYear}`
}
export type ViewContextSummary = {
  level: ViewFilter['level']
  primaryLabel: string
  secondaryLabel?: string
  teamColor?: string
}

export const selectViewContextSummary = (state: AppState): ViewContextSummary => {
  const view = state.currentView ?? { level: 'organization', targetId: state.organization?.id }

  switch (view.level) {
    case 'team': {
      const team = state.teams.find(t => t.id === view.targetId)
      return {
        level: view.level,
        primaryLabel: team?.name ?? 'Team',
        secondaryLabel: state.organization?.name,
        teamColor: team?.color,
      }
    }
    case 'pod': {
      const pod = state.pods.find(p => p.id === view.targetId)
      const team = pod ? state.teams.find(t => t.id === pod.teamId) : undefined
      return {
        level: view.level,
        primaryLabel: pod?.name ?? 'Pod',
        secondaryLabel: team?.name ?? state.organization?.name,
        teamColor: team?.color,
      }
    }
    case 'individual': {
      const person = state.individuals.find(i => i.id === view.targetId)
      const team = person?.teamId ? state.teams.find(t => t.id === person.teamId) : undefined
      return {
        level: view.level,
        primaryLabel: person?.name ?? 'Individual',
        secondaryLabel: team?.name ?? state.organization?.name,
        teamColor: team?.color,
      }
    }
    case 'settings':
      return {
        level: view.level,
        primaryLabel: 'Settings',
      }
    case 'setup':
      return {
        level: view.level,
        primaryLabel: 'Setup Area',
      }
    case 'organization':
    default:
      return {
        level: 'organization',
        primaryLabel: state.organization?.name ?? 'All Organization',
      }
  }
}

export const selectPhase = (state: AppState) => state.phase ?? 'planning'
