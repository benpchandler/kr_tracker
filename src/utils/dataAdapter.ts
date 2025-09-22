import { Team, Pod, Quarter, KR, Initiative, Person, OrgFunction, Organization, Objective } from '../types';
import { defaultFunctions } from '../data/functions';

interface BackendState {
  organization: { id: string; name: string } | null;
  objectives: Array<{ id: string; name: string }>;
  objectiveTeams: Array<{ objectiveId: string; teamId: string }>;
  krs: Array<{
    id: string;
    name: string;
    unit: string;
    aggregation: string;
    objectiveId?: string;
    teamId?: string;
    podId?: string;
    driId?: string;
  }>;
  teams: Array<{ id: string; name: string; color: string }>;
  pods: Array<{ id: string; teamId: string; name: string }>;
  individuals: Array<{
    id: string;
    name: string;
    email?: string;
    teamId: string;
    podId?: string;
    role: string;
    discipline?: string;
    managerId?: string | null;
    joinDate?: string | null;
    active?: number | boolean | null;
  }>;
  functions: Array<{
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
    createdAt?: string | null;
  }>;
  period: { startISO: string; endISO: string };
  planDraft: Record<string, Record<string, number>>;
  actuals: Record<string, Record<string, number>>;
  baselines: Array<any>;
  currentBaselineId?: string;
  initiatives: Array<{
    id: string;
    krId: string;
    name: string;
    impact: number;
    confidence: number;
    isPlaceholder: number;
    status?: string;
  }>;
  phase: string;
  reportingDateISO: string;
  theme: string;
}

// Map backend teams to frontend format
export function adaptTeams(backendTeams: BackendState['teams'], organization: BackendState['organization'] | null): Team[] {
  const organizationId = organization?.id || 'org-backend';
  return backendTeams.map(team => ({
    id: team.id,
    organizationId,
    name: team.name,
    description: team.description || `${team.name} team`,
    color: team.color || '#3B82F6'
  }));
}

// Map backend pods to frontend format
export function adaptPods(backendPods: BackendState['pods'], individuals: BackendState['individuals']): Pod[] {
  return backendPods.map(pod => {
    const podMembers = individuals.filter(ind => ind.podId === pod.id);
    return {
      id: pod.id,
      name: pod.name,
      teamId: pod.teamId,
      description: pod.description || pod.name,
      members: podMembers.map(member => ({
        name: member.name,
        role: mapDisciplineToFunctionId(member.discipline || member.role)
      }))
    };
  });
}

// Map backend individuals to frontend Person format
export function adaptPeople(backendIndividuals: BackendState['individuals']): Person[] {
  return backendIndividuals.map(ind => ({
    id: ind.id,
    name: ind.name,
    email: ind.email || `${ind.id}@company.com`,
    functionId: mapDisciplineToFunctionId(ind.discipline || ind.role),
    teamId: ind.teamId,
    podId: ind.podId,
    managerId: typeof ind.managerId === 'string' && ind.managerId.trim() ? ind.managerId.trim() : undefined,
    joinDate: typeof ind.joinDate === 'string' && ind.joinDate.trim() ? ind.joinDate : new Date().toISOString().split('T')[0],
    active: ind.active === undefined || ind.active === null ? true : !!ind.active
  }));
}

function mapDisciplineToFunctionId(discipline?: string): OrgFunction['id'] {
  const disciplineMap: Record<string, OrgFunction['id']> = {
    'product': 'Product',
    'engineering': 'Engineering',
    'analytics': 'Analytics',
    'design': 'Design',
    'operations': 'S&O',
    'strategy': 'S&O'
  };
  return disciplineMap[discipline?.toLowerCase() || ''] || defaultFunctions[defaultFunctions.length - 1]?.id || 'S&O';
}

const cloneDefaultFunctions = (): OrgFunction[] => defaultFunctions.map(fn => ({ ...fn }));

