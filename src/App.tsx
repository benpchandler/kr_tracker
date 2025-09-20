import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./components/ui/collapsible";
import { KRCard } from "./components/KRCard";
import { InitiativeCard } from "./components/InitiativeCard";
import { AddKRDialog } from "./components/AddKRDialog";
import { AddInitiativeDialog } from "./components/AddInitiativeDialog";
import { TeamFilter } from "./components/TeamFilter";
import { AdvancedFilter } from "./components/AdvancedFilter";
import { FilterResultsSummary } from "./components/FilterResultsSummary";
import { ModeSwitch, ModeDescription } from "./components/ModeSwitch";
import { OrganizationManager } from "./components/OrganizationManager";
import { KRSpreadsheetView } from "./components/KRSpreadsheetView";
import { ActualsGrid } from "./components/ActualsGrid";
import { MetricsDisplay } from "./components/MetricsDisplay";
import { BaselineManager } from "./components/BaselineManager";
import { DeleteConfirmationDialog } from "./components/DeleteConfirmationDialog";
import { Target, Lightbulb, TrendingUp, Users, Building2, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { AppMode, Team, Pod, Quarter, KR, Initiative, KRComment, WeeklyActual, ViewType, FilterOptions, Person, OrgFunction, Organization, Objective, FunctionType } from "./types";
import { mockTeams, mockPods, mockQuarters, mockKRs, mockInitiatives, mockPeople, mockFunctions, mockOrganizations, mockObjectives } from "./data/mockData";
import { adaptBackendToFrontend } from "./utils/dataAdapter";
import { enforceUniqueTeamData } from "./utils/teamNormalization";
import { AppProvider, useAppState, useFilteredKRs, useFilteredInitiatives, useBaseline } from "./state/store";
import { computeMetrics, generateWeeks } from "./metrics/engine";

const LOCAL_STORAGE_KEY = "kr-tracker-state-v3";

type PersistedAppState = {
  mode: AppMode;
  organizations: Organization[];
  teams: Team[];
  pods: Pod[];
  people: Person[];
  functions: OrgFunction[];
  quarters: Quarter[];
  objectives: Objective[];
  krs: KR[];
  initiatives: Initiative[];
  ui: {
    selectedTeam: string;
    selectedQuarter: string;
    viewType: ViewType;
    advancedFilters: FilterOptions;
    currentTab: "krs" | "initiatives";
    isObjectivesCollapsed: boolean;
  };
};

const sanitizeMode = (value: any): AppMode => (value === "execution" ? "execution" : "plan");
const sanitizeViewType = (value: any): ViewType => (value === "table" || value === "spreadsheet" ? value : "cards");
const sanitizeTab = (value: any): "krs" | "initiatives" => (value === "initiatives" ? "initiatives" : "krs");
const sanitizeFilters = (value: any): FilterOptions => (value && typeof value === "object" ? value : {});
const sanitizeBoolean = (value: any, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const cloneFunctions = (functions: OrgFunction[]): OrgFunction[] => functions.map(fn => ({ ...fn }));
const sanitizeFunctions = (value: any): OrgFunction[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((fn) => fn && typeof fn === 'object')
    .map((fn, index) => {
      const id = typeof fn.id === 'string' && fn.id.trim() ? fn.id.trim() : `function-${index}`;
      const name = typeof fn.name === 'string' && fn.name.trim() ? fn.name.trim() : id;
      const description = typeof fn.description === 'string' && fn.description.trim() ? fn.description.trim() : undefined;
      const color = typeof fn.color === 'string' && fn.color.trim() ? fn.color : '#6B7280';
      const createdAt = typeof fn.createdAt === 'string' && fn.createdAt.trim() ? fn.createdAt : new Date().toISOString();

      return { id, name, description, color, createdAt } satisfies OrgFunction;
    });
};

const sanitizeOrganizations = (value: any): Organization[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((org) => org && typeof org === 'object')
    .map((org: any, index): Organization | null => {
      const id = typeof org.id === 'string' && org.id.trim() ? org.id.trim() : `org-${index}`;
      const name = typeof org.name === 'string' && org.name.trim() ? org.name.trim() : '';
      if (!name) {
        return null;
      }

      return {
        id,
        name,
        description: typeof org.description === 'string' ? org.description.trim() : undefined,
        industry: typeof org.industry === 'string' ? org.industry.trim() : undefined,
        headquarters: typeof org.headquarters === 'string' ? org.headquarters.trim() : undefined,
      } satisfies Organization;
    })
    .filter((org): org is Organization => org !== null);
};

const sanitizeObjectives = (value: any, fallbackOrgId?: string): Objective[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((obj) => obj && typeof obj === 'object')
    .map((obj: any, index): Objective | null => {
      const id = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : `obj-${index}`;
      const title = typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : '';
      if (!title) {
        return null;
      }

      const organizationIdCandidate = typeof obj.organizationId === 'string' && obj.organizationId.trim()
        ? obj.organizationId.trim()
        : fallbackOrgId;
      if (!organizationIdCandidate) {
        return null;
      }

      const krIds: string[] = [];
      if (Array.isArray(obj.krIds)) {
        for (const candidate of obj.krIds) {
          if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            if (trimmed) {
              krIds.push(trimmed);
            }
          }
        }
      }

      return {
        id,
        organizationId: organizationIdCandidate,
        title,
        description: typeof obj.description === 'string' ? obj.description.trim() : undefined,
        owner: typeof obj.owner === 'string' ? obj.owner.trim() : undefined,
        teamId: typeof obj.teamId === 'string' ? obj.teamId.trim() : undefined,
        podId: typeof obj.podId === 'string' ? obj.podId.trim() : undefined,
        status: obj.status === 'draft' || obj.status === 'active' || obj.status === 'paused' || obj.status === 'completed'
          ? obj.status
          : undefined,
        krIds,
      } satisfies Objective;
    })
    .filter((obj): obj is Objective => obj !== null);
};

const sanitizePeople = (value: any, functionsList: OrgFunction[]): Person[] => {
  if (!Array.isArray(value)) return [];

  const fallbackFunctionId = functionsList[0]?.id || 'Product';
  const validFunctionIds = new Set(functionsList.map((fn) => fn.id));

  return value
    .filter((person) => person && typeof person === 'object')
    .map((person: any, index): Person | null => {
      const rawId = typeof person.id === 'string' && person.id.trim() ? person.id.trim() : `person-${index}`;
      const rawName = typeof person.name === 'string' && person.name.trim() ? person.name.trim() : '';
      const rawEmail = typeof person.email === 'string' && person.email.trim() ? person.email.trim() : `${rawId}@company.com`;
      const rawTeamId = typeof person.teamId === 'string' ? person.teamId.trim() : '';
      const rawPodId = typeof person.podId === 'string' && person.podId.trim() ? person.podId.trim() : undefined;
      const rawManagerId = typeof person.managerId === 'string' && person.managerId.trim() ? person.managerId.trim() : undefined;
      const candidateFunctionId = typeof person.functionId === 'string' && person.functionId.trim()
        ? person.functionId.trim()
        : typeof person.function === 'string' && person.function.trim()
          ? person.function.trim()
          : fallbackFunctionId;
      const functionId = validFunctionIds.size === 0 || validFunctionIds.has(candidateFunctionId)
        ? candidateFunctionId
        : fallbackFunctionId;

      if (!rawId || !rawName || !rawEmail) {
        return null;
      }

      return {
        id: rawId,
        name: rawName,
        email: rawEmail,
        functionId,
        managerId: rawManagerId,
        teamId: rawTeamId,
        podId: rawPodId,
        joinDate: typeof person.joinDate === 'string' && person.joinDate.trim() ? person.joinDate : new Date().toISOString().split('T')[0],
        active: typeof person.active === 'boolean' ? person.active : true,
      } satisfies Person;
    })
    .filter((person): person is Person => person !== null);
};

const loadPersistedState = (): PersistedAppState | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    // Ensure initiatives have all required fields, especially linkedKRIds
    const sanitizedInitiatives = Array.isArray(parsed.initiatives)
      ? parsed.initiatives.map((init: any) => ({
          ...init,
          linkedKRIds: Array.isArray(init.linkedKRIds) ? init.linkedKRIds : []
        }))
      : [];

    const sanitizedFunctions = sanitizeFunctions(parsed.functions);
    const functions = sanitizedFunctions.length > 0 ? sanitizedFunctions : cloneFunctions(mockFunctions);
    const sanitizedPeople = sanitizePeople(parsed.people, functions);
    const organizations = sanitizeOrganizations(parsed.organizations);
    const fallbackOrgId = organizations[0]?.id ?? mockOrganizations[0]?.id;
    const objectives = sanitizeObjectives(parsed.objectives, fallbackOrgId);

    return {
      mode: sanitizeMode(parsed.mode),
      organizations,
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
      pods: Array.isArray(parsed.pods) ? parsed.pods : [],
      people: sanitizedPeople,
      functions,
      quarters: Array.isArray(parsed.quarters) ? parsed.quarters : [],
      objectives,
      krs: Array.isArray(parsed.krs) ? parsed.krs : [],
      initiatives: sanitizedInitiatives,
      ui: {
        selectedTeam: parsed.ui?.selectedTeam ?? "all",
        selectedQuarter: parsed.ui?.selectedQuarter ?? "q4-2024",
        viewType: sanitizeViewType(parsed.ui?.viewType),
        advancedFilters: sanitizeFilters(parsed.ui?.advancedFilters),
        currentTab: sanitizeTab(parsed.ui?.currentTab),
        isObjectivesCollapsed: sanitizeBoolean(parsed.ui?.isObjectivesCollapsed, true),
      },
    };
  } catch (error) {
    console.error("Failed to load persisted state", error);
    return null;
  }
};

