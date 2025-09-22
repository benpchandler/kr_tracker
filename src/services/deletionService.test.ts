import { describe, expect, it } from 'vitest';
import { applyDeletionPlan, computeDeletionPlan, type DeletionContext, type DeletionState } from './deletionService';
import type {
  Initiative,
  KR,
  Objective,
  Organization,
  OrgFunction,
  Person,
  Pod,
  Team,
} from '../types';

const createOrganization = (overrides: Partial<Organization>): Organization => ({
  id: 'org-default',
  name: 'Organization',
  ...overrides,
});

const createTeam = (overrides: Partial<Team>): Team => ({
  id: 'team-default',
  organizationId: 'org-1',
  name: 'Team Default',
  description: '',
  color: '#111111',
  ...overrides,
});

const createPod = (overrides: Partial<Pod>): Pod => ({
  id: 'pod-default',
  name: 'Pod Default',
  teamId: 'team-1',
  description: '',
  members: [],
  ...overrides,
});

const createFunction = (overrides: Partial<OrgFunction>): OrgFunction => ({
  id: 'function-default',
  name: 'Function Default',
  description: '',
  color: '#123456',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createPerson = (overrides: Partial<Person>): Person => ({
  id: 'person-default',
  name: 'Person Default',
  email: 'person@example.com',
  functionId: 'function-a',
  managerId: undefined,
  teamId: 'team-1',
  podId: undefined,
  joinDate: '2024-01-01',
  active: true,
  ...overrides,
});

const createObjective = (overrides: Partial<Objective>): Objective => ({
  id: 'obj-default',
  organizationId: 'org-1',
  title: 'Objective Default',
  description: '',
  owner: undefined,
  teamId: 'team-1',
  podId: undefined,
  status: 'active',
  krIds: [],
  ...overrides,
});

const createKR = (overrides: Partial<KR>): KR => ({
  id: 'kr-default',
  title: 'KR Default',
  description: '',
  organizationId: 'org-1',
  teamId: 'team-1',
  teamIds: [],
  podId: undefined,
  owner: 'Person Default',
  objectiveId: undefined,
  quarterId: 'q1-2024',
  target: '10',
  unit: 'count',
  baseline: '0',
  current: '0',
  progress: 0,
  forecast: undefined,
  weeklyActuals: [],
  status: 'not-started',
  deadline: '2024-12-31',
  comments: [],
  linkedInitiativeIds: [],
  autoUpdateEnabled: false,
  lastUpdated: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createInitiative = (overrides: Partial<Initiative>): Initiative => ({
  id: 'init-default',
  title: 'Initiative Default',
  description: '',
  teamId: 'team-1',
  podId: undefined,
  owner: 'Person Default',
  contributors: [],
  priority: 'high',
  status: 'in-progress',
  deadline: '2024-12-31',
  progress: 0,
  milestones: [],
  linkedKRIds: [],
  tags: [],
  ...overrides,
});

const createBaseContext = (): DeletionContext => {
  const organizations: Organization[] = [
    createOrganization({ id: 'org-1', name: 'Org One' }),
    createOrganization({ id: 'org-2', name: 'Org Two' }),
  ];

  const teams: Team[] = [
    createTeam({ id: 'team-1', organizationId: 'org-1', name: 'Team Alpha' }),
    createTeam({ id: 'team-2', organizationId: 'org-2', name: 'Team Beta' }),
  ];

  const pods: Pod[] = [
    createPod({ id: 'pod-1', name: 'Pod Alpha', teamId: 'team-1' }),
    createPod({ id: 'pod-2', name: 'Pod Beta', teamId: 'team-2' }),
  ];

  const functions: OrgFunction[] = [
    createFunction({ id: 'function-a', name: 'Alpha Function' }),
    createFunction({ id: 'function-b', name: 'Beta Function' }),
  ];

  const people: Person[] = [
    createPerson({ id: 'person-1', name: 'Alice', functionId: 'function-a', podId: 'pod-1' }),
    createPerson({ id: 'person-2', name: 'Bob', functionId: 'function-a', podId: 'pod-1', managerId: 'person-1' }),
    createPerson({ id: 'person-3', name: 'Carol', functionId: 'function-b', podId: 'pod-2', teamId: 'team-2', managerId: 'person-2' }),
  ];

  const objectives: Objective[] = [
    createObjective({ id: 'obj-1', organizationId: 'org-1', teamId: 'team-1', title: 'Increase Revenue', krIds: ['kr-1', 'kr-2'] }),
    createObjective({ id: 'obj-2', organizationId: 'org-2', teamId: 'team-2', title: 'Improve Retention', krIds: ['kr-3'] }),
  ];

  const krs: KR[] = [
    createKR({ id: 'kr-1', title: 'Grow ARR', organizationId: 'org-1', teamId: 'team-1', owner: 'Alice', objectiveId: 'obj-1', podId: 'pod-1', linkedInitiativeIds: ['init-1'] }),
    createKR({ id: 'kr-2', title: 'Reduce Churn', organizationId: 'org-1', teamId: 'team-1', owner: 'Bob', objectiveId: 'obj-1', podId: 'pod-1' }),
    createKR({ id: 'kr-3', title: 'Launch Beta', organizationId: 'org-2', teamId: 'team-2', owner: 'Bob', objectiveId: 'obj-2', podId: 'pod-2', linkedInitiativeIds: ['init-2'] }),
  ];

  const initiatives: Initiative[] = [
    createInitiative({ id: 'init-1', title: 'Enterprise Outreach', teamId: 'team-1', owner: 'Alice', contributors: ['Alice', 'Bob'], podId: 'pod-1', linkedKRIds: ['kr-1'] }),
    createInitiative({ id: 'init-2', title: 'Referral Program', teamId: 'team-2', owner: 'Carol', contributors: ['Bob'], podId: 'pod-2', linkedKRIds: ['kr-3'] }),
  ];

  return { organizations, teams, pods, people, functions, objectives, krs, initiatives };
};

const createDeletionState = (context: DeletionContext, selectedTeam = 'all'): DeletionState => ({
  ...context,
  selectedTeam,
});

describe('computeDeletionPlan', () => {
  it('cascades organization deletions across the hierarchy', () => {
    const context = createBaseContext();
    const plan = computeDeletionPlan('organization', 'org-1', context);

    expect(plan).not.toBeNull();
    expect(plan?.removals.organizations).toEqual(new Set(['org-1']));
    expect(plan?.removals.teams).toEqual(new Set(['team-1']));
    expect(plan?.removals.pods).toEqual(new Set(['pod-1']));
    expect(plan?.removals.people).toEqual(new Set(['person-1', 'person-2']));
    expect(plan?.removals.krs).toEqual(new Set(['kr-1', 'kr-2']));
    expect(plan?.removals.initiatives).toEqual(new Set(['init-1']));
    expect(plan?.updates.people?.get('person-3')).toEqual({ managerId: undefined });
    expect(plan?.updates.krs?.get('kr-3')?.owner).toBe('Unassigned');
  });

  it('removes dependent entities when deleting a team', () => {
    const context = createBaseContext();
    const plan = computeDeletionPlan('team', 'team-1', context);

    expect(plan).not.toBeNull();
    expect(plan?.removals.teams).toEqual(new Set(['team-1']));
    expect(plan?.removals.pods).toEqual(new Set(['pod-1']));
    expect(plan?.removals.people).toEqual(new Set(['person-1', 'person-2']));
    expect(plan?.removals.krs).toEqual(new Set(['kr-1', 'kr-2']));
    expect(plan?.updates.krs?.get('kr-3')?.owner).toBe('Unassigned');
  });

  it('clears pod references without removing related records', () => {
    const context = createBaseContext();
    const plan = computeDeletionPlan('pod', 'pod-1', context);

    expect(plan).not.toBeNull();
    expect(plan?.removals.pods).toEqual(new Set(['pod-1']));
    expect(plan?.updates.people?.get('person-1')).toEqual({ podId: undefined });
    expect(plan?.updates.krs?.get('kr-1')).toEqual({ podId: undefined });
    expect(plan?.updates.initiatives?.get('init-1')).toEqual({ podId: undefined });
  });

  it('detaches manager and ownership relationships when deleting a person', () => {
    const context = createBaseContext();
    const plan = computeDeletionPlan('person', 'person-2', context);

    expect(plan).not.toBeNull();
    expect(plan?.removals.people).toEqual(new Set(['person-2']));
    expect(plan?.updates.people?.get('person-3')).toEqual({ managerId: undefined });
    expect(plan?.updates.krs?.get('kr-2')?.owner).toBe('Unassigned');
    expect(plan?.updates.initiatives?.get('init-1')).toEqual({ contributors: ['Alice'] });
    expect(plan?.updates.initiatives?.get('init-2')?.contributors).toEqual([]);
  });

  it('reassigns people when deleting a function with a fallback', () => {
    const context = createBaseContext();
    const plan = computeDeletionPlan('function', 'function-a', context);

    expect(plan).not.toBeNull();
    expect(plan?.removals.functions).toEqual(new Set(['function-a']));
    expect(plan?.removals.people).toBeUndefined();
    expect(plan?.updates.people?.get('person-1')).toEqual({ functionId: 'function-b' });
    expect(plan?.updates.people?.get('person-2')).toEqual({ functionId: 'function-b' });
  });

  it('removes people when deleting the last function', () => {
    const context = createBaseContext();
    context.functions = [context.functions[0]];
    context.people = context.people.filter((person) => person.functionId === 'function-a');
    context.krs = context.krs.filter((kr) => kr.teamId === 'team-1');
    const plan = computeDeletionPlan('function', 'function-a', context);

    expect(plan).not.toBeNull();
    expect(plan?.removals.functions).toEqual(new Set(['function-a']));
    expect(plan?.removals.people).toEqual(new Set(['person-1', 'person-2']));
    expect(plan?.updates.people?.size).toBe(0);
  });

  it('removes key results and initiatives for objectives', () => {
    const context = createBaseContext();
    const plan = computeDeletionPlan('objective', 'obj-1', context);

    expect(plan).not.toBeNull();
    expect(plan?.removals.objectives).toEqual(new Set(['obj-1']));
    expect(plan?.removals.krs).toEqual(new Set(['kr-1', 'kr-2']));
    expect(plan?.removals.initiatives).toEqual(new Set(['init-1']));
  });

  it('removes initiatives that depend on a key result', () => {
    const context = createBaseContext();
    const plan = computeDeletionPlan('kr', 'kr-1', context);

    expect(plan).not.toBeNull();
    expect(plan?.removals.krs).toEqual(new Set(['kr-1']));
    expect(plan?.removals.initiatives).toEqual(new Set(['init-1']));
  });

  it('removes only the initiative entity', () => {
    const context = createBaseContext();
    const plan = computeDeletionPlan('initiative', 'init-1', context);

    expect(plan).not.toBeNull();
    expect(plan?.removals.initiatives).toEqual(new Set(['init-1']));
    expect(plan?.removals.krs).toBeUndefined();
  });
});

describe('applyDeletionPlan', () => {
  it('updates state immutably and resets selected team after team deletion', () => {
    const baseContext = createBaseContext();
    const plan = computeDeletionPlan('team', 'team-1', baseContext);
    expect(plan).not.toBeNull();

    const state: DeletionState = createDeletionState(baseContext, 'Team Alpha');
    const result = applyDeletionPlan(plan!, state);

    expect(result.selectedTeam).toBe('all');
    expect(result.teams.map(team => team.id)).toEqual(['team-2']);
    expect(result.people.map(person => person.id)).toEqual(['person-3']);
    expect(result.pods.map(pod => pod.id)).toEqual(['pod-2']);
    expect(result.krs.map(kr => kr.id)).toEqual(['kr-3']);
    expect(result.initiatives.map(initiative => initiative.id)).toEqual(['init-2']);
  });

  it('applies relationship updates when deleting a person', () => {
    const baseContext = createBaseContext();
    const plan = computeDeletionPlan('person', 'person-2', baseContext);
    expect(plan).not.toBeNull();

    const state: DeletionState = createDeletionState(baseContext, 'Team Alpha');
    const result = applyDeletionPlan(plan!, state);

    expect(result.people.map(person => person.id)).toEqual(['person-1', 'person-3']);
    const updatedKr = result.krs.find(kr => kr.id === 'kr-2');
    expect(updatedKr?.owner).toBe('Unassigned');
    const updatedInitiative = result.initiatives.find(initiative => initiative.id === 'init-1');
    expect(updatedInitiative?.contributors).toEqual(['Alice']);
    expect(result.people.find(person => person.id === 'person-3')?.managerId).toBeUndefined();
  });

  it('removes linked references when deleting a key result', () => {
    const baseContext = createBaseContext();
    const plan = computeDeletionPlan('kr', 'kr-1', baseContext);
    expect(plan).not.toBeNull();

    const state: DeletionState = createDeletionState(baseContext, 'Team Alpha');
    const result = applyDeletionPlan(plan!, state);

    expect(result.krs.map(kr => kr.id)).toEqual(['kr-2', 'kr-3']);
    expect(result.objectives.find(objective => objective.id === 'obj-1')?.krIds).toEqual(['kr-2']);
    expect(result.initiatives.find(initiative => initiative.id === 'init-1')).toBeUndefined();
  });
});
