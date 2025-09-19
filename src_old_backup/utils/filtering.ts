import { KeyResult, ViewFilter, AppState } from '../models/types'

/**
 * Filter KRs based on the current view selection
 */
export function filterKRsByView(krs: KeyResult[], view: ViewFilter | undefined, state: AppState): KeyResult[] {
  if (!view) return krs

  switch (view.level) {
    case 'organization':
      // Show all KRs at organization level
      return krs

    case 'team':
      // Show KRs for a specific team
      return krs.filter(kr => kr.teamId === view.targetId)

    case 'pod':
      // Show KRs for a specific pod
      return krs.filter(kr => kr.podId === view.targetId)

    case 'individual':
      // Show KRs where individual is the DRI
      return krs.filter(kr => kr.driId === view.targetId)

    case 'settings':
      return []

    default:
      return krs
  }
}

/**
 * Get a human-readable label for the current view
 */
export function getViewLabel(view: ViewFilter | undefined, state: AppState): string {
  if (!view) return 'All KRs'

  switch (view.level) {
    case 'organization':
      return state.organization?.name || 'Organization'

    case 'team': {
      const team = state.teams.find(t => t.id === view.targetId)
      return team ? `${team.name} Team` : 'Team View'
    }

    case 'pod': {
      const pod = state.pods.find(p => p.id === view.targetId)
      return pod ? pod.name : 'Pod View'
    }

    case 'individual': {
      const individual = state.individuals.find(i => i.id === view.targetId)
      return individual ? `${individual.name}'s KRs` : 'Individual View'
    }

    case 'settings':
      return 'Settings'

    default:
      return 'Custom View'
  }
}

/**
 * Get breadcrumb trail for current view
 */
export function getViewBreadcrumbs(view: ViewFilter | undefined, state: AppState): string[] {
  if (!view) return []

  const breadcrumbs: string[] = []

  // Always start with org
  if (state.organization) {
    breadcrumbs.push(state.organization.name)
  }

  switch (view.level) {
    case 'organization':
      break

    case 'team': {
      const team = state.teams.find(t => t.id === view.targetId)
      if (team) breadcrumbs.push(team.name)
      break
    }

    case 'pod': {
      const pod = state.pods.find(p => p.id === view.targetId)
      if (pod) {
        const team = state.teams.find(t => t.id === pod.teamId)
        if (team) breadcrumbs.push(team.name)
        breadcrumbs.push(pod.name)
      }
      break
    }

    case 'individual': {
      const individual = state.individuals.find(i => i.id === view.targetId)
      if (individual) {
        const team = state.teams.find(t => t.id === individual.teamId)
        if (team) breadcrumbs.push(team.name)
        if (individual.podId) {
          const pod = state.pods.find(p => p.id === individual.podId)
          if (pod) breadcrumbs.push(pod.name)
        }
        breadcrumbs.push(individual.name)
      }
      break
    }

    case 'settings': {
      breadcrumbs.push('Settings')
      break
    }
  }

  return breadcrumbs
}