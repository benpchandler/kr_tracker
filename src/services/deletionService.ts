import type {
  Initiative,
  KR,
  Objective,
  Organization,
  OrgFunction,
  Person,
  Pod,
  Team,
  FunctionType,
} from '../types';

export type DeleteType =
  | 'organization'
  | 'team'
  | 'pod'
  | 'person'
  | 'function'
  | 'objective'
  | 'kr'
  | 'initiative';

export interface CascadeItem {
  label: string;
  count?: number;
  description?: string;
}

export interface DeletePlan {
  type: DeleteType;
  id: string;
  name: string;
  title: string;
  description?: string;
  confirmLabel: string;
  cascadeItems: CascadeItem[];
  notes?: string;
  removals: {
    organizations?: Set<string>;
    teams?: Set<string>;
    pods?: Set<string>;
    people?: Set<string>;
    functions?: Set<string>;
    objectives?: Set<string>;
    krs?: Set<string>;
    initiatives?: Set<string>;
  };
  updates: {
    people?: Map<string, Partial<Person>>;
    krs?: Map<string, Partial<KR>>;
    initiatives?: Map<string, Partial<Initiative>>;
    pods?: Map<string, Partial<Pod>>;
  };
}

export interface DeletionContext {
  organizations: Organization[];
  teams: Team[];
  pods: Pod[];
  people: Person[];
  functions: OrgFunction[];
  objectives: Objective[];
  krs: KR[];
  initiatives: Initiative[];
}

export interface DeletionState extends DeletionContext {
  selectedTeam: string;
}

export interface ApplyDeletionResult {
  organizations: Organization[];
  teams: Team[];
  pods: Pod[];
  people: Person[];
  functions: OrgFunction[];
  objectives: Objective[];
  krs: KR[];
  initiatives: Initiative[];
  selectedTeam: string;
}

export const teamBelongsToOrganization = (team: Team, organizationId: string, fallbackOrgId?: string) => {
  if (team.organizationId) {
    return team.organizationId === organizationId;
  }
  if (fallbackOrgId) {
    return fallbackOrgId === organizationId;
  }
  return false;
};

const buildCascadeItems = (...items: CascadeItem[]): CascadeItem[] =>
  items.filter((item) => (typeof item.count === 'number' ? item.count > 0 : true));

