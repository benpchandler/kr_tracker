import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  Team, Pod, Person, OrgFunction, Quarter, KR, Initiative, AppMode, FilterOptions, Organization, Objective
} from '../types';

// Extended types for execution mode
export interface PlanBaseline {
  id: string;
  version: number;
  lockedAt: string;
  lockedBy: string;
  data: Record<string, Record<string, number>>; // krId -> weekISO -> value
}

export interface ActualData {
  [krId: string]: {
    [weekISO: string]: number;
  };
}

export interface KrWeekMetrics {
  krId: string;
  weekISO: string;
  plan: number;
  actual: number;
  deltaWoW: number;
  deltaWoWPct: number;
  rolling3: number;
  paceToDatePct: number;
  forecastEOP: number;
  health: 'green' | 'yellow' | 'red';
  varianceWeekly: number;
}

export interface AppState {
  // Organization data
  organizations: Organization[];
  teams: Team[];
  pods: Pod[];
  people: Person[];
  functions: OrgFunction[];
  quarters: Quarter[];

  // KRs and Initiatives
  objectives: Objective[];
  krs: KR[];
  initiatives: Initiative[];

  // Execution mode data
  planBaselines: PlanBaseline[];
  currentBaselineId: string | null;
  actuals: ActualData;
  metrics: KrWeekMetrics[];

  // UI state
  mode: AppMode;
  selectedTeam: string;
  selectedQuarter: string;
  advancedFilters: FilterOptions;
  currentTab: 'krs' | 'initiatives';
  viewType: 'cards' | 'table' | 'spreadsheet';
  isObjectivesCollapsed: boolean;

  // Period management
  currentPeriod: {
    startISO: string;
    endISO: string;
  } | null;
}

type AppAction =
  | { type: 'SET_STATE'; payload: Partial<AppState> }
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'SET_ORGANIZATIONS'; payload: Organization[] }
  | { type: 'SET_TEAMS'; payload: Team[] }
  | { type: 'SET_PODS'; payload: Pod[] }
  | { type: 'SET_PEOPLE'; payload: Person[] }
  | { type: 'SET_FUNCTIONS'; payload: OrgFunction[] }
  | { type: 'SET_QUARTERS'; payload: Quarter[] }
  | { type: 'SET_OBJECTIVES'; payload: Objective[] }
  | { type: 'SET_KRS'; payload: KR[] }
  | { type: 'SET_INITIATIVES'; payload: Initiative[] }
  | { type: 'UPDATE_KR'; id: string; updates: Partial<KR> }
  | { type: 'UPDATE_INITIATIVE'; id: string; updates: Partial<Initiative> }
  | { type: 'ADD_KR'; payload: KR }
  | { type: 'ADD_INITIATIVE'; payload: Initiative }
  | { type: 'DELETE_KR'; id: string }
  | { type: 'DELETE_INITIATIVE'; id: string }
  | { type: 'LOCK_PLAN'; baseline: PlanBaseline }
  | { type: 'UNLOCK_PLAN' }
  | { type: 'SET_CURRENT_BASELINE_ID'; id: string | null }
  | { type: 'BULK_UPDATE_ACTUALS'; updates: ActualData }
  | { type: 'UPDATE_ACTUAL'; krId: string; weekISO: string; value: number }
  | { type: 'SET_METRICS'; payload: KrWeekMetrics[] }
  | { type: 'SET_PERIOD'; payload: { startISO: string; endISO: string } }
  | { type: 'SET_FILTER'; filter: keyof FilterOptions; value: string }
  | { type: 'SET_FILTERS'; payload: FilterOptions }
  | { type: 'SET_SELECTED_TEAM'; payload: string }
  | { type: 'SET_SELECTED_QUARTER'; payload: string }
  | { type: 'SET_VIEW_TYPE'; payload: 'cards' | 'table' | 'spreadsheet' }
  | { type: 'SET_CURRENT_TAB'; payload: 'krs' | 'initiatives' }
  | { type: 'SET_OBJECTIVES_COLLAPSED'; payload: boolean }
  | { type: 'RESET_STATE' };