export function adaptFunctions(backendFunctions: BackendState['functions']): OrgFunction[] {
  if (!Array.isArray(backendFunctions) || backendFunctions.length === 0) {
    return cloneDefaultFunctions();
  }

  return backendFunctions
    .filter(fn => fn && typeof fn === 'object' && typeof fn.id === 'string' && fn.id.trim())
    .map((fn, index) => {
      const id = fn.id.trim();
      const name = typeof fn.name === 'string' && fn.name.trim() ? fn.name.trim() : id;
      const color = typeof fn.color === 'string' && fn.color.trim() ? fn.color : '#3B82F6';
      const description = typeof fn.description === 'string' && fn.description.trim() ? fn.description : undefined;
      const createdAt = typeof fn.createdAt === 'string' && fn.createdAt.trim()
        ? fn.createdAt
        : new Date(Date.now() + index).toISOString();

      return {
        id,
        name,
        description,
        color,
        createdAt,
      } satisfies OrgFunction;
    });
}

export function adaptOrganizations(organization: BackendState['organization']): Organization[] {
  if (!organization) {
    return [];
  }

  return [
    {
      id: organization.id,
      name: organization.name,
      description: `${organization.name} organization`,
    },
  ];
}

export function adaptObjectives(
  backendObjectives: BackendState['objectives'],
  organization: BackendState['organization'] | null,
  objectiveTeams: BackendState['objectiveTeams'],
  backendKRs: BackendState['krs']
): Objective[] {
  const organizationId = organization?.id || 'org-backend';
  const objectiveTeamMap = new Map<string, string>();
  objectiveTeams.forEach((entry) => {
    if (entry.objectiveId && entry.teamId) {
      objectiveTeamMap.set(entry.objectiveId, entry.teamId);
    }
  });

  const objectiveToKRs = backendKRs.reduce<Record<string, Set<string>>>((acc, kr) => {
    if (kr.objectiveId) {
      if (!acc[kr.objectiveId]) {
        acc[kr.objectiveId] = new Set();
      }
      acc[kr.objectiveId].add(kr.id);
    }
    return acc;
  }, {});

  return backendObjectives.map((objective, index) => {
    const teamId = objectiveTeamMap.get(objective.id);
    const krIds = Array.from(objectiveToKRs[objective.id] || []);

    return {
      id: objective.id || `obj-${index}`,
      organizationId,
      title: objective.name || `Objective ${index + 1}`,
      description: objective.name,
      owner: undefined,
      teamId,
      status: 'active',
      krIds,
    };
  });
}

// Create quarters based on the period
export function adaptQuarters(period: BackendState['period']): Quarter[] {
  if (!period.startISO || !period.endISO) {
    // Default quarters
    return [
      {
        id: 'q4-2024',
        name: 'Q4 2024',
        startDate: '2024-10-01',
        endDate: '2024-12-31',
        year: 2024
      },
      {
        id: 'q1-2025',
        name: 'Q1 2025',
        startDate: '2025-01-01',
        endDate: '2025-03-31',
        year: 2025
      }
    ];
  }

  // Generate quarter from period dates
  const start = new Date(period.startISO);
  const quarter = Math.floor(start.getMonth() / 3) + 1;
  const year = start.getFullYear();

  return [{
    id: `q${quarter}-${year}`,
    name: `Q${quarter} ${year}`,
    startDate: period.startISO,
    endDate: period.endISO,
    year: year
  }];
}

// Map backend KRs to frontend format
export function adaptKRs(
  backendKRs: BackendState['krs'],
  planDraft: BackendState['planDraft'],
  actuals: BackendState['actuals'],
  individuals: BackendState['individuals'],
  objectives: BackendState['objectives'],
  quarters: Quarter[],
  organization: BackendState['organization'] | null,
): KR[] {
  const organizationId = organization?.id || 'org-backend';
  return backendKRs.map(kr => {
    // Extract baseline and target from KR name if present
    let baseline = '0';
    let target = '100';
    const match = kr.name.match(/:\s*([\d.]+)\s*→\s*([\d.]+)/);
    if (match) {
      baseline = match[1];
      target = match[2];
    }

    // Calculate current value from actuals
    const krActuals = actuals[kr.id] || {};
    const actualValues = Object.values(krActuals).filter(v => v != null) as number[];
    const current = actualValues.length > 0 ? actualValues[actualValues.length - 1] : parseFloat(baseline);

    // Calculate progress
    const progress = calculateProgress(parseFloat(baseline), current, parseFloat(target));

    // Find owner name
    const owner = individuals.find(ind => ind.id === kr.driId);

    // Determine status based on progress
    const status = progress >= 90 ? 'completed' :
                  progress >= 70 ? 'on-track' :
                  progress >= 50 ? 'at-risk' :
                  progress > 0 ? 'off-track' : 'not-started';

    return {
      id: kr.id,
      organizationId,
      title: kr.name.replace(/:\s*[\d.]+\s*→\s*[\d.]+.*$/, ''), // Remove target from title
      description: `Key result for ${objectives.find(o => o.id === kr.objectiveId)?.name || 'objective'}`,
      objectiveId: kr.objectiveId,
      teamId: kr.teamId || 'team-1',
      podId: kr.podId,
      owner: owner?.name || 'Unassigned',
      quarterId: quarters[0]?.id || 'q4-2024',

      target: target,
      unit: mapUnit(kr.unit),
      baseline: baseline,

      current: current.toString(),
      progress: progress,
      forecast: (current + (parseFloat(target) - current) * 0.3).toString(), // Simple forecast

      status: status as any,
      deadline: quarters[0]?.endDate || '2024-12-31',

      sqlQuery: '',
      autoUpdateEnabled: false,
      lastUpdated: new Date().toISOString(),

      weeklyActuals: [],
      comments: [],
      linkedInitiativeIds: []
    };
  });
}

function mapUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'percent': '%',
    'currency': '$',
    'count': 'count',
    'ms': 'ms',
    'hours': 'hours',
    'seconds': 'seconds'
  };
  return unitMap[unit] || unit;
}

function calculateProgress(baseline: number, current: number, target: number): number {
  if (target === baseline) return 100;
  const progress = ((current - baseline) / (target - baseline)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

// Map backend initiatives to frontend format
export function adaptInitiatives(
  backendInitiatives: BackendState['initiatives'],
  backendKRs: BackendState['krs'],
  individuals: BackendState['individuals']
): Initiative[] {
  return backendInitiatives.map(init => {
    const kr = backendKRs.find(k => k.id === init.krId);
    const owner = individuals.find(ind => ind.id === kr?.driId);

    // Map status
    const statusMap: Record<string, string> = {
      'on_track': 'in-progress',
      'at_risk': 'at-risk',
      'needs_support': 'planning',
      'complete': 'completed'
    };

    const status = statusMap[init.status || 'on_track'] || 'in-progress';
    const progress = status === 'completed' ? 100 :
                    status === 'in-progress' ? 50 :
                    status === 'at-risk' ? 30 : 10;

    // Determine priority based on impact and confidence
    const score = Math.abs(init.impact) * init.confidence;
    const priority = score > 0.5 ? 'high' : score > 0.3 ? 'medium' : 'low';

    return {
      id: init.id,
      title: init.name,
      description: `Initiative to support ${kr?.name || 'KR'}`,
      teamId: kr?.teamId || 'team-1',
      podId: kr?.podId,
      owner: owner?.name || 'Unassigned',
      contributors: [],
      priority: priority as any,
      status: status as any,
      deadline: '2024-12-31',
      progress: progress,
      milestones: [],
      linkedKRIds: [init.krId],
      tags: init.isPlaceholder ? ['Placeholder'] : [],
      budget: undefined,
      resources: []
    };
  });
}

// Main adapter function to transform backend state to frontend format
export function adaptBackendToFrontend(backendState: BackendState) {
  const organizations = adaptOrganizations(backendState.organization);
  const teams = adaptTeams(backendState.teams, backendState.organization);
  const pods = adaptPods(backendState.pods, backendState.individuals);
  const functions = adaptFunctions(backendState.functions);
  const people = adaptPeople(backendState.individuals);
  const quarters = adaptQuarters(backendState.period);
  const krs = adaptKRs(
    backendState.krs,
    backendState.planDraft,
    backendState.actuals,
    backendState.individuals,
    backendState.objectives,
    quarters,
    backendState.organization,
  );
  const objectives = adaptObjectives(
    backendState.objectives,
    backendState.organization,
    backendState.objectiveTeams,
    backendState.krs
  );
  const initiatives = adaptInitiatives(
    backendState.initiatives,
    backendState.krs,
    backendState.individuals
  );

  return {
    organizations,
    teams,
    pods,
    people,
    functions,
    quarters,
    objectives,
    krs,
    initiatives,
    mode: backendState.phase === 'planning' ? 'plan' as const : 'execution' as const
  };
}
