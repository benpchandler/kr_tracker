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
import { OrganizationManager } from "./components/OrganizationManagerFixed";
import { KRSpreadsheetView } from "./components/KRSpreadsheetView";
import { ActualsGrid } from "./components/ActualsGrid";
import { MetricsDisplay } from "./components/MetricsDisplay";
import { BaselineManager } from "./components/BaselineManager";
import { DeleteConfirmationDialog } from "./components/DeleteConfirmationDialog";
import { AnalysisPanel } from "./components/analysis/AnalysisPanel";
import { ViewAllModal } from "./components/ViewAllModal";
import { Target, Lightbulb, TrendingUp, Users, Building2, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { AppMode, Team, Pod, Quarter, KR, Initiative, KRComment, WeeklyActual, ViewType, FilterOptions, Person, OrgFunction, Organization, Objective } from "./types";
import { applyDeletionPlan, computeDeletionPlan, teamBelongsToOrganization, type DeletePlan, type DeleteType, type DeletionContext, type DeletionState } from "./services/deletionService";
import { mockTeams, mockPods, mockQuarters, mockKRs, mockInitiatives, mockPeople, mockFunctions, mockOrganizations, mockObjectives } from "./data/mockData";
import { adaptBackendToFrontend } from "./utils/dataAdapter";
import { enforceUniqueTeamData } from "./utils/teamNormalization";
import { AppProvider, useAppState, useFilteredKRs, useFilteredInitiatives, useBaseline } from "./state/store";
import { computeMetrics, generateWeeks } from "./metrics/engine";
import {
  cloneOrgFunctions,
  loadPersistedState,
  persistState,
  reportHydrationDiagnostics,
  type PersistedAppState,
} from "./state/hydration";

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

const isValidObjectiveStatus = (status: Objective['status']): status is NonNullable<Objective['status']> => {
  return status === 'draft' || status === 'active' || status === 'paused' || status === 'completed';
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
  const [removingCards, setRemovingCards] = useState<Set<string>>(new Set());
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>({});
  const [currentTab, setCurrentTab] = useState<'krs' | 'initiatives'>('krs');

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const shouldUseBackend = import.meta.env.VITE_USE_BACKEND === 'true';
  const [backendHealth, setBackendHealth] = useState<'unknown' | 'ok' | 'down'>('unknown');

  // View All Modal state
  const [viewAllModalOpen, setViewAllModalOpen] = useState(false);
  const [viewAllModalType, setViewAllModalType] = useState<'objectives' | 'krs' | 'initiatives'>('objectives');

  const hasHydratedRef = useRef(false);

  const buildDeletionContext = useCallback((): DeletionContext => ({
    organizations,
    teams,
    pods,
    people,
    functions,
    objectives,
    krs,
    initiatives,
  }), [organizations, teams, pods, people, functions, objectives, krs, initiatives]);

  const handleViewAll = useCallback((type: 'objectives' | 'krs' | 'initiatives') => {
    setViewAllModalType(type);
    setViewAllModalOpen(true);
  }, []);

  const handleRequestDelete = useCallback((type: DeleteType, targetId: string) => {
    const planDeletion = () => {
      const context = buildDeletionContext();
      const plan = computeDeletionPlan(type, targetId, context);
      if (plan) {
        setPendingDeletePlan(plan);
      }
    };

    if (type === 'kr' || type === 'initiative') {
      setRemovingCards(prev => new Set(prev).add(targetId));

      // Wait for animation to complete before actually deleting
      setTimeout(() => {
        planDeletion();

        // Clean up animation state
        setRemovingCards(prev => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      }, 300); // Match CSS animation duration
    } else {
      // For non-card deletions, proceed immediately
      planDeletion();
    }
  }, [buildDeletionContext]);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeletePlan) return;

    const context = buildDeletionContext();
    const freshPlan = computeDeletionPlan(pendingDeletePlan.type, pendingDeletePlan.id, context);

    if (freshPlan) {
      const deletionState: DeletionState = {
        ...context,
        selectedTeam,
      };
      const result = applyDeletionPlan(freshPlan, deletionState);
      setOrganizations(result.organizations);
      setFunctions(result.functions);
      setTeams(result.teams);
      setPods(result.pods);
      setPeople(result.people);
      setObjectives(result.objectives);
      setKRs(result.krs);
      setInitiatives(result.initiatives);
      setSelectedTeam(result.selectedTeam);
    }

    setPendingDeletePlan(null);
  }, [pendingDeletePlan, buildDeletionContext, selectedTeam]);

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
    setFunctions(cloneOrgFunctions(mockFunctions));
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
            : cloneOrgFunctions(mockFunctions));
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
        applyPersistedState(persisted.state);
        reportHydrationDiagnostics(persisted.diagnostics);
        setIsLoading(false);
        return;
      } else {
        reportHydrationDiagnostics({ warnings: [], counts: {} });
      }

      await fetchData();
    };

    init();

    // Background health check (non-blocking)
    (async () => {
      if (!shouldUseBackend) {
        setBackendHealth('down');
        return;
      }
      try {
        const res = await fetch('/api/health', { method: 'GET' });
        setBackendHealth(res.ok ? 'ok' : 'down');
      } catch {
        setBackendHealth('down');
      }
    })();

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
      {/* Environment banner: show when running without backend */}
      {!shouldUseBackend && (
        <div className="w-full sticky top-0 z-50 text-center font-bold py-2" style={{ background: '#B00020', color: 'white' }} role="status" aria-live="polite">
          Warning: Running with local/mock data — backend is disabled (VITE_USE_BACKEND=false)
        </div>
      )}

      {/* Backend health indicator when backend is enabled */}
      {shouldUseBackend && (
        <div className="w-full sticky top-0 z-50 flex justify-center pointer-events-none">
          <div
            className="mt-2 px-3 py-1 rounded-full text-xs font-semibold shadow"
            style={{
              background: backendHealth === 'ok' ? '#0F9D58' : '#F4B400',
              color: 'white',
            }}
            aria-live="polite"
          >
            Backend: {backendHealth === 'ok' ? 'Connected' : 'Checking...'}
          </div>
        </div>
      )}
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
                          <Button onClick={() => {
                            // TODO: Implement Add Objective dialog
                            // TODO: Implement Add Objective dialog
                          }} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Objective
                          </Button>
                        </div>

                        {objectiveSummaries.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Objective Directory:</p>
                            <div className="space-y-2">
                              {objectiveSummaries.slice(0, 3).map(({ objective, krCount, initiativeCount }) => (
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
                            {objectiveSummaries.length > 3 && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-xs"
                                onClick={() => handleViewAll('objectives')}
                              >
                                View all {objectiveSummaries.length} objectives →
                              </Button>
                            )}
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
                            {krs.length > 3 && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-xs"
                                onClick={() => handleViewAll('krs')}
                              >
                                View all {krs.length} KRs →
                              </Button>
                            )}
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
                            {initiatives.length > 3 && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-xs"
                                onClick={() => handleViewAll('initiatives')}
                              >
                                View all {initiatives.length} initiatives →
                              </Button>
                            )}
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

                <div className="kr-cards-grid">
                  {filteredKRs.map((kr) => (
                    <div
                      key={kr.id}
                      className={`kr-card-item ${removingCards.has(kr.id) ? 'removing' : ''}`}
                    >
                      <KRCard
                        {...kr}
                        team={getTeamName(kr.teamId)}
                        onUpdate={handleUpdateKR}
                        onDelete={(krId) => handleRequestDelete('kr', krId)}
                      />
                    </div>
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

            <div className="kr-cards-grid">
              {filteredInitiatives.map((initiative) => (
                <div
                  key={initiative.id}
                  className={`kr-card-item ${removingCards.has(initiative.id) ? 'removing' : ''}`}
                >
                  <InitiativeCard
                    {...initiative}
                    team={getTeamName(initiative.teamId)}
                    onDelete={(initiativeId) => handleRequestDelete('initiative', initiativeId)}
                  />
                </div>
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
        
        {/* Analysis Mode Content */}
        {mode === 'analysis' && (
          <AnalysisPanel />
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

      {/* View All Modal */}
      <ViewAllModal
        open={viewAllModalOpen}
        onOpenChange={setViewAllModalOpen}
        type={viewAllModalType}
        items={
          viewAllModalType === 'objectives'
            ? objectiveSummaries.map(({ objective, krCount, initiativeCount }) => ({
                ...objective,
                krCount,
                initiativeCount
              }))
            : viewAllModalType === 'krs'
            ? krs
            : initiatives
        }
        onDelete={(id) => handleRequestDelete(
          viewAllModalType === 'objectives' ? 'objective' : viewAllModalType === 'krs' ? 'kr' : 'initiative',
          id
        )}
        onAdd={
          viewAllModalType === 'objectives'
            ? () => {
                // TODO: Implement Add Objective from modal
                setViewAllModalOpen(false);
              }
            : viewAllModalType === 'krs'
            ? () => {
                setShowAddKRDialog(true);
                setViewAllModalOpen(false);
              }
            : () => {
                setShowAddInitiativeDialog(true);
                setViewAllModalOpen(false);
              }
        }
        getTeamName={getTeamName}
      />

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
