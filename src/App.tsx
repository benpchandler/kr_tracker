import { useState, useEffect, useRef } from "react";
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
import { Target, Lightbulb, TrendingUp, Users, Settings, Building2, ChevronDown, ChevronRight } from "lucide-react";
import { AppMode, Team, Pod, Quarter, KR, Initiative, KRComment, WeeklyActual, ViewType, FilterOptions, Person } from "./types";
import { mockTeams, mockPods, mockQuarters, mockKRs, mockInitiatives, mockPeople } from "./data/mockData";
import { adaptBackendToFrontend } from "./utils/dataAdapter";

const LOCAL_STORAGE_KEY = "kr-tracker-state-v3";

type PersistedAppState = {
  mode: AppMode;
  teams: Team[];
  pods: Pod[];
  people: Person[];
  quarters: Quarter[];
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

    return {
      mode: sanitizeMode(parsed.mode),
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
      pods: Array.isArray(parsed.pods) ? parsed.pods : [],
      people: Array.isArray(parsed.people) ? parsed.people : [],
      quarters: Array.isArray(parsed.quarters) ? parsed.quarters : [],
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
  return legacyKRs.map(kr => ({
    ...kr,
    teamId: mockTeams.find(t => t.name === kr.team)?.id || 'team-1',
    podId: undefined,
    quarterId: 'q4-2024',
    unit: kr.target.includes('ms') ? 'ms' : kr.target.includes('/5') ? '/5' : 'users',
    baseline: '0',
    forecast: kr.current,
    weeklyActuals: [],
    autoUpdateEnabled: false,
    lastUpdated: new Date().toISOString(),
    comments: [],
    linkedInitiativeIds: [],
    sqlQuery: ''
  }));
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

export default function App() {
  // App mode state
  const [mode, setMode] = useState<AppMode>('plan');

  // Organization data - Initialize with empty arrays, will be populated from backend
  const [teams, setTeams] = useState<Team[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  // UI state for collapsible sections
  const [isObjectivesCollapsed, setIsObjectivesCollapsed] = useState(true);

  // KRs and Initiatives with enhanced data - Initialize empty, will be populated from backend
  const [krs, setKRs] = useState<KR[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);

  // Filtering and view state
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedQuarter, setSelectedQuarter] = useState("q4-2024");
  const [viewType, setViewType] = useState<ViewType>('cards');
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>({});
  const [currentTab, setCurrentTab] = useState<'krs' | 'initiatives'>('krs');

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  const hasHydratedRef = useRef(false);

  const applyPersistedState = (persisted: PersistedAppState) => {
    setMode(persisted.mode);
    setTeams(persisted.teams);
    setPods(persisted.pods);
    setPeople(persisted.people);
    setQuarters(persisted.quarters);
    setKRs(persisted.krs);
    setInitiatives(persisted.initiatives);
    setSelectedTeam(persisted.ui.selectedTeam ?? "all");
    setSelectedQuarter(persisted.ui.selectedQuarter ?? "q4-2024");
    setViewType(persisted.ui.viewType);
    setAdvancedFilters(persisted.ui.advancedFilters || {});
    setCurrentTab(persisted.ui.currentTab);
    setIsObjectivesCollapsed(persisted.ui.isObjectivesCollapsed);
  };

  // Fetch data from backend or local storage on mount
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const response = await fetch('/api/state');
        if (response.ok) {
          const backendData = await response.json();
          const adaptedData = adaptBackendToFrontend(backendData);

          if (!isMounted) return;

          setTeams(adaptedData.teams);
          setPods(adaptedData.pods);
          setPeople(adaptedData.people);
          setQuarters(adaptedData.quarters);
          setKRs(adaptedData.krs);
          setInitiatives(adaptedData.initiatives);
          setMode(adaptedData.mode);
        } else if (isMounted) {
          // Fallback to mock data if backend is unavailable
          console.warn('Backend unavailable, using mock data');
          setTeams(mockTeams);
          setPods(mockPods);
          setPeople(mockPeople);
          setQuarters(mockQuarters);
          setKRs(mockKRs);
          setInitiatives(mockInitiatives);
        }
      } catch (error) {
        if (!isMounted) return;
        // Fallback to mock data on error
        console.error('Error fetching data:', error);
        setTeams(mockTeams);
        setPods(mockPods);
        setPeople(mockPeople);
        setQuarters(mockQuarters);
        setKRs(mockKRs);
        setInitiatives(mockInitiatives);
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

    const persistedState: PersistedAppState = {
      mode,
      teams,
      pods,
      people,
      quarters,
      krs,
      initiatives,
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
    teams,
    pods,
    people,
    quarters,
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
  
  // Get team names for legacy compatibility
  const getTeamName = (teamId: string) => {
    if (!teamId) return 'Unknown';
    return teams.find(t => t.id === teamId)?.name || 'Unknown';
  };
  
  // Filter data based on selections
  const filteredKRs = krs.filter(kr => {
    // Basic team filter
    const basicTeamMatch = selectedTeam === "all" || getTeamName(kr.teamId) === selectedTeam;
    const basicQuarterMatch = kr.quarterId === selectedQuarter;
    
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

  // Legacy team name array for components that expect it
  const teamNames = teams.map(t => t.name);
  
  const krCounts = teams.reduce((acc, team) => {
    acc[team.name] = krs.filter(kr => kr.teamId === team.id).length;
    return acc;
  }, {} as Record<string, number>);

  const initiativeCounts = teams.reduce((acc, team) => {
    acc[team.name] = initiatives.filter(init => init.teamId === team.id).length;
    return acc;
  }, {} as Record<string, number>);

  const handleAddKR = (newKR: any) => {
    // Convert team name to team ID
    const teamId = teams.find(t => t.name === newKR.team)?.id || teams[0]?.id || 'team-1';
    
    const enhancedKR = {
      ...newKR,
      teamId,
      quarterId: selectedQuarter,
      unit: 'count',
      baseline: '0',
      forecast: newKR.current,
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
    const teamId = teams.find(t => t.name === newInitiative.team)?.id || teams[0]?.id || 'team-1';
    
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

            {/* Collapsible Organization Manager */}
            <OrganizationManager
              teams={teams}
              pods={pods}
              people={people}
              onTeamsChange={setTeams}
              onPodsChange={setPods}
              onPeopleChange={setPeople}
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
                        <AddKRDialog onAddKR={handleAddKR} teams={teams} pods={pods} />
                        <AddInitiativeDialog onAddInitiative={handleAddInitiative} teams={teams} />
                      </div>
                    )}
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          <AddKRDialog onAddKR={handleAddKR} teams={teams} pods={pods} />
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
                          <AddInitiativeDialog onAddInitiative={handleAddInitiative} teams={teams} />
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
    </div>
  );
}
