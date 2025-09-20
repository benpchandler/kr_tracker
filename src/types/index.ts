// Core organizational types
export interface Organization {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  headquarters?: string;
}

export interface Team {
  id: string;
  organizationId?: string;
  name: string;
  description?: string;
  color: string;
}

// Function directory entries used across the organization manager
export interface OrgFunction {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
}

export type FunctionType = OrgFunction['id'];

// Person entity for organization management
export interface Person {
  id: string;
  name: string;
  email: string;
  functionId: FunctionType;
  managerId?: string; // Reference to another person
  teamId: string;
  podId?: string;
  joinDate: string;
  active: boolean;
}

// Pod member with role information
export interface PodMember {
  name: string;
  role: FunctionType;
}

export interface Pod {
  id: string;
  name: string;
  teamId: string;
  description?: string;
  members: string[] | PodMember[]; // Support both legacy and new format
}

// Time period management
export interface Quarter {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  year: number;
}

// Weekly actuals tracking
export interface WeeklyActual {
  id: string;
  krId: string;
  weekOf: string; // ISO date string for start of week
  actual: string;
  variance: number; // vs plan for that week
  forecastVariance: number; // vs forecast for that week
  notes?: string;
  enteredBy: string;
  enteredAt: string;
}

// Enhanced KR with planning and execution data
export interface Objective {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  owner?: string;
  teamId?: string;
  podId?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed';
  krIds: string[];
}

export interface KR {
  id: string;
  title: string;
  description: string;
  
  // Organizational
  organizationId?: string;
  teamId: string;
  teamIds?: string[]; // Support for multi-team KRs
  podId?: string;
  owner: string;
  objectiveId?: string;
  quarterId: string;
  
  // Planning data
  target: string;
  unit: string;
  baseline: string;
  
  // Execution data
  current: string;
  progress: number;
  forecast?: string;
  
  // Weekly tracking
  weeklyActuals: WeeklyActual[];
  
  // Status and metadata
  status: 'not-started' | 'on-track' | 'at-risk' | 'off-track' | 'completed';
  deadline: string;
  
  // Advanced features
  sqlQuery?: string;
  autoUpdateEnabled: boolean;
  lastUpdated: string;
  
  // Comments and notes
  comments: KRComment[];
  
  // Linked initiatives
  linkedInitiativeIds: string[];
}

export interface KRComment {
  id: string;
  krId: string;
  author: string;
  content: string;
  type: 'general' | 'above-plan' | 'below-plan' | 'forecast-update';
  timestamp: string;
}

// Enhanced Initiative
export interface Initiative {
  id: string;
  title: string;
  description: string;
  
  // Organizational
  teamId: string;
  podId?: string;
  owner: string;
  contributors: string[];
  
  // Planning
  priority: 'high' | 'medium' | 'low';
  status: 'planning' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
  deadline: string;
  
  // Progress tracking
  progress: number;
  milestones: Milestone[];
  
  // Relationships
  linkedKRIds: string[];
  
  // Metadata
  tags: string[];
  budget?: number;
  resources?: string[];
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  completedDate?: string;
}

// Application modes
export type AppMode = 'plan' | 'execution';

// View types for different interfaces
export type ViewType = 'cards' | 'table' | 'spreadsheet';

// Filter types for advanced filtering
export interface FilterOptions {
  team?: string;
  pod?: string;
  quarter?: string;
  owner?: string;
  status?: string;
  priority?: string;
  kr?: string;
  initiative?: string;
}

export type FilterType = keyof FilterOptions;

// Aggregation types for metrics calculation
export type AggregationType = 'cumulative' | 'snapshot' | 'average';

// Health status thresholds
export interface HealthThresholds {
  green: number;  // >= this percentage
  yellow: number; // >= this percentage but < green
  // red is anything < yellow
}

// Weekly plan/actual tracking
export interface WeekData {
  weekISO: string; // Format: 'YYYY-Www' e.g., '2024-W42'
  plan?: number;
  actual?: number;
  forecast?: number;
}

// Extended KR with aggregation and weekly data
export interface ExtendedKR extends KR {
  aggregationType?: AggregationType;
  weeklyData?: WeekData[];
}

// Waterfall analysis state
export interface WaterfallSegment {
  label: string;
  value: number;
  type: 'increase' | 'decrease' | 'total';
}

export interface WaterfallScenario {
  id: string;
  name: string;
  segments: WaterfallSegment[];
  startValue: number;
  endValue: number;
}

export interface WaterfallState {
  scenarios: WaterfallScenario[];
  selectedScenarioId?: string;
}