const persistState = (state: PersistedAppState) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to persist state", error);
  }
};

// Convert legacy data to new format for backward compatibility
const convertLegacyKRs = (legacyKRs: any[]): KR[] => {
  return legacyKRs.map(kr => {
    // Determine status based on progress if available
    let status: KR['status'] = 'not-started';
    if (kr.progress !== undefined) {
      const progress = kr.progress;
      if (progress >= 90) status = 'completed';
      else if (progress >= 70) status = 'on-track';
      else if (progress >= 50) status = 'at-risk';
      else if (progress > 0) status = 'off-track';
      else status = 'not-started';
    }

    return {
      ...kr,
      teamId: mockTeams.find(t => t.name === kr.team)?.id || 'team-1',
      podId: undefined,
      quarterId: 'q4-2024',
      unit: kr.target.includes('ms') ? 'ms' : kr.target.includes('/5') ? '/5' : 'users',
      baseline: '0',
      forecast: kr.current,
      status: kr.status || status, // Use existing status or calculated status
      weeklyActuals: [],
      autoUpdateEnabled: false,
      lastUpdated: new Date().toISOString(),
      comments: [],
      linkedInitiativeIds: [],
      sqlQuery: ''
    };
  });
};

const convertLegacyInitiatives = (legacyInitiatives: any[]): Initiative[] => {
  return legacyInitiatives.map(init => ({
    ...init,
    teamId: mockTeams.find(t => t.name === init.team)?.id || 'team-1',
    podId: undefined,
    progress: 50,
    milestones: [],
    linkedKRIds: [],
    budget: undefined,
    resources: []
  }));
};

