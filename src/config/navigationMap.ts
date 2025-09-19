import { AppState, ViewFilter, Phase } from '../models/types'
import { filterKRsByView } from '../utils/filtering'

export type NavigationItem = {
  id: string
  label: string
  icon?: string
  ariaLabel?: string
  filter: ViewFilter
  badge?: number
  sectionId: string
  children?: NavigationItem[]
  phase?: Phase
  meta?: {
    teamColor?: string
    subtitle?: string
  }
}

export type NavigationSection = {
  id: string
  label: string
  icon?: string
  items: NavigationItem[]
}

export type NavigationMatch = {
  sectionId: string
  item: NavigationItem
  parentItemId?: string
}

export const DEFAULT_NAVIGATION_SECTION_IDS = ['workspace', 'teams'] as const
export type DefaultNavigationSectionId = typeof DEFAULT_NAVIGATION_SECTION_IDS[number]
const areFiltersEqual = (a: ViewFilter, b: ViewFilter) => {
  if (!a || !b) return false
  return a.level === b.level && (a.targetId ?? null) === (b.targetId ?? null)
}

const shouldShowBadge = (filter: ViewFilter) => !['settings', 'setup'].includes(filter.level)

const countKRsForFilter = (state: AppState, filter: ViewFilter): number | undefined => {
  if (!shouldShowBadge(filter)) return undefined
  return filterKRsByView(state.krs, filter, state).length
}

const createWorkspaceFilter = (state: AppState): ViewFilter =>
  state.organization?.id
    ? { level: 'organization', targetId: state.organization.id }
    : { level: 'organization' }

export function buildPrimaryNavigationItems(state: AppState): NavigationItem[] {
  const workspaceFilter = createWorkspaceFilter(state)
  const organizationBadge = countKRsForFilter(state, workspaceFilter)

  return [
    {
      id: 'primary-dashboard',
      label: 'Dashboard',
      icon: '📊',
      ariaLabel: 'Dashboard overview',
      filter: workspaceFilter,
      badge: organizationBadge,
      sectionId: 'primary',
    },
    {
      id: 'primary-planning',
      label: 'Planning',
      icon: '📝',
      ariaLabel: 'Planning workspace',
      filter: workspaceFilter,
      phase: 'planning',
      sectionId: 'primary',
    },
    {
      id: 'primary-execution',
      label: 'Execution',
      icon: '🚀',
      ariaLabel: 'Execution workspace',
      filter: workspaceFilter,
      phase: 'execution',
      sectionId: 'primary',
    },
  ]
}

export function buildNavigationSections(state: AppState): NavigationSection[] {
  const sections: NavigationSection[] = []

  const workspaceFilter = createWorkspaceFilter(state)

  const workspaceItems: NavigationItem[] = [
    {
      id: 'workspace-settings',
      label: 'Settings',
      icon: '⚙️',
      ariaLabel: 'Settings',
      filter: { level: 'settings' },
      sectionId: 'workspace',
    },
    {
      id: 'workspace-setup',
      label: 'Setup Area',
      icon: '🛠️',
      ariaLabel: 'Setup Area',
      filter: { level: 'setup' },
      sectionId: 'workspace',
    },
  ]

  sections.push({
    id: 'workspace',
    label: 'Workspace',
    icon: '🧭',
    items: workspaceItems,
  })
  const teams = [...state.teams].sort((a, b) => a.name.localeCompare(b.name))

  const teamItems: NavigationItem[] = teams.map(team => {
    const teamFilter: ViewFilter = { level: 'team', targetId: team.id }
    const pods = state.pods
      .filter(pod => pod.teamId === team.id)
      .sort((a, b) => a.name.localeCompare(b.name))

    const podItems: NavigationItem[] = pods.map(pod => {
      const podFilter: ViewFilter = { level: 'pod', targetId: pod.id }
      return {
        id: `pod-${pod.id}`,
        label: pod.name,
        icon: '🧩',
        ariaLabel: `${pod.name} pod`,
        filter: podFilter,
        badge: countKRsForFilter(state, podFilter),
        sectionId: 'teams',
        meta: { subtitle: 'Pod' },
      }
    })

    return {
      id: `team-${team.id}`,
      label: team.name,
      icon: '👥',
      ariaLabel: `${team.name} team`,
      filter: teamFilter,
      badge: countKRsForFilter(state, teamFilter),
      sectionId: 'teams',
      children: podItems,
      meta: { teamColor: team.color },
    }
  })

  sections.push({
    id: 'teams',
    label: 'Teams & Pods',
    icon: '🏛️',
    items: teamItems,
  })
  const people = [...state.individuals].sort((a, b) => a.name.localeCompare(b.name))

  const peopleItems: NavigationItem[] = people.map(person => {
    const personFilter: ViewFilter = { level: 'individual', targetId: person.id }
    const teamName = person.teamId
      ? state.teams.find(team => team.id === person.teamId)?.name
      : undefined

    return {
      id: `person-${person.id}`,
      label: person.name,
      icon: '👤',
      ariaLabel: `${person.name}'s key results`,
      filter: personFilter,
      badge: countKRsForFilter(state, personFilter),
      sectionId: 'people',
      meta: teamName ? { subtitle: teamName } : undefined,
    }
  })

  sections.push({
    id: 'people',
    label: 'People',
    icon: '🧑‍🤝‍🧑',
    items: peopleItems,
  })

  return sections
}
export function flattenNavigationSections(sections: NavigationSection[]): NavigationItem[] {
  const items: NavigationItem[] = []

  const walk = (entry: NavigationItem) => {
    items.push(entry)
    entry.children?.forEach(child => walk(child))
  }

  sections.forEach(section => {
    section.items.forEach(item => walk(item))
  })

  return items
}

const findMatchRecursive = (
  item: NavigationItem,
  filter: ViewFilter | undefined,
  sectionId: string,
  parentItemId?: string
): NavigationMatch | undefined => {
  if (filter && !item.phase && areFiltersEqual(item.filter, filter)) {
    return { sectionId, item, parentItemId }
  }

  if (!item.children?.length) return undefined

  for (const child of item.children) {
    const match = findMatchRecursive(child, filter, sectionId, item.id)
    if (match) return match
  }

  return undefined
}

export function findNavigationMatch(
  sections: NavigationSection[],
  filter: ViewFilter | undefined
): NavigationMatch | undefined {
  if (!filter) return undefined

  for (const section of sections) {
    for (const item of section.items) {
      const match = findMatchRecursive(item, filter, section.id)
      if (match) return match
    }
  }

  return undefined
}

export function findNavigationItemById(
  sections: NavigationSection[],
  itemId: string | undefined
): NavigationItem | undefined {
  if (!itemId) return undefined
  return flattenNavigationSections(sections).find(item => item.id === itemId)
}