const initialState: AppState = {
  organizations: [],
  teams: [],
  pods: [],
  people: [],
  functions: [],
  quarters: [],
  objectives: [],
  krs: [],
  initiatives: [],
  planBaselines: [],
  currentBaselineId: null,
  actuals: {},
  metrics: [],
  mode: 'plan',
  selectedTeam: 'all',
  selectedQuarter: 'q4-2024',
  advancedFilters: {},
  currentTab: 'krs',
  viewType: 'cards',
  isObjectivesCollapsed: true,
  currentPeriod: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };

    case 'SET_MODE':
      return { ...state, mode: action.payload };

    case 'SET_ORGANIZATIONS':
      return { ...state, organizations: action.payload };

    case 'SET_TEAMS':
      return { ...state, teams: action.payload };

    case 'SET_PODS':
      return { ...state, pods: action.payload };

    case 'SET_PEOPLE':
      return { ...state, people: action.payload };

    case 'SET_FUNCTIONS':
      return { ...state, functions: action.payload };

    case 'SET_QUARTERS':
      return { ...state, quarters: action.payload };

    case 'SET_OBJECTIVES':
      return { ...state, objectives: action.payload };

    case 'SET_KRS':
      return { ...state, krs: action.payload };

    case 'SET_INITIATIVES':
      return { ...state, initiatives: action.payload };

    case 'UPDATE_KR':
      return {
        ...state,
        krs: state.krs.map(kr =>
          kr.id === action.id
            ? { ...kr, ...action.updates, lastUpdated: new Date().toISOString() }
            : kr
        ),
      };

    case 'UPDATE_INITIATIVE':
      return {
        ...state,
        initiatives: state.initiatives.map(init =>
          init.id === action.id
            ? { ...init, ...action.updates }
            : init
        ),
      };

    case 'ADD_KR':
      return { ...state, krs: [...state.krs, action.payload] };

    case 'ADD_INITIATIVE':
      return { ...state, initiatives: [...state.initiatives, action.payload] };

    case 'DELETE_KR':
      return { ...state, krs: state.krs.filter(kr => kr.id !== action.id) };

    case 'DELETE_INITIATIVE':
      return {
        ...state,
        initiatives: state.initiatives.filter(init => init.id !== action.id)
      };

    case 'LOCK_PLAN':
      return {
        ...state,
        planBaselines: [...state.planBaselines, action.baseline],
        currentBaselineId: action.baseline.id,
      };

    case 'UNLOCK_PLAN':
      return {
        ...state,
        currentBaselineId: null,
      };

    case 'SET_CURRENT_BASELINE_ID':
      return { ...state, currentBaselineId: action.id };

    case 'BULK_UPDATE_ACTUALS':
      return { ...state, actuals: { ...state.actuals, ...action.updates } };

    case 'UPDATE_ACTUAL':
      return {
        ...state,
        actuals: {
          ...state.actuals,
          [action.krId]: {
            ...state.actuals[action.krId],
            [action.weekISO]: action.value,
          },
        },
      };

    case 'SET_METRICS':
      return { ...state, metrics: action.payload };

    case 'SET_PERIOD':
      return { ...state, currentPeriod: action.payload };

    case 'SET_FILTER':
      return {
        ...state,
        advancedFilters: {
          ...state.advancedFilters,
          [action.filter]: action.value,
        },
      };

    case 'SET_FILTERS':
      return { ...state, advancedFilters: action.payload };

    case 'SET_SELECTED_TEAM':
      return { ...state, selectedTeam: action.payload };

    case 'SET_SELECTED_QUARTER':
      return { ...state, selectedQuarter: action.payload };

    case 'SET_VIEW_TYPE':
      return { ...state, viewType: action.payload };

    case 'SET_CURRENT_TAB':
      return { ...state, currentTab: action.payload };

    case 'SET_OBJECTIVES_COLLAPSED':
      return { ...state, isObjectivesCollapsed: action.payload };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

// Provider component
interface AppProviderProps {
  children: ReactNode;
  initialData?: Partial<AppState>;
}

const LOCAL_STORAGE_KEY = 'kr-tracker-state-v4';

export function AppProvider({ children, initialData }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    ...initialData,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          dispatch({ type: 'SET_STATE', payload: parsed });
        }
      } catch (error) {
        console.error('Failed to load persisted state:', error);
      }
    };

    loadPersistedState();
  }, []);

  // Persist to localStorage on state changes
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the app state
export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}

// Selector hooks for common state access patterns
export function useFilteredKRs() {
  const { state } = useAppState();
  const { krs, selectedTeam, selectedQuarter, advancedFilters } = state;

  return krs.filter(kr => {
    const teamMatch = selectedTeam === 'all' || kr.teamId === selectedTeam;
    const quarterMatch = kr.quarterId === selectedQuarter;

    // Apply advanced filters if set
    const advancedTeamMatch = !advancedFilters.team ||
      advancedFilters.team === 'all' ||
      kr.teamId === advancedFilters.team;

    const statusMatch = !advancedFilters.status ||
      advancedFilters.status === 'all' ||
      kr.status === advancedFilters.status;

    const ownerMatch = !advancedFilters.owner ||
      advancedFilters.owner === 'all' ||
      kr.owner === advancedFilters.owner;

    return teamMatch && quarterMatch && advancedTeamMatch && statusMatch && ownerMatch;
  });
}

export function useFilteredInitiatives() {
  const { state } = useAppState();
  const { initiatives, selectedTeam, advancedFilters } = state;

  return initiatives.filter(init => {
    const teamMatch = selectedTeam === 'all' || init.teamId === selectedTeam;

    // Apply advanced filters if set
    const advancedTeamMatch = !advancedFilters.team ||
      advancedFilters.team === 'all' ||
      init.teamId === advancedFilters.team;

    const statusMatch = !advancedFilters.status ||
      advancedFilters.status === 'all' ||
      init.status === advancedFilters.status;

    const priorityMatch = !advancedFilters.priority ||
      advancedFilters.priority === 'all' ||
      init.priority === advancedFilters.priority;

    const ownerMatch = !advancedFilters.owner ||
      advancedFilters.owner === 'all' ||
      init.owner === advancedFilters.owner;

    return teamMatch && advancedTeamMatch && statusMatch && priorityMatch && ownerMatch;
  });
}

export function useBaseline() {
  const { state } = useAppState();
  const { planBaselines, currentBaselineId } = state;

  if (!currentBaselineId) return null;
  return planBaselines.find(b => b.id === currentBaselineId);
}

export function useIsBaselineLocked() {
  const { state } = useAppState();
  return state.currentBaselineId !== null;
}