const normalizeObjectivesForState = (
  objectives: Objective[],
  organizations: Organization[],
  teamIdMap: Record<string, string>,
  validTeamIds: Set<string>,
  validKRIds: Set<string>
): Objective[] => {
  const organizationIds = new Set(organizations.map((org) => org.id));

  return objectives
    .filter((objective) => organizationIds.has(objective.organizationId))
    .map((objective) => {
      const resolvedTeamId = objective.teamId ? (teamIdMap[objective.teamId] || (validTeamIds.has(objective.teamId) ? objective.teamId : undefined)) : undefined;
      const sanitizedStatus: Objective['status'] = objective.status === 'draft' || objective.status === 'active' || objective.status === 'paused' || objective.status === 'completed'
        ? objective.status
        : 'active';

      const filteredKrIds = objective.krIds.filter((id) => validKRIds.has(id));

      return {
        ...objective,
        teamId: resolvedTeamId,
        krIds: filteredKrIds,
        status: sanitizedStatus,
      };
    });
};

type DeleteType =
  | 'organization'
  | 'team'
  | 'pod'
  | 'person'
  | 'function'
  | 'objective'
  | 'kr'
  | 'initiative';

interface CascadeItem {
  label: string;
  count?: number;
  description?: string;
}

interface DeletePlan {
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

const isValidObjectiveStatus = (status: Objective['status']): status is NonNullable<Objective['status']> => {
  return status === 'draft' || status === 'active' || status === 'paused' || status === 'completed';
};

const teamBelongsToOrganization = (team: Team, organizationId: string, fallbackOrgId?: string) => {
  if (team.organizationId) {
    return team.organizationId === organizationId;
  }
  if (fallbackOrgId) {
    return fallbackOrgId === organizationId;
  }
  return false;
};

interface DeletionContext {
  organizations: Organization[];
  teams: Team[];
  pods: Pod[];
  people: Person[];
  functions: OrgFunction[];
  objectives: Objective[];
  krs: KR[];
  initiatives: Initiative[];
}

const computeDeletionPlan = (
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

  const buildCascadeItems = (...items: CascadeItem[]): CascadeItem[] =>
    items.filter((item) => typeof item.count === 'number' ? item.count > 0 : true);

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
        description: 'Pod members will remain in their teams but lose this pod assignment.',
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

function AppContent() {
  // Use the context state
  const { state: contextState, dispatch } = useAppState();

  // App mode state - prefer context state if available
  const [mode, setMode] = useState<AppMode>(contextState?.mode || 'plan');

  // Organization data - Initialize with empty arrays, will be populated from backend
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [functions, setFunctions] = useState<OrgFunction[]>([]);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  // UI state for collapsible sections
  const [isObjectivesCollapsed, setIsObjectivesCollapsed] = useState(true);
  const [showAddKRDialog, setShowAddKRDialog] = useState(false);
  const [showAddInitiativeDialog, setShowAddInitiativeDialog] = useState(false);

  // KRs and Initiatives with enhanced data - Initialize empty, will be populated from backend
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [krs, setKRs] = useState<KR[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);

  const [pendingDeletePlan, setPendingDeletePlan] = useState<DeletePlan | null>(null);

  // Filtering and view state
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedQuarter, setSelectedQuarter] = useState("q4-2024");
  const [viewType, setViewType] = useState<ViewType>('cards');
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>({});
  const [currentTab, setCurrentTab] = useState<'krs' | 'initiatives'>('krs');

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const shouldUseBackend = import.meta.env.VITE_USE_BACKEND === 'true';

  const hasHydratedRef = useRef(false);

  const handleRequestDelete = useCallback((type: DeleteType, targetId: string) => {
    const plan = computeDeletionPlan(type, targetId, {
      organizations,
      teams,
      pods,
      people,
      functions,
      objectives,
      krs,
      initiatives,
    });

    if (plan) {
      setPendingDeletePlan(plan);
    }
  }, [organizations, teams, pods, people, functions, objectives, krs, initiatives]);

  const applyDeletionPlan = useCallback((plan: DeletePlan) => {
    const { removals, updates } = plan;

    const removeSet = <T extends { id: string }>(items: T[], set?: Set<string>) => {
      if (!set || set.size === 0) return items;
      return items.filter((item) => !set.has(item.id));
    };

    const applyUpdates = <T extends { id: string }>(items: T[], map?: Map<string, Partial<T>>) => {
      if (!map || map.size === 0) return items;
      return items.map((item) => map.has(item.id) ? { ...item, ...map.get(item.id)! } : item);
    };

    let nextOrganizations = removeSet(organizations, removals.organizations);
    let nextFunctions = removeSet(functions, removals.functions);

    let nextTeams = removeSet(teams, removals.teams);

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

    if (removals.teams && removals.teams.size > 0 && selectedTeam !== 'all') {
      const stillExists = nextTeams.some((team) => team.name === selectedTeam);
      if (!stillExists) {
        setSelectedTeam('all');
      }
    }

    setOrganizations(nextOrganizations.map((org) => ({ ...org })));
    setFunctions(nextFunctions.map((fn) => ({ ...fn })));
    setTeams(nextTeams.map((team) => ({ ...team })));
    setPods(nextPods.map((pod) => ({ ...pod })));
    setPeople(nextPeople.map((person) => ({ ...person })));
    setObjectives(nextObjectives.map((objective) => ({ ...objective })));
    setKRs(nextKRs.map((kr) => ({ ...kr })));
    setInitiatives(nextInitiatives.map((initiative) => ({ ...initiative })));
  }, [organizations, teams, pods, people, functions, objectives, krs, initiatives, selectedTeam]);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeletePlan) return;

    const freshPlan = computeDeletionPlan(pendingDeletePlan.type, pendingDeletePlan.id, {
      organizations,
      teams,
      pods,
      people,
      functions,
      objectives,
      krs,
      initiatives,
    });

    if (freshPlan) {
      applyDeletionPlan(freshPlan);
    }