export const computeDeletionPlan = (
  type: DeleteType,
  id: string,
  context: DeletionContext,
): DeletePlan | null => {
  const {
    organizations,
    teams,
    pods,
    people,
    functions,
    objectives,
    krs,
    initiatives,
  } = context;

  const fallbackOrgId = organizations[0]?.id;

  switch (type) {
    case 'organization': {
      const organization = organizations.find((org) => org.id === id);
      if (!organization) return null;

      const teamIds = new Set(
        teams
          .filter((team) => teamBelongsToOrganization(team, organization.id, fallbackOrgId))
          .map((team) => team.id),
      );

      const podsToRemove = pods.filter((pod) => teamIds.has(pod.teamId));
      const podIds = new Set(podsToRemove.map((pod) => pod.id));

      const peopleToRemove = people.filter((person) => person.teamId && teamIds.has(person.teamId));
      const personIds = new Set(peopleToRemove.map((person) => person.id));

      const objectivesToRemove = objectives.filter((objective) =>
        objective.organizationId === organization.id || (objective.teamId && teamIds.has(objective.teamId)),
      );
      const objectiveIds = new Set(objectivesToRemove.map((objective) => objective.id));

      const krsToRemove = krs.filter((kr) =>
        kr.organizationId === organization.id ||
        teamIds.has(kr.teamId) ||
        (kr.objectiveId && objectiveIds.has(kr.objectiveId)),
      );
      const krIds = new Set(krsToRemove.map((kr) => kr.id));

      const initiativesToRemove = initiatives.filter((initiative) =>
        teamIds.has(initiative.teamId) || initiative.linkedKRIds.some((krId) => krIds.has(krId)),
      );
      const initiativeIds = new Set(initiativesToRemove.map((initiative) => initiative.id));

      const peopleManagerUpdates = new Map<string, Partial<Person>>();
      people.forEach((person) => {
        if (!personIds.has(person.id) && person.managerId && personIds.has(person.managerId)) {
          peopleManagerUpdates.set(person.id, { managerId: undefined });
        }
      });

      const krOwnerUpdates = new Map<string, Partial<KR>>();
      krs.forEach((kr) => {
        if (!krIds.has(kr.id) && peopleToRemove.some((person) => person.name === kr.owner)) {
          krOwnerUpdates.set(kr.id, { owner: 'Unassigned', lastUpdated: new Date().toISOString() });
        }
      });

      const cascadeItems = buildCascadeItems(
        { label: 'Teams', count: teamIds.size },
        { label: 'Pods', count: podIds.size },
        { label: 'People removed', count: personIds.size },
        { label: 'Objectives', count: objectiveIds.size },
        { label: 'Key Results', count: krIds.size },
        { label: 'Initiatives', count: initiativeIds.size },
        { label: 'Managers cleared', count: peopleManagerUpdates.size },
      );

      return {
        type,
        id,
        name: organization.name,
        title: `Delete organization "${organization.name}"?`,
        description: 'Removing an organization will cascade to all teams, pods, people, objectives, and KRs within it.',
        confirmLabel: 'Delete Organization',
        cascadeItems,
        notes: 'This action cannot be undone.',
        removals: {
          organizations: new Set([id]),
          teams: teamIds,
          pods: podIds,
          people: personIds,
          objectives: objectiveIds,
          krs: krIds,
          initiatives: initiativeIds,
        },
        updates: {
          people: peopleManagerUpdates,
          krs: krOwnerUpdates,
        },
      };
    }

    case 'team': {
      const team = teams.find((item) => item.id === id);
      if (!team) return null;

      const podsToRemove = pods.filter((pod) => pod.teamId === id);
      const podIds = new Set(podsToRemove.map((pod) => pod.id));

      const peopleToRemove = people.filter((person) => person.teamId === id);
      const personIds = new Set(peopleToRemove.map((person) => person.id));

      const objectivesToRemove = objectives.filter((objective) => objective.teamId === id);
      const objectiveIds = new Set(objectivesToRemove.map((objective) => objective.id));

      const krsToRemove = krs.filter((kr) => kr.teamId === id || (kr.objectiveId && objectiveIds.has(kr.objectiveId)));
      const krIds = new Set(krsToRemove.map((kr) => kr.id));

      const initiativesToRemove = initiatives.filter((initiative) =>
        initiative.teamId === id || initiative.linkedKRIds.some((krId) => krIds.has(krId)),
      );
      const initiativeIds = new Set(initiativesToRemove.map((initiative) => initiative.id));

      const peopleManagerUpdates = new Map<string, Partial<Person>>();
      people.forEach((person) => {
        if (!personIds.has(person.id) && person.managerId && personIds.has(person.managerId)) {
          peopleManagerUpdates.set(person.id, { managerId: undefined });
        }
      });

      const krOwnerUpdates = new Map<string, Partial<KR>>();
      krs.forEach((kr) => {
        if (!krIds.has(kr.id) && peopleToRemove.some((person) => person.name === kr.owner)) {
          krOwnerUpdates.set(kr.id, { owner: 'Unassigned', lastUpdated: new Date().toISOString() });
        }
      });

      const cascadeItems = buildCascadeItems(
        { label: 'Pods', count: podIds.size },
        { label: 'People removed', count: personIds.size },
        { label: 'Objectives', count: objectiveIds.size },
        { label: 'Key Results', count: krIds.size },
        { label: 'Initiatives', count: initiativeIds.size },
        { label: 'Managers cleared', count: peopleManagerUpdates.size },
      );

      return {
        type,
        id,
        name: team.name,
        title: `Delete team "${team.name}"?`,
        description: 'Deleting a team removes all pods, people, objectives, and key results associated with it.',
        confirmLabel: 'Delete Team',
        cascadeItems,
        notes: 'Team removal reassigns any managed reports to have no manager.',
        removals: {
          teams: new Set([id]),
          pods: podIds,
          people: personIds,
          objectives: objectiveIds,
          krs: krIds,
          initiatives: initiativeIds,
        },
        updates: {
          people: peopleManagerUpdates,
          krs: krOwnerUpdates,
        },
      };
    }

    case 'pod': {
      const pod = pods.find((item) => item.id === id);
      if (!pod) return null;

      const peopleUpdates = new Map<string, Partial<Person>>();
      people.forEach((person) => {
        if (person.podId === id) {
          peopleUpdates.set(person.id, { podId: undefined });
        }
      });

      const krUpdates = new Map<string, Partial<KR>>();
      krs.forEach((kr) => {
        if (kr.podId === id) {
          krUpdates.set(kr.id, { podId: undefined });
        }
      });

      const initiativeUpdates = new Map<string, Partial<Initiative>>();
      initiatives.forEach((initiative) => {
        if (initiative.podId === id) {
          initiativeUpdates.set(initiative.id, { podId: undefined });
        }
      });

      const cascadeItems = buildCascadeItems(
        { label: 'Members unassigned', count: peopleUpdates.size },
        { label: 'Key Results updated', count: krUpdates.size },
        { label: 'Initiatives updated', count: initiativeUpdates.size },
      );

      return {
        type,
        id,
        name: pod.name,
        title: `Delete pod "${pod.name}"?`,
        description: 'Deleting a pod clears its association from members, key results, and initiatives.',
        confirmLabel: 'Delete Pod',
        cascadeItems,
        removals: {
          pods: new Set([id]),
        },
        updates: {
          people: peopleUpdates,
          krs: krUpdates,
          initiatives: initiativeUpdates,
        },
      };
    }

    case 'person': {
      const person = people.find((item) => item.id === id);
      if (!person) return null;

      const reports = people.filter((candidate) => candidate.managerId === id);
      const reportUpdates = new Map<string, Partial<Person>>();
      reports.forEach((report) => {
        reportUpdates.set(report.id, { managerId: undefined });
      });

      const krUpdates = new Map<string, Partial<KR>>();
      krs.forEach((kr) => {
        if (kr.owner === person.name) {
          krUpdates.set(kr.id, { owner: 'Unassigned', lastUpdated: new Date().toISOString() });
        }
      });

      const initiativeUpdates = new Map<string, Partial<Initiative>>();
      initiatives.forEach((initiative) => {
        if (initiative.owner === person.name) {
          initiativeUpdates.set(initiative.id, { owner: 'Unassigned' });
        }
        if (initiative.contributors?.includes(person.name)) {
          const filteredContributors = initiative.contributors.filter((contributor) => contributor !== person.name);
          initiativeUpdates.set(initiative.id, { contributors: filteredContributors });
        }
      });

      const cascadeItems = buildCascadeItems(
        { label: 'Direct reports reassigned', count: reportUpdates.size },
        { label: 'KR owners reset', count: krUpdates.size },
        { label: 'Initiatives updated', count: initiativeUpdates.size },
      );

      return {
        type,
        id,
        name: person.name,
        title: `Delete ${person.name}?`,
        description: 'This removes the person from the organization and clears dependent relationships.',
        confirmLabel: 'Delete Person',
        cascadeItems,
        removals: {
          people: new Set([id]),
        },
        updates: {
          people: reportUpdates,
          krs: krUpdates,
          initiatives: initiativeUpdates,
        },
      };
    }

    case 'function': {
      const fn = functions.find((item) => item.id === id);
      if (!fn) return null;

      const remainingFunctions = functions.filter((item) => item.id !== id);
      const fallback = remainingFunctions[0];

      const peopleUpdates = new Map<string, Partial<Person>>();
      const peopleToRemove = new Set<string>();

      people.forEach((person) => {
        if (person.functionId === id) {
          if (fallback) {
            peopleUpdates.set(person.id, { functionId: fallback.id as FunctionType });
          } else {
            peopleToRemove.add(person.id);
          }
        }
      });

      const cascadeItems = buildCascadeItems(
        fallback
          ? { label: `People reassigned to ${fallback.name}`, count: peopleUpdates.size }
          : { label: 'People removed', count: peopleToRemove.size },
      );

      return {
        type,
        id,
        name: fn.name,
        title: `Delete function "${fn.name}"?`,
        description: fallback
          ? `Members will be reassigned to ${fallback.name}.`
          : 'No other functions exist; associated people will be removed.',
        confirmLabel: 'Delete Function',
        cascadeItems,
        removals: {
          functions: new Set([id]),
          people: peopleToRemove.size > 0 ? peopleToRemove : undefined,
        },
        updates: {
          people: peopleUpdates,
        },
      };
    }

    case 'objective': {
      const objective = objectives.find((item) => item.id === id);
      if (!objective) return null;

      const krIds = new Set(krs.filter((kr) => kr.objectiveId === id).map((kr) => kr.id));
      const initiativesToRemove = initiatives.filter((initiative) => initiative.linkedKRIds.some((krId) => krIds.has(krId)));
      const initiativeIds = new Set(initiativesToRemove.map((initiative) => initiative.id));

      const cascadeItems = buildCascadeItems(
        { label: 'Key Results', count: krIds.size },
        { label: 'Initiatives', count: initiativeIds.size },
      );

      return {
        type,
        id,
        name: objective.title,
        title: `Delete objective "${objective.title}"?`,
        description: 'All key results linked to this objective (and their initiatives) will be removed.',
        confirmLabel: 'Delete Objective',
        cascadeItems,
        removals: {
          objectives: new Set([id]),
          krs: krIds,
          initiatives: initiativeIds,
        },
        updates: {},
      };
    }

    case 'kr': {
      const kr = krs.find((item) => item.id === id);
      if (!kr) return null;

      const initiativesToRemove = initiatives.filter((initiative) => initiative.linkedKRIds.includes(id));
      const initiativeIds = new Set(initiativesToRemove.map((initiative) => initiative.id));

      const cascadeItems = buildCascadeItems(
        { label: 'Initiatives', count: initiativeIds.size },
        { label: 'Objective links updated', count: kr.objectiveId ? 1 : 0 },
      );

      return {
        type,
        id,
        name: kr.title,
        title: `Delete key result "${kr.title}"?`,
        description: 'This removes the key result and any initiatives that depend on it.',
        confirmLabel: 'Delete Key Result',
        cascadeItems,
        removals: {
          krs: new Set([id]),
          initiatives: initiativeIds,
        },
        updates: {},
      };
    }

    case 'initiative': {
      const initiative = initiatives.find((item) => item.id === id);
      if (!initiative) return null;

      const cascadeItems = buildCascadeItems(
        { label: 'Linked Key Results affected', count: initiative.linkedKRIds.length },
      );

      return {
        type,
        id,
        name: initiative.title,
        title: `Delete initiative "${initiative.title}"?`,
        description: 'The linked key results will remain, but this initiative and its metadata will be removed.',
        confirmLabel: 'Delete Initiative',
        cascadeItems,
        removals: {
          initiatives: new Set([id]),
        },
        updates: {},
      };
    }

    default:
      return null;
  }
};

