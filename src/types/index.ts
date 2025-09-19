export type AppMode = 'plan' | 'execution';
export type ViewType = 'cards' | 'spreadsheet';

export interface Organization {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  leadId?: string;
  color?: string;
}

export interface Pod {
  id: string;
  teamId: string;
  name: string;
  memberIds: string[];
  mission?: string;
}

export interface Person {
  id: string;
  name: string;
  email?: string;
  role?: string;
  level?: string;
  managerId?: string;
  teamId?: string;
  podId?: string;
  active: boolean;
}

export interface Quarter {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface KR {
  id: string;
  title: string;
  description?: string;
  teamId: string;
  teamIds?: string[]; // For cross-team KRs
  podId?: string;
  quarterId: string;
  owner: string;
  status: 'on-track' | 'at-risk' | 'off-track' | 'completed' | 'not-started';
  target: string;
  current: string;
  baseline: string;
  forecast: string;
  unit: string;
  progress: number;
  autoUpdateEnabled: boolean;
  sqlQuery?: string;
  lastUpdated: string;
  comments: KRComment[];
  weeklyActuals: WeeklyActual[];
  linkedInitiativeIds: string[];
  driId?: string;
  goalStart?: number;
  goalEnd?: number;
  currentValue?: number;
}

export interface Initiative {
  id: string;
  title: string;
  description?: string;
  teamId: string;
  podId?: string;
  owner: string;
  status: 'planning' | 'in-progress' | 'at-risk' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  impact: number;
  confidence: number;
  progress: number;
  startDate?: string;
  endDate?: string;
  milestones: Milestone[];
  linkedKRIds: string[];
  budget?: number;
  resources: string[];
  isPlaceholder?: boolean;
}

export interface Milestone {
  id: string;
  initiativeId: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface KRComment {
  id: string;
  krId: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface WeeklyActual {
  id: string;
  krId: string;
  week: string;
  value: number;
  notes?: string;
}

export interface FilterOptions {
  team?: string;
  pod?: string;
  owner?: string;
  status?: string;
  priority?: string;
  kr?: string;
  initiative?: string;
  quarter?: string;
}