    setPendingDeletePlan(null);
  }, [pendingDeletePlan, organizations, teams, pods, people, functions, objectives, krs, initiatives, applyDeletionPlan]);

  const handleCancelDelete = useCallback(() => {
    setPendingDeletePlan(null);
  }, []);

  const handleTeamsChange = useCallback((nextTeams: Team[]) => {
    const normalized = enforceUniqueTeamData({
      teams: nextTeams,
      pods,
      people,
      krs,
      initiatives,
    });

    setTeams(normalized.teams);

    const hasTeamIdChanges = Object.entries(normalized.teamIdMap).some(
      ([originalId, canonicalId]) => originalId !== canonicalId
    );

    if (hasTeamIdChanges) {
      setPods(normalized.pods);
      setPeople(normalized.people);
      setKRs(normalized.krs);
      setInitiatives(normalized.initiatives);
      const updatedObjectives = normalizeObjectivesForState(
        objectives,
        organizations.length > 0 ? organizations : mockOrganizations,
        normalized.teamIdMap,
        new Set(normalized.teams.map((team) => team.id)),
        new Set(normalized.krs.map((kr) => kr.id))
      );
      setObjectives(updatedObjectives);
    }
  }, [pods, people, krs, initiatives, objectives, organizations]);

  const applyPersistedState = (persisted: PersistedAppState) => {
    setMode(persisted.mode);
    const activeOrganizations = (persisted.organizations && persisted.organizations.length > 0 ? persisted.organizations : mockOrganizations).map((org) => ({ ...org }));
    const normalized = enforceUniqueTeamData({
      teams: persisted.teams,
      pods: persisted.pods,
      people: persisted.people,
      krs: persisted.krs,
      initiatives: persisted.initiatives,
    });
    setOrganizations(activeOrganizations);
    setTeams(normalized.teams);
    setPods(normalized.pods);
    setFunctions(persisted.functions);
    setPeople(normalized.people);
    setQuarters(persisted.quarters);
    const objectivesSource = (persisted.objectives && persisted.objectives.length > 0 ? persisted.objectives : mockObjectives).map((objective) => ({ ...objective }));
    const normalizedObjectives = normalizeObjectivesForState(
      objectivesSource,
      activeOrganizations,
      normalized.teamIdMap,
      new Set(normalized.teams.map((team) => team.id)),
      new Set(normalized.krs.map((kr) => kr.id))
    );
    setObjectives(normalizedObjectives);
    setKRs(normalized.krs);
    setInitiatives(normalized.initiatives);
    setSelectedTeam(persisted.ui.selectedTeam ?? "all");
    setSelectedQuarter(persisted.ui.selectedQuarter ?? "q4-2024");
    setViewType(persisted.ui.viewType);
    setAdvancedFilters(persisted.ui.advancedFilters || {});
    setCurrentTab(persisted.ui.currentTab);
    setIsObjectivesCollapsed(persisted.ui.isObjectivesCollapsed);
  };

  const hydrateWithMockData = useCallback(() => {
    const normalized = enforceUniqueTeamData({
      teams: mockTeams,
      pods: mockPods,
      people: mockPeople,
      krs: mockKRs,
      initiatives: mockInitiatives,
    });
    const activeOrganizations = mockOrganizations.map((org) => ({ ...org }));

    setOrganizations(activeOrganizations);
    setTeams(normalized.teams);
    setPods(normalized.pods);
    setFunctions(cloneFunctions(mockFunctions));
    setPeople(normalized.people);
    setQuarters(mockQuarters);

    const normalizedObjectives = normalizeObjectivesForState(
      mockObjectives.map((objective) => ({ ...objective })),
      activeOrganizations,
      normalized.teamIdMap,
      new Set(normalized.teams.map((team) => team.id)),
      new Set(normalized.krs.map((kr) => kr.id))
    );
    setObjectives(normalizedObjectives);
    setKRs(normalized.krs);
    setInitiatives(normalized.initiatives);
  }, []);

  // Fetch data from backend or local storage on mount
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!shouldUseBackend) {
        if (isMounted) {
          console.info('Backend disabled via VITE_USE_BACKEND; hydrating with mock data.');
          hydrateWithMockData();
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch('/api/state');
        if (response.ok) {
          const backendData = await response.json();
          const adaptedData = adaptBackendToFrontend(backendData);
          const normalized = enforceUniqueTeamData({
            teams: adaptedData.teams,
            pods: adaptedData.pods,
            people: adaptedData.people,
            krs: adaptedData.krs,
            initiatives: adaptedData.initiatives,
          });

          if (!isMounted) return;

          const activeOrganizations = (adaptedData.organizations && adaptedData.organizations.length > 0 ? adaptedData.organizations : mockOrganizations).map((org) => ({ ...org }));
          setOrganizations(activeOrganizations);
          setTeams(normalized.teams);
          setPods(normalized.pods);
          setFunctions(adaptedData.functions && adaptedData.functions.length > 0
            ? adaptedData.functions
            : cloneFunctions(mockFunctions));
          setPeople(normalized.people);
          setQuarters(adaptedData.quarters);
          const objectivesFromBackend = (adaptedData.objectives && adaptedData.objectives.length > 0 ? adaptedData.objectives : mockObjectives).map((objective) => ({ ...objective }));
          const normalizedObjectives = normalizeObjectivesForState(
            objectivesFromBackend,
            activeOrganizations,
            normalized.teamIdMap,
            new Set(normalized.teams.map((team) => team.id)),
            new Set(normalized.krs.map((kr) => kr.id))
          );
          setObjectives(normalizedObjectives);
          setKRs(normalized.krs);
          setInitiatives(normalized.initiatives);
          setMode(adaptedData.mode);
        } else if (isMounted) {
          console.info(`Backend responded with ${response.status}; using mock data.`);
          hydrateWithMockData();
        }
      } catch (error) {
        if (!isMounted) return;
        console.info('Backend fetch failed; using mock data instead.', error);
        hydrateWithMockData();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const init = async () => {
      const persisted = loadPersistedState();
      if (persisted) {
        applyPersistedState(persisted);
        setIsLoading(false);
        return;
      }

      await fetchData();
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      hasHydratedRef.current = true;
    }
  }, [isLoading]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    const normalizedForPersistence = enforceUniqueTeamData({
      teams,
      pods,
      people,
      krs,
      initiatives,
    });

    const organizationsForPersistence = organizations.length > 0 ? organizations : mockOrganizations;
    const normalizedObjectivesForPersistence = normalizeObjectivesForState(
      objectives,
      organizationsForPersistence,
      normalizedForPersistence.teamIdMap,
      new Set(normalizedForPersistence.teams.map((team) => team.id)),
      new Set(normalizedForPersistence.krs.map((kr) => kr.id))
    );

    const persistedState: PersistedAppState = {
      mode,
      organizations: organizationsForPersistence.map((org) => ({ ...org })),
      teams: normalizedForPersistence.teams,
      pods: normalizedForPersistence.pods,
      functions,
      people: normalizedForPersistence.people,
      quarters,
      objectives: normalizedObjectivesForPersistence,
      krs: normalizedForPersistence.krs,
      initiatives: normalizedForPersistence.initiatives,
      ui: {
        selectedTeam,
        selectedQuarter,
        viewType,
        advancedFilters,
        currentTab,
        isObjectivesCollapsed,
      },
    };

    persistState(persistedState);
  }, [
    mode,
    organizations,
    teams,
    pods,
    people,
    functions,
    quarters,
    objectives,
    krs,
    initiatives,
    selectedTeam,
    selectedQuarter,
    viewType,
    advancedFilters,
    currentTab,
    isObjectivesCollapsed,
    isLoading,
  ]);
  
  // Deduplicate teams to prevent duplicate keys in components
  const uniqueTeams = teams.filter((team, index, arr) => 
    arr.findIndex(t => t.id === team.id || t.name === team.name) === index
  );
  
  // Get team names for legacy compatibility
  const getTeamName = (teamId: string) => {
    if (!teamId) return 'Unknown';
    return uniqueTeams.find(t => t.id === teamId)?.name || 'Unknown';
  };

  const fallbackOrganizationId = organizations[0]?.id;

  const organizationSummaries = organizations.map((organization) => {
    const orgTeams = uniqueTeams.filter((team) => teamBelongsToOrganization(team, organization.id, fallbackOrganizationId));
    const orgTeamIds = new Set(orgTeams.map((team) => team.id));

    const orgPods = pods.filter((pod) => orgTeamIds.has(pod.teamId));
    const orgPeople = people.filter((person) => person.teamId && orgTeamIds.has(person.teamId));
    const orgObjectives = objectives.filter((objective) =>
      objective.organizationId === organization.id || (objective.teamId && orgTeamIds.has(objective.teamId)),
    );
    const objectiveIds = new Set(orgObjectives.map((objective) => objective.id));
    const orgKRs = krs.filter((kr) =>
      kr.organizationId === organization.id ||
      orgTeamIds.has(kr.teamId) ||
      (kr.objectiveId && objectiveIds.has(kr.objectiveId)),
    );
    const orgKRIds = new Set(orgKRs.map((kr) => kr.id));
    const orgInitiatives = initiatives.filter((initiative) =>
      orgTeamIds.has(initiative.teamId) || initiative.linkedKRIds.some((krId) => orgKRIds.has(krId)),
    );

    return {
      organization,
      teamCount: orgTeams.length,
      podCount: orgPods.length,
      peopleCount: orgPeople.length,
      objectiveCount: orgObjectives.length,
      krCount: orgKRs.length,
      initiativeCount: orgInitiatives.length,
    };
  });

  const objectiveSummaries = objectives.map((objective) => {
    const linkedKRs = krs.filter((kr) => kr.objectiveId === objective.id);
    const linkedKRIds = new Set(linkedKRs.map((kr) => kr.id));
    const linkedInitiatives = initiatives.filter((initiative) => initiative.linkedKRIds.some((krId) => linkedKRIds.has(krId)));

    return {
      objective,
      krCount: linkedKRs.length,
      initiativeCount: linkedInitiatives.length,
    };
  });
  
  // Filter data based on selections
  const filteredKRs = krs.filter(kr => {
    // Basic team filter
    const basicTeamMatch = selectedTeam === "all" || getTeamName(kr.teamId) === selectedTeam;

    // In Plan Mode, show all KRs; in Execution Mode, filter by quarter if set
    const basicQuarterMatch = mode === 'plan' ? true :
      (!kr.quarterId || kr.quarterId === selectedQuarter);

    // Advanced quarter filter overrides basic if set
    const quarterMatch = advancedFilters.quarter && advancedFilters.quarter !== 'all'
      ? quarters.find(q => q.name === advancedFilters.quarter)?.id === kr.quarterId
      : basicQuarterMatch;
    
    // Advanced filters
    const advancedTeamMatch = !advancedFilters.team || advancedFilters.team === 'all' || 
      getTeamName(kr.teamId) === advancedFilters.team || 
      (kr.teamIds && kr.teamIds.some(teamId => getTeamName(teamId) === advancedFilters.team));
    
    const podMatch = !advancedFilters.pod || advancedFilters.pod === 'all' ||
      (kr.podId && pods.find(p => p.id === kr.podId)?.name === advancedFilters.pod) ||
      (!kr.podId && advancedFilters.pod === 'None');
    
    const ownerMatch = !advancedFilters.owner || advancedFilters.owner === 'all' ||
      kr.owner === advancedFilters.owner;
    
    const statusMatch = !advancedFilters.status || advancedFilters.status === 'all' ||
      kr.status === advancedFilters.status;
      
    const krMatch = !advancedFilters.kr || advancedFilters.kr === 'all' ||
      kr.title === advancedFilters.kr;
    
    return basicTeamMatch && quarterMatch && advancedTeamMatch && podMatch && ownerMatch && statusMatch && krMatch;
  });
  
  const filteredInitiatives = initiatives.filter(init => {
    // Basic team filter
    const basicTeamMatch = selectedTeam === "all" || getTeamName(init.teamId) === selectedTeam;
    
    // Advanced filters
    const advancedTeamMatch = !advancedFilters.team || advancedFilters.team === 'all' || 
      getTeamName(init.teamId) === advancedFilters.team;
    
    const podMatch = !advancedFilters.pod || advancedFilters.pod === 'all' ||
      (init.podId && pods.find(p => p.id === init.podId)?.name === advancedFilters.pod);
      
    const ownerMatch = !advancedFilters.owner || advancedFilters.owner === 'all' ||
      init.owner === advancedFilters.owner;
      
    const statusMatch = !advancedFilters.status || advancedFilters.status === 'all' ||
      init.status === advancedFilters.status;
      
    const priorityMatch = !advancedFilters.priority || advancedFilters.priority === 'all' ||
      init.priority === advancedFilters.priority;
      
    const initiativeMatch = !advancedFilters.initiative || advancedFilters.initiative === 'all' ||
      init.title === advancedFilters.initiative;
    
    return basicTeamMatch && advancedTeamMatch && podMatch && ownerMatch && statusMatch && priorityMatch && initiativeMatch;
  });

  // Legacy team name array for components that expect it - deduplicated to prevent duplicate keys
  const teamNames = uniqueTeams.map(t => t.name);
  
  const krCounts = uniqueTeams.reduce((acc, team) => {
    acc[team.name] = krs.filter(kr => kr.teamId === team.id).length;
    return acc;
  }, {} as Record<string, number>);

  const initiativeCounts = uniqueTeams.reduce((acc, team) => {
    acc[team.name] = initiatives.filter(init => init.teamId === team.id).length;
    return acc;
  }, {} as Record<string, number>);

  const handleAddKR = (newKR: any) => {
    // Convert team name to team ID
    const teamId = uniqueTeams.find(t => t.name === newKR.team)?.id || uniqueTeams[0]?.id || 'team-1';
    
    const enhancedKR = {
      ...newKR,
      teamId,
      quarterId: selectedQuarter,
      unit: 'count',
      baseline: '0',
      forecast: newKR.current,
      status: newKR.status || 'not-started', // Add default status
      weeklyActuals: [],
      autoUpdateEnabled: false,
      lastUpdated: new Date().toISOString(),
      comments: [],
      linkedInitiativeIds: [],
      sqlQuery: ''
    };
    
    setKRs(prev => [...prev, enhancedKR]);
  };

  const handleAddInitiative = (newInitiative: any) => {
    // Convert team name to team ID
    const teamId = uniqueTeams.find(t => t.name === newInitiative.team)?.id || uniqueTeams[0]?.id || 'team-1';
    
    const enhancedInitiative = {
      ...newInitiative,
      teamId,
      podId: undefined,
      progress: 0,
      milestones: [],
      linkedKRIds: [],
      budget: undefined,
      resources: []
    };
    
    setInitiatives(prev => [...prev, enhancedInitiative]);
  };

  const handleUpdateKR = (id: string, updates: any) => {
    setKRs(prev => prev.map(kr => 
      kr.id === id ? { ...kr, ...updates, lastUpdated: new Date().toISOString() } : kr
    ));
  };

  const handleAddComment = (krId: string, comment: Omit<KRComment, 'id' | 'krId' | 'timestamp'>) => {
    const newComment: KRComment = {
      id: `comment-${Date.now()}`,
      krId,
      timestamp: new Date().toISOString(),
      ...comment
    };
    
    setKRs(prev => prev.map(kr => 
      kr.id === krId 
        ? { ...kr, comments: [...kr.comments, newComment] }
        : kr
    ));
  };

  const handleAddWeeklyActual = (krId: string, weeklyActual: Omit<WeeklyActual, 'id' | 'krId'>) => {
    const newWeeklyActual: WeeklyActual = {
      id: `weekly-${Date.now()}`,
      krId,
      ...weeklyActual
    };
    
    setKRs(prev => prev.map(kr => 
      kr.id === krId 
        ? { ...kr, weeklyActuals: [...kr.weeklyActuals, newWeeklyActual] }
        : kr
    ));
  };

  // Calculate metrics based on filtered data in execution mode
  const metricsKRs = mode === 'execution' ? filteredKRs : krs;
  const totalKRs = metricsKRs.length;
  const completedKRs = metricsKRs.filter(kr => kr.status === "completed").length;
  const averageProgress = totalKRs > 0 ? Math.round(metricsKRs.reduce((acc, kr) => acc + kr.progress, 0) / totalKRs) : 0;
  const atRiskKRs = metricsKRs.filter(kr => kr.status === "at-risk" || kr.status === "off-track").length;

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl mb-2">Loading OKR Tracker...</h2>
          <p className="text-muted-foreground">Fetching data from server</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1>Team OKR & Initiative Tracker</h1>
              <p className="text-muted-foreground">Track key results and initiatives across your organization</p>
            </div>
            <div className="flex items-center gap-4">
              <ModeSwitch currentMode={mode} onModeChange={setMode} />
              <TeamFilter 
                selectedTeam={selectedTeam}
                onTeamChange={setSelectedTeam}
                teams={teamNames}
                counts={mode === 'plan' ? krCounts : initiativeCounts}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Mode Description */}
        <div className="mb-8">
          <ModeDescription mode={mode} />
        </div>

        {/* Plan Mode Content */}
        {mode === 'plan' && (
          <div className="space-y-8">
            {/* Organization Setup Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Teams</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teams.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {pods.length} pods total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">People</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{people.filter(p => p.active).length}</div>
                  <p className="text-xs text-muted-foreground">
                    {people.filter(p => p.managerId).length} with managers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Planned KRs</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{krs.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {krs.filter(kr => kr.autoUpdateEnabled).length} auto-updating
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Initiatives</CardTitle>
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{initiatives.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {initiatives.filter(i => i.linkedKRIds && i.linkedKRIds.length > 0).length} linked to KRs
                  </p>
                </CardContent>
              </Card>
            </div>

            {organizationSummaries.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Organizations
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {organizationSummaries.length}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {organizationSummaries.map(({ organization, teamCount, podCount, peopleCount, objectiveCount, krCount, initiativeCount }) => (
                    <div key={organization.id} className="flex items-start justify-between rounded-md border p-3">
                      <div>
                        <p className="font-semibold">{organization.name}</p>
                        <p className="text-xs text-muted-foreground">{organization.description || 'No description provided'}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{teamCount} teams</span>
                          <span>{podCount} pods</span>
                          <span>{peopleCount} people</span>
                          <span>{objectiveCount} objectives</span>
                          <span>{krCount} KRs</span>
                          <span>{initiativeCount} initiatives</span>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRequestDelete('organization', organization.id)}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Collapsible Organization Manager */}
            <OrganizationManager
              teams={teams}
              pods={pods}
              people={people}
              functions={functions}
              onTeamsChange={handleTeamsChange}
              onPodsChange={setPods}
              onPeopleChange={setPeople}
              onFunctionsChange={setFunctions}
              onRequestDeleteTeam={(teamId) => handleRequestDelete('team', teamId)}
              onRequestDeletePod={(podId) => handleRequestDelete('pod', podId)}
              onRequestDeletePerson={(personId) => handleRequestDelete('person', personId)}
              onRequestDeleteFunction={(functionId) => handleRequestDelete('function', functionId)}
            />

            {/* Collapsible Objectives & Key Results Section */}
            <Card>
              <Collapsible open={!isObjectivesCollapsed} onOpenChange={(open) => setIsObjectivesCollapsed(!open)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      {isObjectivesCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="text-base font-medium leading-none">Objectives & Key Results</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {isObjectivesCollapsed 
                              ? `${krs.length} ${krs.length === 1 ? 'KR' : 'KRs'}, ${initiatives.length} ${initiatives.length === 1 ? 'initiative' : 'initiatives'}` 
                              : "Define your key results and initiatives for the quarter"
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    {isObjectivesCollapsed && (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button onClick={() => setShowAddKRDialog(true)} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add KR
                        </Button>
                        <Button onClick={() => setShowAddInitiativeDialog(true)} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Initiative
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Objectives Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5 rotate-45" />
                          Objectives
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Manage the strategic objectives that group your key results
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold">{objectives.length}</div>
                            <p className="text-xs text-muted-foreground">
                              {objectives.filter((objective) => objective.status === 'active').length} active
                            </p>
                          </div>
                        </div>

                        {objectiveSummaries.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Objective Directory:</p>
                            <div className="space-y-2">
                              {objectiveSummaries.map(({ objective, krCount, initiativeCount }) => (
                                <div key={objective.id} className="rounded-md border p-2 text-xs flex items-start justify-between">
                                  <div className="space-y-1">
                                    <p className="font-medium text-sm">{objective.title}</p>
                                    <div className="flex flex-wrap gap-2 text-muted-foreground">
                                      <span>{krCount} KRs</span>
                                      <span>{initiativeCount} initiatives</span>
                                      {objective.status && isValidObjectiveStatus(objective.status) && (
                                        <Badge variant="outline" className="text-xs">
                                          {objective.status}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => handleRequestDelete('objective', objective.id)}
                                    aria-label={`Delete objective ${objective.title}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No objectives yet. Link KRs to strategic outcomes.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* KR Planning Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Key Results
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Set measurable outcomes that define success
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold">{krs.length}</div>
                            <p className="text-xs text-muted-foreground">
                              {krs.filter(kr => kr.autoUpdateEnabled).length} auto-updating
                            </p>
                          </div>
                          <Button onClick={() => setShowAddKRDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add KR
                          </Button>
                        </div>
                        
                        {krs.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Recent KRs:</p>
                            <div className="space-y-1">
                              {krs.slice(-3).map((kr) => (
                                <div key={kr.id} className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between">
                                  <span className="truncate">{kr.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {getTeamName(kr.teamId)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Initiative Planning Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Lightbulb className="h-5 w-5" />
                          Initiatives
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Plan strategic projects to achieve your goals
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold">{initiatives.length}</div>
                            <p className="text-xs text-muted-foreground">
                              {initiatives.filter(i => i.linkedKRIds && i.linkedKRIds.length > 0).length} linked to KRs
                            </p>
                          </div>
                          <Button onClick={() => setShowAddInitiativeDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Initiative
                          </Button>
                        </div>
                        
                        {initiatives.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Recent Initiatives:</p>
                            <div className="space-y-1">
                              {initiatives.slice(-3).map((initiative) => (
                                <div key={initiative.id} className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between">
                                  <span className="truncate">{initiative.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {getTeamName(initiative.teamId)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>
        )}

        {/* Execution Mode Content */}
        {mode === 'execution' && (
          <>
            {/* Baseline Manager */}
            <div className="mb-6">
              <BaselineManager
                krs={filteredKRs}
                weeks={generateWeeks(
                  quarters.find(q => q.id === selectedQuarter)?.startDate || '2024-10-01',
                  quarters.find(q => q.id === selectedQuarter)?.endDate || '2024-12-31'
                )}
              />
            </div>

            {/* Advanced Filters */}
            <div className="mb-6">
              <AdvancedFilter
                teams={teams}
                pods={pods}
                krs={krs}
                initiatives={initiatives}
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
                mode={mode}
                quarters={quarters}
              />
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">
                    {Object.keys(advancedFilters).length > 0 ? 'Filtered KRs' : 'Total KRs'}
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{totalKRs}</span>
                    <Badge variant="secondary">{completedKRs} completed</Badge>
                  </div>
                  {Object.keys(advancedFilters).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      of {krs.length} total KRs
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Avg Progress</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageProgress}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">At Risk</CardTitle>
                  <Target className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{atRiskKRs}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Active Teams</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teams.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Actuals Grid and Metrics - Only show if baseline is locked */}
            {(() => {
              const baseline = contextState?.planBaselines?.find(b => b.id === contextState.currentBaselineId) || null;
              const weeks = generateWeeks(
                quarters.find(q => q.id === selectedQuarter)?.startDate || '2024-10-01',
                quarters.find(q => q.id === selectedQuarter)?.endDate || '2024-12-31'
              );
              const currentWeekIndex = Math.floor(weeks.length / 2); // Use middle week as current
              const currentWeek = weeks[currentWeekIndex] || weeks[0];

              if (baseline) {
                const metrics = computeMetrics({
                  krs: filteredKRs,
                  baseline,
                  actuals: contextState?.actuals || {},
                  weeks,
                  currentWeekIndex
                });

                return (
                  <>
                    <div className="mb-6">
                      <ActualsGrid
                        krs={filteredKRs}
                        baseline={baseline}
                        actuals={contextState?.actuals || {}}
                        weeks={weeks}
                        onUpdate={(updates) => {
                          dispatch({ type: 'BULK_UPDATE_ACTUALS', updates });
                        }}
                      />
                    </div>

                    <div className="mb-6">
                      <MetricsDisplay
                        krs={filteredKRs}
                        metrics={metrics}
                        currentWeek={currentWeek}
                      />
                    </div>
                  </>
                );
              }

              return null;
            })()}
          </>
        )}

        {mode === 'execution' && (
          <Tabs defaultValue="krs" className="space-y-6" onValueChange={(value) => setCurrentTab(value as 'krs' | 'initiatives')}>
            {/* Filter Results Summary */}
            {Object.keys(advancedFilters).length > 0 && (
              <FilterResultsSummary
                totalKRs={krs.length}
                totalInitiatives={initiatives.length}
                filteredKRs={filteredKRs.length}
                filteredInitiatives={filteredInitiatives.length}
                activeFilters={advancedFilters}
                currentTab={currentTab}
              />
            )}
            
            <div className="flex items-center justify-between">
              <TabsList className="grid w-auto grid-cols-2">
                <TabsTrigger value="krs" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Key Results ({filteredKRs.length})
                </TabsTrigger>
                <TabsTrigger value="initiatives" className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Initiatives ({filteredInitiatives.length})
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={viewType === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewType('cards')}
                >
                  Cards
                </Button>
                <Button
                  variant={viewType === 'spreadsheet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewType('spreadsheet')}
                >
                  Spreadsheet
                </Button>
              </div>
            </div>

          <TabsContent value="krs" className="space-y-6">
            {viewType === 'spreadsheet' ? (
              <KRSpreadsheetView
                krs={filteredKRs}
                teams={teams}
                onUpdateKR={handleUpdateKR}
                onAddComment={handleAddComment}
                onAddWeeklyActual={handleAddWeeklyActual}
              />
            ) : (
              <>
                <div>
                  <h2>Key Results</h2>
                  <p className="text-muted-foreground">
                    Track progress towards measurable outcomes
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredKRs.map((kr) => (
                    <KRCard 
                      key={kr.id} 
                      {...kr} 
                      team={getTeamName(kr.teamId)}
                      onUpdate={handleUpdateKR}
                      onDelete={(krId) => handleRequestDelete('kr', krId)}
                    />
                  ))}
                </div>
              </>
            )}

            {filteredKRs.length === 0 && (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3>No key results found</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedTeam === "all" 
                    ? "Switch to Plan Mode to add your first key result" 
                    : `No key results found for ${selectedTeam} team`}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="initiatives" className="space-y-6">
            <div>
              <h2>Initiatives</h2>
              <p className="text-muted-foreground">
                Manage strategic projects and initiatives
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInitiatives.map((initiative) => (
                <InitiativeCard 
                  key={initiative.id} 
                  {...initiative} 
                  team={getTeamName(initiative.teamId)}
                  onDelete={(initiativeId) => handleRequestDelete('initiative', initiativeId)}
                />
              ))}
            </div>

            {filteredInitiatives.length === 0 && (
              <div className="text-center py-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3>No initiatives found</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedTeam === "all" 
                    ? "Switch to Plan Mode to add your first initiative" 
                    : `No initiatives found for ${selectedTeam} team`}
                </p>
              </div>
            )}
          </TabsContent>
          </Tabs>
        )}
      </div>

      {showAddKRDialog && (
        <AddKRDialog
          open={showAddKRDialog}
          onOpenChange={setShowAddKRDialog}
          onAddKR={handleAddKR}
          teams={teams}
          pods={pods}
        />
      )}

      {showAddInitiativeDialog && (
        <AddInitiativeDialog
          open={showAddInitiativeDialog}
          onOpenChange={setShowAddInitiativeDialog}
          onAddInitiative={handleAddInitiative}
          teams={teams}
        />
      )}

      {pendingDeletePlan && (
        <DeleteConfirmationDialog
          open={!!pendingDeletePlan}
          onOpenChange={(open) => {
            if (!open) {
              handleCancelDelete();
            }
          }}
          title={pendingDeletePlan.title}
          description={pendingDeletePlan.description}
          confirmLabel={pendingDeletePlan.confirmLabel}
          cascadeItems={pendingDeletePlan.cascadeItems}
          additionalNotes={pendingDeletePlan.notes}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