const removeSet = <T extends { id: string }>(items: T[], set?: Set<string>) => {
  if (!set || set.size === 0) return items;
  return items.filter((item) => !set.has(item.id));
};

const applyUpdates = <T extends { id: string }>(items: T[], map?: Map<string, Partial<T>>) => {
  if (!map || map.size === 0) return items;
  return items.map((item) => (map.has(item.id) ? { ...item, ...map.get(item.id)! } : item));
};

export const applyDeletionPlan = (
  plan: DeletePlan,
  state: DeletionState,
): ApplyDeletionResult => {
  const { removals, updates } = plan;
  const {
    organizations,
    teams,
    pods,
    people,
    functions,
    objectives,
    krs,
    initiatives,
    selectedTeam,
  } = state;

  const nextOrganizations = removeSet(organizations, removals.organizations);
  const nextFunctions = removeSet(functions, removals.functions);

  const nextTeams = removeSet(teams, removals.teams);

  let nextPods = removeSet(pods, removals.pods);
  nextPods = applyUpdates(nextPods, updates.pods);

  let nextPeople = removeSet(people, removals.people);
  nextPeople = applyUpdates(nextPeople, updates.people);

  let nextObjectives = removeSet(objectives, removals.objectives);

  let nextKRs = removeSet(krs, removals.krs);
  nextKRs = applyUpdates(nextKRs, updates.krs);

  let nextInitiatives = removeSet(initiatives, removals.initiatives);
  nextInitiatives = applyUpdates(nextInitiatives, updates.initiatives);

  const removedKrIds = removals.krs ?? new Set<string>();
  if (removedKrIds.size > 0) {
    nextObjectives = nextObjectives.map((objective) => {
      const filteredKrIds = objective.krIds.filter((krId) => !removedKrIds.has(krId));
      return filteredKrIds.length === objective.krIds.length
        ? objective
        : { ...objective, krIds: filteredKrIds };
    });

    nextInitiatives = nextInitiatives.map((initiative) => {
      const filteredKrIds = initiative.linkedKRIds.filter((krId) => !removedKrIds.has(krId));
      return filteredKrIds.length === initiative.linkedKRIds.length
        ? initiative
        : { ...initiative, linkedKRIds: filteredKrIds };
    });
  }

  let nextSelectedTeam = selectedTeam;
  if (removals.teams && removals.teams.size > 0 && selectedTeam !== 'all') {
    const stillExists = nextTeams.some((team) => team.name === selectedTeam);
    if (!stillExists) {
      nextSelectedTeam = 'all';
    }
  }

  return {
    organizations: nextOrganizations.map((org) => ({ ...org })),
    functions: nextFunctions.map((fn) => ({ ...fn })),
    teams: nextTeams.map((team) => ({ ...team })),
    pods: nextPods.map((pod) => ({ ...pod })),
    people: nextPeople.map((person) => ({ ...person })),
    objectives: nextObjectives.map((objective) => ({ ...objective })),
    krs: nextKRs.map((kr) => ({ ...kr })),
    initiatives: nextInitiatives.map((initiative) => ({ ...initiative })),
    selectedTeam: nextSelectedTeam,
  };
};
