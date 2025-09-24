import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Team, Pod, PodMember, Person, FunctionType, OrgFunction } from "../types";
import { checkDuplicate, findSimilarFunctions, findSimilarPeople, findSimilarPods, findSimilarTeams, normalizeEmail } from "../utils/entityValidation";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Plus, Users, Building2, X, ChevronDown, ChevronRight, User, Puzzle, Eye } from "lucide-react";
import { AllEntitiesView } from "./AllEntitiesView";
import { AutocompleteInput, type AutocompleteSuggestion, type AutocompleteValidationState } from "./AutocompleteInput";

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export type OrganizationManagerFocus = {
  entityType: "functions" | "teams" | "pods" | "people";
  showDirectory?: boolean;
};

interface OrganizationManagerProps {
  teams: Team[];
  pods: Pod[];
  people: Person[];
  functions: OrgFunction[];
  onTeamsChange: (teams: Team[]) => void;
  onPodsChange: (pods: Pod[]) => void;
  onPeopleChange: (people: Person[]) => void;
  onFunctionsChange: (functions: OrgFunction[]) => void;
  onRequestDeleteTeam?: (teamId: string) => void;
  onRequestDeletePod?: (podId: string) => void;
  onRequestDeletePerson?: (personId: string) => void;
  onRequestDeleteFunction?: (functionId: string) => void;
  externalFocus?: OrganizationManagerFocus | null;
  onExternalFocusHandled?: () => void;
}

export function OrganizationManager({
  teams,
  pods,
  people,
  functions,
  onTeamsChange,
  onPodsChange,
  onPeopleChange,
  onFunctionsChange,
  onRequestDeleteTeam,
  onRequestDeletePod,
  onRequestDeletePerson,
  onRequestDeleteFunction,
  externalFocus,
  onExternalFocusHandled,
}: OrganizationManagerProps) {
  const initialFunctionId = functions[0]?.id ?? '';
  const initialFunctionColor = functions[0]?.color ?? '#3B82F6';

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isAddingPod, setIsAddingPod] = useState(false);
  const [isAddingFunction, setIsAddingFunction] = useState(false);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [showAllEntities, setShowAllEntities] = useState(false);
  const [directoryEntityType, setDirectoryEntityType] = useState<"functions" | "teams" | "pods" | "people">("functions");
  const [newTeam, setNewTeam] = useState({ name: '', description: '', color: '#3B82F6' });
  const [teamError, setTeamError] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [newPod, setNewPod] = useState({ name: '', teamId: '', description: '', members: [] as PodMember[] });
  const [editingPodId, setEditingPodId] = useState<string | null>(null);
  const [newFunction, setNewFunction] = useState({ name: '', description: '', color: initialFunctionColor });
  const [functionErrors, setFunctionErrors] = useState<{ name?: string; color?: string; description?: string }>({});
  const [editingFunctionId, setEditingFunctionId] = useState<string | null>(null);
  const [newPerson, setNewPerson] = useState({ name: '', email: '', functionId: initialFunctionId as FunctionType, managerId: '', teamId: '', podId: '' });
  const [currentMember, setCurrentMember] = useState({ name: '', role: initialFunctionId as FunctionType });
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [teamValidation, setTeamValidation] = useState<AutocompleteValidationState<Team>>({
    isDuplicate: false,
    similarEntities: [],
  });
  const [podValidation, setPodValidation] = useState<AutocompleteValidationState<Pod>>({
    isDuplicate: false,
    similarEntities: [],
  });
  const [functionValidation, setFunctionValidation] = useState<AutocompleteValidationState<OrgFunction>>({
    isDuplicate: false,
    similarEntities: [],
  });
  const [personNameValidation, setPersonNameValidation] = useState<AutocompleteValidationState<Person>>({
    isDuplicate: false,
    similarEntities: [],
  });
  const [personEmailValidation, setPersonEmailValidation] = useState<AutocompleteValidationState<Person>>({
    isDuplicate: false,
    similarEntities: [],
  });
  const [managerSearch, setManagerSearch] = useState('');
  const [isCreatingQuickManager, setIsCreatingQuickManager] = useState(false);

  const COLOR_OPTIONS = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Yellow' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EF4444', label: 'Red' },
    { value: '#06B6D4', label: 'Cyan' },
    { value: '#84CC16', label: 'Lime' },
    { value: '#F97316', label: 'Orange' }
  ];

  // Debug logging functions
  const debugLog = (message: string, data?: any) => {
    // Debug logging disabled in production
    if (import.meta.env.DEV) {
      console.warn(`[OrganizationManager] ${message}`, data);
    }
  };

  const errorLog = (message: string, error?: any) => {
    console.error(`[OrganizationManager] ERROR: ${message}`, error);
  };

  const backendEnabled = import.meta.env.VITE_USE_BACKEND === 'true';

  type PersistPersonPayload = {
    id?: string;
    name: string;
    email: string;
    functionId: FunctionType;
    managerId?: string;
    teamId?: string;
    podId?: string;
    joinDate: string;
    active: boolean;
  };

  type PersistTeamPayload = {
    id?: string;
    name: string;
    color: string;
    description?: string;
  };

  type PersistPodPayload = {
    id?: string;
    name: string;
    teamId: string;
    description?: string;
  };

  type PersistFunctionPayload = {
    id?: string;
    name: string;
    description?: string;
    color: string;
    createdAt: string;
  };

  const resolveApiEndpoint = (path: string) => {
    if (!backendEnabled || !path.startsWith('/')) {
      return path;
    }

    const configuredTarget = import.meta.env.VITE_API_TARGET?.trim();
    if (configuredTarget && configuredTarget.length > 0) {
      return `${configuredTarget.replace(/\/$/, '')}${path}`;
    }

    if (typeof window !== 'undefined') {
      const { protocol, hostname, port } = window.location;
      if (port === '5173') {
        return `${protocol}//${hostname}:3001${path}`;
      }
    }

    return path;
  };

  const sanitizePersonFromBackend = (candidate: any, fallback: Person): Person => {
    const result: Person = { ...fallback };

    if (candidate && typeof candidate === 'object') {
      if (typeof candidate.id === 'string' && candidate.id.trim()) {
        result.id = candidate.id.trim();
      }
      if (typeof candidate.name === 'string' && candidate.name.trim()) {
        result.name = candidate.name.trim();
      }
      if (typeof candidate.email === 'string' && candidate.email.trim()) {
        result.email = candidate.email.trim();
      }
      if (typeof candidate.functionId === 'string' && candidate.functionId.trim()) {
        result.functionId = candidate.functionId.trim() as FunctionType;
      }
      if (typeof candidate.managerId === 'string' && candidate.managerId.trim()) {
        result.managerId = candidate.managerId.trim();
      } else if (candidate?.managerId === null) {
        result.managerId = undefined;
      }
      if (typeof candidate.teamId === 'string') {
        result.teamId = candidate.teamId;
      }
      if (typeof candidate.podId === 'string' && candidate.podId.trim()) {
        result.podId = candidate.podId.trim();
      } else if (candidate?.podId === null) {
        result.podId = undefined;
      }
      if (typeof candidate.joinDate === 'string' && candidate.joinDate.trim()) {
        result.joinDate = candidate.joinDate;
      }
      if (typeof candidate.active === 'boolean') {
        result.active = candidate.active;
      } else if (candidate?.active !== undefined) {
        result.active = Boolean(candidate.active);
      }
    }

    return result;
  };

  const sanitizeTeamFromBackend = (candidate: any, fallback: Team): Team => {
    const result: Team = { ...fallback };
    if (candidate && typeof candidate === 'object') {
      if (typeof candidate.id === 'string' && candidate.id.trim()) {
        result.id = candidate.id.trim();
      }
      if (typeof candidate.name === 'string' && candidate.name.trim()) {
        result.name = candidate.name.trim();
      }
      if (typeof candidate.color === 'string' && candidate.color.trim()) {
        result.color = candidate.color.trim();
      }
      if (typeof candidate.description === 'string') {
        result.description = candidate.description || undefined;
      } else if (candidate?.description === null) {
        result.description = undefined;
      }
    }
    return result;
  };

  const sanitizePodFromBackend = (candidate: any, fallback: Pod): Pod => {
    const result: Pod = { ...fallback };
    if (candidate && typeof candidate === 'object') {
      if (typeof candidate.id === 'string' && candidate.id.trim()) {
        result.id = candidate.id.trim();
      }
      if (typeof candidate.name === 'string' && candidate.name.trim()) {
        result.name = candidate.name.trim();
      }
      if (typeof candidate.teamId === 'string' && candidate.teamId.trim()) {
        result.teamId = candidate.teamId.trim();
      }
      if (typeof candidate.description === 'string') {
        result.description = candidate.description || undefined;
      } else if (candidate?.description === null) {
        result.description = undefined;
      }
    }
    return result;
  };

  const sanitizeFunctionFromBackend = (candidate: any, fallback: OrgFunction): OrgFunction => {
    const result: OrgFunction = { ...fallback };
    if (candidate && typeof candidate === 'object') {
      if (typeof candidate.id === 'string' && candidate.id.trim()) {
        result.id = candidate.id.trim();
      }
      if (typeof candidate.name === 'string' && candidate.name.trim()) {
        result.name = candidate.name.trim();
      }
      if (typeof candidate.description === 'string') {
        result.description = candidate.description || undefined;
      } else if (candidate?.description === null) {
        result.description = undefined;
      }
      if (typeof candidate.color === 'string' && candidate.color.trim()) {
        result.color = candidate.color.trim();
      }
      if (typeof candidate.createdAt === 'string' && candidate.createdAt.trim()) {
        result.createdAt = candidate.createdAt;
      }
    }
    return result;
  };

  const persistPersonToBackend = async (
    payload: PersistPersonPayload,
    mode: 'create' | 'update'
  ): Promise<Person | null> => {
    if (!backendEnabled) {
      return null;
    }

    const endpointPath = mode === 'create'
      ? '/api/person'
      : `/api/person/${payload.id ?? ''}`;
    const endpoint = resolveApiEndpoint(endpointPath);

    try {
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data && typeof data.error === 'string' ? data.error : `Failed to ${mode} person`;
        throw new Error(message);
      }

      const fallback: Person = {
        id: payload.id ?? `person-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        functionId: payload.functionId,
        managerId: payload.managerId,
        teamId: payload.teamId ?? '',
        podId: payload.podId,
        joinDate: payload.joinDate,
        active: payload.active,
      };

      return sanitizePersonFromBackend(data?.person, fallback);
    } catch (error) {
      errorLog(`Failed to ${mode} person via backend`, error);
      return null;
    }
  };

  const persistTeamToBackend = async (
    payload: PersistTeamPayload,
    mode: 'create' | 'update'
  ): Promise<Team | null> => {
    if (!backendEnabled) {
      return null;
    }

    const endpointPath = mode === 'create'
      ? '/api/team'
      : `/api/team/${payload.id ?? ''}`;
    const endpoint = resolveApiEndpoint(endpointPath);

    try {
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data && typeof data.error === 'string' ? data.error : `Failed to ${mode} team`;
        throw new Error(message);
      }

      const fallback: Team = {
        id: payload.id ?? `team-${Date.now()}`,
        name: payload.name,
        color: payload.color,
        description: payload.description || undefined,
      };

      return sanitizeTeamFromBackend(data?.team, fallback);
    } catch (error) {
      errorLog(`Failed to ${mode} team via backend`, error);
      return null;
    }
  };

  const persistPodToBackend = async (
    payload: PersistPodPayload,
    mode: 'create' | 'update'
  ): Promise<Pod | null> => {
    if (!backendEnabled) {
      return null;
    }

    const endpointPath = mode === 'create'
      ? '/api/pod'
      : `/api/pod/${payload.id ?? ''}`;
    const endpoint = resolveApiEndpoint(endpointPath);

    try {
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data && typeof data.error === 'string' ? data.error : `Failed to ${mode} pod`;
        throw new Error(message);
      }

      const fallback: Pod = {
        id: payload.id ?? `pod-${Date.now()}`,
        name: payload.name,
        teamId: payload.teamId,
        description: payload.description,
        members: [],
      };

      return sanitizePodFromBackend(data?.pod, fallback);
    } catch (error) {
      errorLog(`Failed to ${mode} pod via backend`, error);
      return null;
    }
  };

  const persistFunctionToBackend = async (
    payload: PersistFunctionPayload,
    mode: 'create' | 'update'
  ): Promise<OrgFunction | null> => {
    if (!backendEnabled) {
      return null;
    }

    const endpointPath = mode === 'create'
      ? '/api/function'
      : `/api/function/${payload.id ?? ''}`;
    const endpoint = resolveApiEndpoint(endpointPath);

    try {
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data && typeof data.error === 'string' ? data.error : `Failed to ${mode} function`;
        throw new Error(message);
      }

      const fallback: OrgFunction = {
        id: payload.id ?? `function-${Date.now()}`,
        name: payload.name,
        description: payload.description,
        color: payload.color,
        createdAt: payload.createdAt,
      };

      return sanitizeFunctionFromBackend(data?.function, fallback);
    } catch (error) {
      errorLog(`Failed to ${mode} function via backend`, error);
      return null;
    }
  };

  // Safe data access with fallbacks
  const safeTeams = useMemo(() => (Array.isArray(teams) ? teams.filter(t => t && t.id && t.name) : []), [teams]);
  const safePods = useMemo(() => (Array.isArray(pods) ? pods.filter(p => p && p.id && p.name && p.teamId) : []), [pods]);
  const safeFunctions = useMemo(() => (Array.isArray(functions)
    ? functions.filter(fn => fn && fn.id && fn.name)
    : []), [functions]);
  const safePeople = useMemo(() => (Array.isArray(people)
    ? people.filter(p => p && p.id && p.name && p.active && p.functionId)
    : []), [people]);

  const defaultFunctionId = safeFunctions[0]?.id ?? '';
  const getFunctionById = (id: string) => safeFunctions.find(fn => fn.id === id);
  const getFunctionColor = (id: string) => getFunctionById(id)?.color ?? '#6B7280';
  const getFunctionName = (id: string) => getFunctionById(id)?.name ?? (id || 'Unknown Function');
  const recentFunctions = useMemo(() => safeFunctions.slice(-3).reverse(), [safeFunctions]);
  const teamById = useMemo(() => {
    const map = new Map<string, Team>();
    safeTeams.forEach(team => map.set(team.id, team));
    return map;
  }, [safeTeams]);

  const podsByTeam = useMemo(() => {
    const map = new Map<string, Pod[]>();
    safePods.forEach(pod => {
      const list = map.get(pod.teamId) ?? [];
      list.push(pod);
      map.set(pod.teamId, list);
    });
    return map;
  }, [safePods]);

  const functionUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    safePeople.forEach(person => {
      if (!person.functionId) {
        return;
      }
      counts[person.functionId] = (counts[person.functionId] ?? 0) + 1;
    });

    safePods.forEach(pod => {
      if (!Array.isArray(pod.members)) {
        return;
      }

      pod.members.forEach(member => {
        if (typeof member === 'object' && member && 'role' in member && member.role) {
          const role = member.role as string;
          counts[role] = (counts[role] ?? 0) + 1;
        }
      });
    });

    return counts;
  }, [safePeople, safePods]);

  const teamSuggestions = useMemo<AutocompleteSuggestion<Team>[]>(() => {
    const trimmed = newTeam.name.trim();
    const fallback = [...safeTeams].slice(-5).reverse();
    const matches = trimmed
      ? findSimilarTeams(safeTeams, trimmed, 0.5)
      : fallback;

    return matches.slice(0, 5).map(team => ({
      id: team.id,
      value: team.name,
      label: team.name,
      description: team.description,
      icon: <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: team.color }} />,
      meta: [`${podsByTeam.get(team.id)?.length ?? 0} pods`],
      data: team,
    } as AutocompleteSuggestion<Team>));
  }, [newTeam.name, podsByTeam, safeTeams]);

  const podSuggestions = useMemo<AutocompleteSuggestion<Pod>[]>(() => {
    if (!newPod.teamId) {
      return [];
    }

    const podsForTeam = podsByTeam.get(newPod.teamId) ?? [];
    const trimmed = newPod.name.trim();
    const matches = trimmed
      ? findSimilarPods(podsForTeam, trimmed, 0.5)
      : podsForTeam.slice(-5).reverse();
    const team = teamById.get(newPod.teamId);

    return matches.slice(0, 5).map(pod => {
      const memberCount = Array.isArray(pod.members) ? pod.members.length : 0;
      return {
        id: pod.id,
        value: pod.name,
        label: pod.name,
        description: pod.description,
        badgeColor: team?.color,
        badgeText: `${memberCount} member${memberCount === 1 ? '' : 's'}`,
        data: pod,
        group: team?.name,
      } as AutocompleteSuggestion<Pod>;
    });
  }, [newPod.name, newPod.teamId, podsByTeam, teamById]);

  const functionSuggestions = useMemo<AutocompleteSuggestion<OrgFunction>[]>(() => {
    const trimmed = newFunction.name.trim();
    const fallback = [...safeFunctions].slice(-5).reverse();
    const matches = trimmed
      ? findSimilarFunctions(safeFunctions, trimmed, 0.5)
      : fallback;

    return matches.slice(0, 5).map(fn => {
      const usage = functionUsageCounts[fn.id] ?? 0;
      return {
        id: fn.id,
        value: fn.name,
        label: fn.name,
        description: fn.description,
        badgeColor: fn.color,
        badgeText: `${usage} usage${usage === 1 ? '' : 's'}`,
        data: fn,
      } satisfies AutocompleteSuggestion<OrgFunction>;
    });
  }, [newFunction.name, safeFunctions, functionUsageCounts]);

  const personNameSuggestions = useMemo<AutocompleteSuggestion<Person>[]>(() => {
    const trimmed = newPerson.name.trim();
    if (!trimmed) {
      return [];
    }

    const matches = findSimilarPeople(safePeople, trimmed, 0.5)
      .filter(person => person.id !== editingPersonId);

    return matches.slice(0, 5).map(person => {
      const functionLabel = getFunctionName(person.functionId);
      const teamLabel = teamById.get(person.teamId)?.name ?? 'No Team';
      return {
        id: person.id,
        value: person.name,
        label: person.name,
        description: `${functionLabel} - ${teamLabel}`,
        meta: [functionLabel, teamLabel],
        data: person,
      } satisfies AutocompleteSuggestion<Person>;
    });
  }, [editingPersonId, getFunctionName, newPerson.name, safePeople, teamById]);

  const managerSuggestions = useMemo<AutocompleteSuggestion<Person>[]>(() => {
    const query = managerSearch.trim().toLowerCase();

    // Only return suggestions when user has typed something
    if (!query) {
      return [];
    }

    const uniqueManagers = new Map<string, Person>();

    safePeople.forEach(person => {
      if (person.id === editingPersonId) {
        return;
      }

      const key = person.id || normalizeEmail(person.email);
      const existing = uniqueManagers.get(key);

      if (!existing) {
        uniqueManagers.set(key, person);
        return;
      }

      const existingMatchesTeam = existing.teamId === newPerson.teamId;
      const candidateMatchesTeam = person.teamId === newPerson.teamId;

      if (candidateMatchesTeam && !existingMatchesTeam) {
        uniqueManagers.set(key, person);
        return;
      }

      if (!existingMatchesTeam && !candidateMatchesTeam && person.name.localeCompare(existing.name) < 0) {
        uniqueManagers.set(key, person);
      }
    });

    const allCandidates = Array.from(uniqueManagers.values());

    const filtered = allCandidates.filter(person => {
      const name = person.name.toLowerCase();
      const functionLabel = getFunctionName(person.functionId).toLowerCase();
      const teamLabel = (teamById.get(person.teamId)?.name ?? 'No Team').toLowerCase();

      // More restrictive search: check if any word in the query matches the start of any word in the fields
      const queryWords = query.split(/\s+/).filter(word => word.length > 0);
      return queryWords.some(word => {
        const nameWords = name.split(/\s+/);
        const functionWords = functionLabel.split(/\s+/);
        const teamWords = teamLabel.split(/\s+/);

        return nameWords.some(n => n.startsWith(word)) ||
               functionWords.some(f => f.startsWith(word)) ||
               teamWords.some(t => t.startsWith(word));
      });
    });

    const ranked = [...filtered].sort((a, b) => {
      const aTeamPriority = a.teamId === newPerson.teamId ? 0 : 1;
      const bTeamPriority = b.teamId === newPerson.teamId ? 0 : 1;
      if (aTeamPriority !== bTeamPriority) {
        return aTeamPriority - bTeamPriority;
      }

      if (query) {
        const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) {
          return aStarts - bStarts;
        }

        const aIncludes = a.name.toLowerCase().includes(query) ? 0 : 1;
        const bIncludes = b.name.toLowerCase().includes(query) ? 0 : 1;
        if (aIncludes !== bIncludes) {
          return aIncludes - bIncludes;
        }
      }

      return a.name.localeCompare(b.name);
    });

    return ranked.slice(0, 5).map(person => {
      const functionLabel = getFunctionName(person.functionId);
      const teamLabel = teamById.get(person.teamId)?.name ?? 'No Team';

      return {
        id: person.id,
        value: person.name,
        label: person.name,
        description: `${functionLabel} - ${teamLabel}`,
        data: person,
      } satisfies AutocompleteSuggestion<Person>;
    });
  }, [editingPersonId, getFunctionName, managerSearch, newPerson.teamId, safePeople, teamById]);

  const podMemberSuggestions = useMemo<AutocompleteSuggestion<Person>[]>(() => {
    const trimmed = currentMember.name.trim();
    const matches = trimmed
      ? findSimilarPeople(safePeople, trimmed, 0.45)
      : safePeople.slice(0, 5);

    return matches.slice(0, 5).map(person => {
      const functionLabel = getFunctionName(person.functionId);
      const teamLabel = teamById.get(person.teamId)?.name ?? 'No Team';
      return {
        id: person.id,
        value: person.name,
        label: `${person.name} (${functionLabel})`,
        description: teamLabel,
        badgeText: functionLabel,
        meta: [teamLabel],
        data: person,
      } satisfies AutocompleteSuggestion<Person>;
    });
  }, [currentMember.name, getFunctionName, safePeople, teamById]);

  useEffect(() => {
    if (!newPerson.functionId && defaultFunctionId) {
      setNewPerson(prev => ({ ...prev, functionId: defaultFunctionId as FunctionType }));
    }

    if (!currentMember.role && defaultFunctionId) {
      setCurrentMember(prev => ({ ...prev, role: defaultFunctionId as FunctionType }));
    }

    if (!newFunction.color && safeFunctions[0]?.color) {
      setNewFunction(prev => ({ ...prev, color: safeFunctions[0].color }));
    }
  }, [defaultFunctionId, safeFunctions, newFunction.color, newPerson.functionId, currentMember.role]);

  useEffect(() => {
    if (!isAddingTeam) {
      setTeamError(null);
    }
  }, [isAddingTeam]);

  const populateTeamForm = useCallback((team: Team) => {
    setNewTeam({
      name: team.name,
      description: team.description ?? '',
      color: team.color,
    });
    setEditingTeamId(team.id);
    setTeamError(null);
    setTeamValidation({
      isDuplicate: false,
      similarEntities: [team],
      message: `Editing existing team "${team.name}"`,
      tone: "info",
    });
  }, []);

  const applyTeamFormState = useCallback((team: Team) => {
    setNewTeam({
      name: team.name,
      description: team.description ?? '',
      color: team.color,
    });
    setEditingTeamId(team.id);
    setTeamError(null);
    setTeamValidation({
      isDuplicate: false,
      similarEntities: [team],
      message: `Editing existing team "${team.name}"`,
      tone: "info",
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = newTeam.name.trim();

      if (!trimmed) {
        setTeamValidation({ isDuplicate: false, similarEntities: [] });
        return;
      }

      const similar = findSimilarTeams(safeTeams, trimmed, 0.6).filter(team => team.id !== editingTeamId);
      const duplicate = checkDuplicate(safeTeams, trimmed, editingTeamId ?? undefined);
      const topMatch = similar[0];

      setTeamValidation({
        isDuplicate: duplicate,
        similarEntities: similar,
        message: duplicate
          ? `A team named "${topMatch?.name ?? trimmed}" already exists.`
          : topMatch
            ? `Similar team exists: ${topMatch.name}`
            : undefined,
        tone: duplicate ? 'error' : topMatch ? 'warning' : undefined,
        actionLabel: topMatch && !duplicate ? 'Edit existing' : undefined,
        onAction: topMatch && !duplicate ? () => populateTeamForm(topMatch) : undefined,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [editingTeamId, newTeam.name, populateTeamForm, safeTeams]);

  const populateFunctionForm = useCallback((func: OrgFunction) => {
    setNewFunction({
      name: func.name,
      description: func.description ?? '',
      color: func.color,
    });
    setEditingFunctionId(func.id);
    setFunctionErrors({});
    setFunctionValidation({
      isDuplicate: false,
      similarEntities: [func],
      message: `Editing existing function "${func.name}"`,
      tone: 'info',
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = newFunction.name.trim();

      if (!trimmed) {
        setFunctionValidation({ isDuplicate: false, similarEntities: [] });
        return;
      }

      const similar = findSimilarFunctions(safeFunctions, trimmed, 0.6).filter(fn => fn.id !== editingFunctionId);
      const duplicate = checkDuplicate(safeFunctions, trimmed, editingFunctionId ?? undefined);
      const topMatch = similar[0];

      setFunctionValidation({
        isDuplicate: duplicate,
        similarEntities: similar,
        message: duplicate
          ? `A function named "${topMatch?.name ?? trimmed}" already exists.`
          : topMatch
            ? `Did you mean: ${topMatch.name}?`
            : undefined,
        tone: duplicate ? 'error' : topMatch ? 'info' : undefined,
        actionLabel: topMatch && !duplicate ? 'Edit existing' : undefined,
        onAction: topMatch && !duplicate ? () => populateFunctionForm(topMatch) : undefined,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [editingFunctionId, newFunction.name, populateFunctionForm, safeFunctions]);

  const populatePersonForm = useCallback((person: Person) => {
    const manager = person.managerId ? safePeople.find(p => p.id === person.managerId) : undefined;

    setNewPerson({
      name: person.name,
      email: person.email,
      functionId: person.functionId,
      managerId: manager?.id ?? '',
      teamId: person.teamId ?? '',
      podId: person.podId ?? '',
    });
    setEditingPersonId(person.id);
    setPersonNameValidation({
      isDuplicate: false,
      similarEntities: [person],
      message: `Editing existing person "${person.name}"`,
      tone: 'info',
    });
    setPersonEmailValidation({ isDuplicate: false, similarEntities: [] });
    setManagerSearch(manager?.name ?? '');
  }, [safePeople]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = newPerson.name.trim();

      if (!trimmed) {
        setPersonNameValidation({ isDuplicate: false, similarEntities: [] });
        return;
      }

      const similar = findSimilarPeople(safePeople, trimmed, 0.6)
        .filter(person => person.id !== editingPersonId);
      const topMatch = similar[0];

      setPersonNameValidation({
        isDuplicate: false,
        similarEntities: similar,
        message: topMatch ? `Similar person exists: ${topMatch.name}` : undefined,
        tone: topMatch ? 'info' : undefined,
        actionLabel: topMatch ? 'Edit instead' : undefined,
        onAction: topMatch ? () => populatePersonForm(topMatch) : undefined,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [editingPersonId, newPerson.name, populatePersonForm, safePeople]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = newPerson.email.trim();

      if (!trimmed) {
        setPersonEmailValidation({ isDuplicate: false, similarEntities: [] });
        return;
      }

      const normalized = normalizeEmail(trimmed);
      const duplicate = safePeople.find(person =>
        person.id !== editingPersonId && normalizeEmail(person.email) === normalized
      );

      if (duplicate) {
        setPersonEmailValidation({
          isDuplicate: true,
          similarEntities: [duplicate],
          message: `Person with this email already exists: ${duplicate.name}`,
          tone: 'error',
          actionLabel: 'Edit existing',
          onAction: () => populatePersonForm(duplicate),
        });
      } else {
        setPersonEmailValidation({ isDuplicate: false, similarEntities: [] });
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [editingPersonId, newPerson.email, populatePersonForm, safePeople]);

  const resetTeamForm = () => {
    setNewTeam({ name: '', description: '', color: '#3B82F6' });
    setTeamError(null);
    setEditingTeamId(null);
    setTeamValidation({ isDuplicate: false, similarEntities: [] });
  };

  const openTeamDialog = (team?: Team) => {
    if (team) {
      applyTeamFormState(team);
    } else {
      resetTeamForm();
    }
    setIsAddingTeam(true);
  };

  const handleTeamSuggestionSelect = (suggestion: AutocompleteSuggestion<Team>) => {
    setTeamError(null);
    if (suggestion.data) {
      applyTeamFormState(suggestion.data);
    } else {
      setNewTeam(prev => ({ ...prev, name: suggestion.value }));
    }
  };

  const closeTeamDialog = () => {
    resetTeamForm();
    setIsAddingTeam(false);
  };

  const handleSaveTeam = async () => {
    try {
      const trimmedName = newTeam.name.trim();
      debugLog(editingTeamId ? 'handleSaveTeam (edit)' : 'handleSaveTeam (add)', { newTeam, editingTeamId });

      if (!trimmedName) {
        setTeamError('Team name is required');
        return;
      }

      if (teamValidation.isDuplicate || checkDuplicate(safeTeams, trimmedName, editingTeamId ?? undefined)) {
        setTeamError('A team with this name already exists.');
        return;
      }

      const trimmedDescription = newTeam.description.trim();
      const trimmedColor = newTeam.color.trim() || '#3B82F6';

      if (editingTeamId) {
        const updatedTeams = teams.map(team =>
          team.id === editingTeamId
            ? {
                ...team,
                name: trimmedName,
                description: trimmedDescription || undefined,
                color: trimmedColor,
              }
            : team
        );

        const existingTeam = teams.find(team => team.id === editingTeamId);
        const payload: PersistTeamPayload = {
          id: editingTeamId,
          name: trimmedName,
          color: trimmedColor,
          description: trimmedDescription || undefined,
        };

        const persisted = await persistTeamToBackend(payload, 'update');
        const mergedTeams = updatedTeams.map(team =>
          team.id === editingTeamId
            ? {
                ...team,
                ...(persisted ? { ...persisted, organizationId: existingTeam?.organizationId } : {}),
              }
            : team
        );

        onTeamsChange(mergedTeams);
        debugLog('Team updated successfully', { teamId: editingTeamId, persisted: Boolean(persisted) });
      } else {
        const generatedId = `team-${Date.now()}`;
        const fallbackTeam: Team = {
          id: generatedId,
          name: trimmedName,
          description: trimmedDescription || undefined,
          color: trimmedColor,
          organizationId: safeTeams[0]?.organizationId,
        };

        const payload: PersistTeamPayload = {
          ...fallbackTeam,
          id: generatedId,
        };

        const persisted = await persistTeamToBackend(payload, 'create');
        const teamToAdd = persisted ? { ...fallbackTeam, ...persisted } : fallbackTeam;

        debugLog('Creating new team', teamToAdd);
        onTeamsChange([...teams, teamToAdd]);
        debugLog('Team added successfully', { teamId: teamToAdd.id, persisted: Boolean(persisted) });
      }

      resetTeamForm();
      setIsAddingTeam(false);
    } catch (error) {
      errorLog('Failed to save team', error);
    }
  };

  const clonePodMembersForState = useCallback((members: Pod['members']) => {
    if (!Array.isArray(members)) {
      return [] as PodMember[];
    }

    return members.map(member =>
      typeof member === 'string'
        ? {
            name: member,
            role: (defaultFunctionId || safeFunctions[0]?.id || '') as FunctionType,
          }
        : { name: member.name, role: member.role }
    );
  }, [defaultFunctionId, safeFunctions]);

  const cloneStateMembersForPersist = (members: PodMember[]) =>
    members.map(member => ({ name: member.name, role: member.role })) as PodMember[];

  const resetPodForm = () => {
    setNewPod({ name: '', teamId: '', description: '', members: [] });
    setCurrentMember({ name: '', role: defaultFunctionId as FunctionType });
    setEditingPodId(null);
    setPodValidation({ isDuplicate: false, similarEntities: [] });
  };

  let populatePodForm: (pod: Pod) => void;
  populatePodForm = (pod: Pod) => {
    setNewPod({
      name: pod.name,
      teamId: pod.teamId,
      description: pod.description ?? '',
      members: clonePodMembersForState(pod.members),
    });
    setEditingPodId(pod.id);
    setPodValidation({
      isDuplicate: false,
      similarEntities: [pod],
      message: `Editing existing pod "${pod.name}"`,
      tone: 'info',
    });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = newPod.name.trim();
      if (!trimmed || !newPod.teamId) {
        setPodValidation({ isDuplicate: false, similarEntities: [] });
        return;
      }

      const podsForTeam = podsByTeam.get(newPod.teamId) ?? [];
      const similar = findSimilarPods(podsForTeam, trimmed, 0.6).filter(pod => pod.id !== editingPodId);
      const duplicate = checkDuplicate(podsForTeam, trimmed, editingPodId ?? undefined);
      const teamName = teamById.get(newPod.teamId)?.name ?? 'this team';
      const topMatch = similar[0];

      setPodValidation({
        isDuplicate: duplicate,
        similarEntities: similar,
        message: duplicate
          ? `A pod named "${trimmed}" already exists in ${teamName}.`
          : topMatch
            ? `Similar pod found in ${teamName}: ${topMatch.name}`
            : undefined,
        tone: duplicate ? 'error' : topMatch ? 'info' : undefined,
        actionLabel: topMatch && !duplicate ? 'Edit existing' : undefined,
        onAction: topMatch && !duplicate ? () => populatePodForm(topMatch) : undefined,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [editingPodId, newPod.name, newPod.teamId, podsByTeam, populatePodForm, teamById]);

  const openPodDialog = (pod?: Pod) => {
    if (pod) {
      populatePodForm(pod);
    } else {
      resetPodForm();
    }
    setIsAddingPod(true);
  };

  const handlePodSuggestionSelect = (suggestion: AutocompleteSuggestion<Pod>) => {
    if (suggestion.data) {
      populatePodForm(suggestion.data);
    } else {
      setNewPod(prev => ({ ...prev, name: suggestion.value }));
    }
  };

  const closePodDialog = () => {
    resetPodForm();
    setIsAddingPod(false);
  };

  const handleSavePod = async () => {
    try {
      debugLog(editingPodId ? 'handleSavePod (edit)' : 'handleSavePod (add)', { newPod, editingPodId });

      const trimmedName = newPod.name.trim();
      const targetTeamId = newPod.teamId;

      if (!trimmedName || !targetTeamId) {
        return;
      }

      const podsForTeam = podsByTeam.get(targetTeamId) ?? [];
      if (podValidation.isDuplicate || checkDuplicate(podsForTeam, trimmedName, editingPodId ?? undefined)) {
        const teamName = teamById.get(targetTeamId)?.name ?? 'this team';
        setPodValidation(prev => ({
          ...prev,
          isDuplicate: true,
          message: `A pod named "${trimmedName}" already exists in ${teamName}.`,
          tone: 'error',
        }));
        return;
      }

      const trimmedDescription = newPod.description.trim();
      const podId = editingPodId ?? `pod-${Date.now()}`;
      const podBase: Pod = {
        id: podId,
        name: trimmedName,
        teamId: targetTeamId,
        description: trimmedDescription ? trimmedDescription : undefined,
        members: cloneStateMembersForPersist(newPod.members),
      };

      if (editingPodId) {
        const payload: PersistPodPayload = {
          id: editingPodId,
          name: trimmedName,
          teamId: targetTeamId,
          description: podBase.description,
        };

        const persisted = await persistPodToBackend(payload, 'update');
        const finalPod: Pod = persisted ? { ...podBase, ...persisted, members: podBase.members } : podBase;
        const updatedPods = pods.map(pod => (pod.id === editingPodId ? finalPod : pod));
        onPodsChange(updatedPods);
        debugLog('Pod updated successfully', { podId: editingPodId, persisted: Boolean(persisted) });
      } else {
        const payload: PersistPodPayload = {
          id: podId,
          name: trimmedName,
          teamId: targetTeamId,
          description: podBase.description,
        };

        const persisted = await persistPodToBackend(payload, 'create');
        const finalPod: Pod = persisted ? { ...podBase, ...persisted, members: podBase.members } : podBase;
        onPodsChange([...pods, finalPod]);
        debugLog('Pod added successfully', { podId: finalPod.id, persisted: Boolean(persisted) });
      }

      resetPodForm();
      setIsAddingPod(false);
    } catch (error) {
      errorLog('Failed to save pod', error);
    }
  };

  const resetFunctionForm = () => {
    setNewFunction({ name: '', description: '', color: safeFunctions[0]?.color ?? '#3B82F6' });
    setFunctionErrors({});
    setEditingFunctionId(null);
    setFunctionValidation({ isDuplicate: false, similarEntities: [] });
  };

  const openFunctionDialog = (func?: OrgFunction) => {
    if (func) {
      populateFunctionForm(func);
    } else {
      resetFunctionForm();
    }
    setIsAddingFunction(true);
  };

  const handleFunctionSuggestionSelect = (suggestion: AutocompleteSuggestion<OrgFunction>) => {
    if (suggestion.data) {
      populateFunctionForm(suggestion.data);
    } else {
      updateFunctionField('name', suggestion.value);
    }
  };

  const updateFunctionField = (field: 'name' | 'description' | 'color', value: string) => {
    setNewFunction(prev => ({ ...prev, [field]: value }));
    if (functionErrors[field]) {
      setFunctionErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSaveFunction = async () => {
    try {
      debugLog(editingFunctionId ? 'handleSaveFunction (edit)' : 'handleSaveFunction (add)', {
        newFunction,
        editingFunctionId,
      });

      const trimmedName = newFunction.name.trim();
      const trimmedColor = newFunction.color.trim();
      const errors: { name?: string; color?: string } = {};

      if (!trimmedName) {
        errors.name = 'Function name is required';
      } else if (functionValidation.isDuplicate || checkDuplicate(safeFunctions, trimmedName, editingFunctionId ?? undefined)) {
        errors.name = 'Function name already exists';
      }

      if (!trimmedColor) {
        errors.color = 'Function color is required';
      } else if (!HEX_COLOR_PATTERN.test(trimmedColor)) {
        errors.color = 'Use a valid hex color (e.g. #3B82F6)';
      }

      if (Object.keys(errors).length > 0) {
        setFunctionErrors(errors);
        return;
      }

      if (editingFunctionId) {
        const existingFunction = functions.find(fn => fn.id === editingFunctionId);
        if (!existingFunction) {
          errorLog('Attempted to edit function that no longer exists', { editingFunctionId });
          handleCloseFunctionDialog();
          return;
        }

        const payload: PersistFunctionPayload = {
          id: editingFunctionId,
          name: trimmedName,
          description: newFunction.description.trim() ? newFunction.description.trim() : undefined,
          color: trimmedColor,
          createdAt: existingFunction.createdAt,
        };

        const persisted = await persistFunctionToBackend(payload, 'update');
        const updatedFunction: OrgFunction = persisted
          ? { ...existingFunction, ...persisted }
          : {
              ...existingFunction,
              name: trimmedName,
              description: newFunction.description.trim() ? newFunction.description.trim() : undefined,
              color: trimmedColor,
            };

        const updatedFunctions = functions.map(fn => (fn.id === editingFunctionId ? updatedFunction : fn));

        onFunctionsChange(updatedFunctions);
        debugLog('Function updated successfully', { functionId: editingFunctionId, persisted: Boolean(persisted) });
      } else {
        let slugBase = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!slugBase) {
          slugBase = 'function';
        }

        let generatedId = slugBase;
        let attempt = 1;
        while (safeFunctions.some(fn => fn.id === generatedId)) {
          generatedId = `${slugBase}-${attempt++}`;
        }

        const createdAt = new Date().toISOString();
        const fallbackFunction: OrgFunction = {
          id: generatedId,
          name: trimmedName,
          description: newFunction.description.trim() ? newFunction.description.trim() : undefined,
          color: trimmedColor,
          createdAt,
        };

        const payload: PersistFunctionPayload = {
          ...fallbackFunction,
        };

        const persisted = await persistFunctionToBackend(payload, 'create');
        const newEntry = persisted ? { ...fallbackFunction, ...persisted } : fallbackFunction;

        onFunctionsChange([...functions, newEntry]);
        setNewPerson(prev => ({ ...prev, functionId: newEntry.id as FunctionType }));
        setCurrentMember(prev => ({ ...prev, role: newEntry.id as FunctionType }));
        debugLog('Function added successfully', { functionId: newEntry.id, persisted: Boolean(persisted) });
      }

      resetFunctionForm();
      setIsAddingFunction(false);
    } catch (error) {
      errorLog('Failed to save function', error);
    }
  };

  const handleCloseFunctionDialog = () => {
    debugLog('Closing function dialog');
    resetFunctionForm();
    setIsAddingFunction(false);
  };

  const isEditingFunction = Boolean(editingFunctionId);

  const resetPersonForm = () => {
    setNewPerson({
      name: '',
      email: '',
      functionId: (defaultFunctionId || safeFunctions[0]?.id || '') as FunctionType,
      managerId: '',
      teamId: '',
      podId: '',
    });
    setEditingPersonId(null);
    setPersonNameValidation({ isDuplicate: false, similarEntities: [] });
    setPersonEmailValidation({ isDuplicate: false, similarEntities: [] });
    setManagerSearch('');
  };

  const openPersonDialog = (person?: Person) => {
    if (person) {
      populatePersonForm(person);
    } else {
      resetPersonForm();
    }
    setIsAddingPerson(true);
  };

  const handlePersonNameSuggestionSelect = (suggestion: AutocompleteSuggestion<Person>) => {
    if (suggestion.data) {
      populatePersonForm(suggestion.data);
      setIsAddingPerson(true);
    } else {
      setNewPerson(prev => ({ ...prev, name: suggestion.value }));
    }
  };

  const handleManagerSuggestionSelect = (suggestion: AutocompleteSuggestion<Person>) => {
    if (suggestion.data) {
      setNewPerson(prev => ({ ...prev, managerId: suggestion.data!.id }));
      // Clear search to prevent re-triggering suggestions in minimal mode
      setManagerSearch('');
    } else {
      setManagerSearch(suggestion.value);
    }
  };

  const handleMemberSuggestionSelect = (suggestion: AutocompleteSuggestion<Person>) => {
    if (suggestion.data) {
      setCurrentMember({ name: suggestion.data.name, role: suggestion.data.functionId });
    } else {
      setCurrentMember(prev => ({ ...prev, name: suggestion.value }));
    }
  };

  const handleSavePerson = async () => {
    try {
      debugLog(editingPersonId ? 'handleSavePerson (edit)' : 'handleSavePerson (add)', {
        newPerson,
        editingPersonId,
      });

      const trimmedName = newPerson.name.trim();
      const trimmedEmail = newPerson.email.trim();

      if (!(trimmedName && trimmedEmail && newPerson.functionId)) {
        debugLog('Person validation failed', {
          hasName: !!trimmedName,
          hasEmail: !!trimmedEmail,
          hasTeam: !!newPerson.teamId,
          hasFunction: !!newPerson.functionId,
        });
        return;
      }

      if (personEmailValidation.isDuplicate) {
        debugLog('Person email validation blocked save');
        return;
      }

      const normalizedEmail = normalizeEmail(trimmedEmail);
      const duplicate = safePeople.find(person =>
        person.id !== editingPersonId && normalizeEmail(person.email) === normalizedEmail
      );

      if (duplicate) {
        setPersonEmailValidation({
          isDuplicate: true,
          similarEntities: [duplicate],
          message: `Person with this email already exists: ${duplicate.name}`,
          tone: 'error',
          actionLabel: 'Edit existing',
          onAction: () => populatePersonForm(duplicate),
        });
        return;
      }

      if (editingPersonId) {
        const existingPerson = people.find(person => person.id === editingPersonId);
        if (!existingPerson) {
          errorLog('Attempted to edit person that no longer exists', { editingPersonId });
          resetPersonForm();
          setIsAddingPerson(false);
          return;
        }

        const payload: PersistPersonPayload = {
          id: existingPerson.id,
          name: trimmedName,
          email: trimmedEmail,
          functionId: newPerson.functionId,
          managerId: newPerson.managerId || undefined,
          teamId: newPerson.teamId || existingPerson.teamId,
          podId: newPerson.podId || undefined,
          joinDate: existingPerson.joinDate || new Date().toISOString().split('T')[0],
          active: existingPerson.active,
        };

        const persisted = await persistPersonToBackend(payload, 'update');
        const updatedPerson: Person = persisted ?? {
          ...existingPerson,
          name: trimmedName,
          email: trimmedEmail,
          functionId: newPerson.functionId,
          managerId: newPerson.managerId || undefined,
          teamId: newPerson.teamId || existingPerson.teamId,
          podId: newPerson.podId || undefined,
        };

        onPeopleChange(people.map(person => (person.id === editingPersonId ? updatedPerson : person)));
        debugLog('Person updated successfully', { personId: editingPersonId, persisted: Boolean(persisted) });
      } else {
        const generatedId = `person-${Date.now()}`;
        const joinDate = new Date().toISOString().split('T')[0];

        const fallbackPerson: Person = {
          id: generatedId,
          name: trimmedName,
          email: trimmedEmail,
          functionId: newPerson.functionId,
          managerId: newPerson.managerId || undefined,
          teamId: newPerson.teamId || '',
          podId: newPerson.podId || undefined,
          joinDate,
          active: true,
        };

        const payload: PersistPersonPayload = {
          ...fallbackPerson,
          functionId: newPerson.functionId,
        };

        const persisted = await persistPersonToBackend(payload, 'create');
        const personToAdd = persisted ?? fallbackPerson;

        debugLog('Creating new person', personToAdd);
        onPeopleChange([...people, personToAdd]);
        debugLog('Person added successfully', { personId: personToAdd.id, persisted: Boolean(persisted) });
      }

      resetPersonForm();
      setIsAddingPerson(false);
    } catch (error) {
      errorLog('Failed to save person', error);
    }
  };

  const handleCreateQuickManager = async (managerName: string) => {
    try {
      setIsCreatingQuickManager(true);
      debugLog('Creating quick manager', { managerName });

      // Validate name
      const trimmedName = managerName.trim();
      if (!trimmedName) {
        debugLog('Quick manager creation failed: empty name');
        return;
      }

      // Check for duplicates by name
      const existingPerson = safePeople.find(person =>
        person.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (existingPerson) {
        // If person already exists, just use them as the manager
        setNewPerson(prev => ({ ...prev, managerId: existingPerson.id }));
        setManagerSearch(''); // Clear search to close dropdown
        debugLog('Using existing person as manager', { managerId: existingPerson.id });
        return;
      }

      // Generate email from name (firstname.lastname@company.com)
      const nameParts = trimmedName.toLowerCase().split(/\s+/);
      const firstName = nameParts[0] || 'user';
      const lastName = nameParts[nameParts.length - 1] || '';
      const emailBase = lastName ? `${firstName}.${lastName}` : firstName;
      const generatedEmail = `${emailBase}@company.com`;

      // Create minimal manager person
      const generatedId = `person-${Date.now()}`;
      const joinDate = new Date().toISOString().split('T')[0];

      const quickManager: Person = {
        id: generatedId,
        name: trimmedName,
        email: generatedEmail,
        functionId: newPerson.functionId || defaultFunctionId as FunctionType, // Same function as person being added
        managerId: undefined, // No manager for the manager
        teamId: '', // No team assignment
        podId: undefined,
        joinDate,
        active: true,
      };

      // Persist to backend if available
      const payload: PersistPersonPayload = {
        ...quickManager,
      };

      const persisted = await persistPersonToBackend(payload, 'create');
      const managerToAdd = persisted ?? quickManager;

      // Add the manager to the people array
      onPeopleChange([...people, managerToAdd]);

      // Set the new manager on the current person being added
      setNewPerson(prev => ({ ...prev, managerId: managerToAdd.id }));
      // Clear the search to close dropdown and show the selected manager's name
      setManagerSearch('');
      // We'll display the manager's name differently (see below)

      debugLog('Quick manager created successfully', { managerId: managerToAdd.id });
    } catch (error) {
      errorLog('Failed to create quick manager', error);
    } finally {
      setIsCreatingQuickManager(false);
    }
  };

  const handleDeleteTeam = (teamId: string) => {
    onRequestDeleteTeam?.(teamId);
  };

  const handleDeletePod = (podId: string) => {
    onRequestDeletePod?.(podId);
  };

  const handleDeletePerson = (personId: string) => {
    onRequestDeletePerson?.(personId);
  };

  const handleDeleteFunction = (functionId: string) => {
    onRequestDeleteFunction?.(functionId);
  };

  const handleAddMember = () => {
    try {
      debugLog('handleAddMember called', { currentMember });
      
      if (currentMember.name.trim()) {
        const roleId = (currentMember.role || defaultFunctionId) as FunctionType;
        setNewPod(prev => ({
          ...prev,
          members: [...prev.members, { name: currentMember.name, role: roleId }]
        }));
        setCurrentMember({ name: '', role: defaultFunctionId as FunctionType });
        debugLog('Member added to pod');
      }
    } catch (error) {
      errorLog('Failed to add member', error);
    }
  };

  const handleRemoveMember = (index: number) => {
    try {
      debugLog('handleRemoveMember called', { index });
      
      setNewPod(prev => ({
        ...prev,
        members: prev.members.filter((_, i) => i !== index)
      }));
      debugLog('Member removed from pod');
    } catch (error) {
      errorLog('Failed to remove member', error);
    }
  };

  const getRoleColor = (role: string) => getFunctionColor(role);

  const getTeamName = (teamId: string) => {
    const team = safeTeams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const _getPodName = (podId: string) => {
    const pod = safePods.find(p => p.id === podId);
    return pod ? pod.name : 'No Pod';
  };

  const _getPersonName = (personId: string) => {
    const person = safePeople.find(p => p.id === personId);
    return person ? person.name : 'No Manager';
  };
  
  // Get pods filtered by selected team
  const getPodsForTeam = (teamId: string) => {
    try {
      if (!teamId) return [];
      return safePods.filter(p => p.teamId === teamId);
    } catch (error) {
      errorLog('Failed to compute pods for team', error);
      return [];
    }
  };

  // Enhanced button click handler with comprehensive logging
  const handleAddPersonClick = (e: React.MouseEvent) => {
    try {
      debugLog('Add Person button clicked');
      e.stopPropagation();
      
      // Log current state
      debugLog('Current state before opening dialog', {
        teams: safeTeams.length,
        pods: safePods.length,
        people: safePeople.length,
        isAddingPerson
      });
      
      openPersonDialog();
      debugLog('Dialog state set to open');
    } catch (error) {
      errorLog('Failed to handle Add Person click', error);
    }
  };

  // Enhanced dialog close handler
  const handleClosePersonDialog = () => {
    try {
      debugLog('Closing person dialog');
      resetPersonForm();
      setIsAddingPerson(false);
      debugLog('Person dialog closed and state reset');
    } catch (error) {
      errorLog('Failed to close person dialog', error);
    }
  };

  useEffect(() => {
    if (!externalFocus) {
      return;
    }

    setIsCollapsed(false);
    setDirectoryEntityType(externalFocus.entityType);

    if (externalFocus.showDirectory) {
      setShowAllEntities(true);
    }

    onExternalFocusHandled?.();
  }, [externalFocus, onExternalFocusHandled]);

  return (
    <Card>
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <div className="flex items-center justify-between p-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-3 hover:bg-muted/50 cursor-pointer flex-1 -m-4 p-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCollapsed(!isCollapsed); }}>
              {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-base font-medium leading-none">Organization Structure</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isCollapsed
                      ? `${safeTeams.length} ${safeTeams.length === 1 ? 'team' : 'teams'}, ${safePods.length} ${safePods.length === 1 ? 'pod' : 'pods'}, ${safeFunctions.length} ${safeFunctions.length === 1 ? 'function' : 'functions'}, ${safePeople.length} ${safePeople.length === 1 ? 'person' : 'people'}`
                      : "Set up your teams, pods, functions, and people for OKR management"
                    }
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          {isCollapsed && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={(e) => { e.stopPropagation(); openTeamDialog(); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add Team
              </Button>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); openPodDialog(); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add Pod
              </Button>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); openFunctionDialog(); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add Function
              </Button>
              <Button size="sm" onClick={handleAddPersonClick}>
                <Plus className="h-4 w-4 mr-1" />
                Add Person
              </Button>
            </div>
          )}
        </div>
        
        <CollapsibleContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Team Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Teams
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Organize your company structure into functional teams
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{safeTeams.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {safePods.length} pods total
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDirectoryEntityType("teams");
                        setShowAllEntities(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                    <Dialog open={isAddingTeam} onOpenChange={(open) => {
                      if (!open) {
                        closeTeamDialog();
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTeamDialog();
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Team
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingTeamId ? 'Edit Team' : 'Add New Team'}</DialogTitle>
                        <DialogDescription>
                          {editingTeamId
                            ? 'Update team details to keep pods and people aligned.'
                            : 'Create a new team in your organization'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="team-name">Team Name</Label>
                          <AutocompleteInput<Team>
                            inputId="team-name"
                            value={newTeam.name}
                            onChange={(value) => {
                              setNewTeam(prev => ({ ...prev, name: value }));
                              if (teamError) {
                                setTeamError(null);
                              }
                            }}
                            placeholder="e.g. Product, Engineering, Marketing"
                            suggestions={teamSuggestions}
                            onSelect={handleTeamSuggestionSelect}
                            validationState={teamValidation}
                          />
                          {teamError && (
                            <p className="text-sm text-destructive mt-1">{teamError}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="team-description">Description</Label>
                          <Textarea
                            id="team-description"
                            value={newTeam.description}
                            onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the team's responsibilities"
                          />
                        </div>
                        <div>
                          <Label htmlFor="team-color">Team Color</Label>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded border" style={{ backgroundColor: newTeam.color }} />
                            <Select value={newTeam.color} onValueChange={(value) => setNewTeam(prev => ({ ...prev, color: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select team color" />
                              </SelectTrigger>
                              <SelectContent>
                                {COLOR_OPTIONS.map((color) => (
                                  <SelectItem key={color.value} value={color.value}>
                                    {color.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={closeTeamDialog}>Cancel</Button>
                          <Button onClick={handleSaveTeam} disabled={teamValidation.isDuplicate}>
                            {editingTeamId ? 'Save Changes' : 'Add Team'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                {safeTeams.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recent Teams:</p>
                    <div className="space-y-1">
                      {safeTeams.slice(-3).map((team) => (
                        <div key={team.id} className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: team.color }} />
                            <span className="truncate">{team.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {safePods.filter(p => p.teamId === team.id).length} pods
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {safeTeams.length > 3 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => {
                          setDirectoryEntityType("teams");
                          setShowAllEntities(true);
                        }}
                      >
                        View all {safeTeams.length} teams →
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pod Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Pods
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create cross-functional pods within teams for focused execution
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{safePods.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {safePods.reduce((acc, pod) => acc + (pod.members ? pod.members.length : 0), 0)} members total
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDirectoryEntityType("pods");
                        setShowAllEntities(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                    <Dialog open={isAddingPod} onOpenChange={(open) => {
                      if (!open) {
                        closePodDialog();
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPodDialog();
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Pod
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingPodId ? 'Edit Pod' : 'Add New Pod'}</DialogTitle>
                        <DialogDescription>
                          {editingPodId
                            ? 'Update pod membership and details for this team.'
                            : 'Create a new pod within a team'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="pod-team">Team</Label>
                          <Select
                            value={newPod.teamId}
                            onValueChange={(value) => {
                              setNewPod(prev => ({ ...prev, teamId: value }));
                              setPodValidation({ isDuplicate: false, similarEntities: [] });
                            }}
                          >
                            <SelectTrigger id="pod-team" data-testid="pod-team-trigger">
                              <SelectValue placeholder="Select a team" />
                            </SelectTrigger>
                            <SelectContent>
                              {safeTeams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="pod-name">Pod Name</Label>
                          <AutocompleteInput<Pod>
                            inputId="pod-name"
                            value={newPod.name}
                            onChange={(value) => setNewPod(prev => ({ ...prev, name: value }))}
                            placeholder="e.g. Core Product, Growth, Platform"
                            suggestions={newPod.teamId ? podSuggestions : []}
                            onSelect={handlePodSuggestionSelect}
                            validationState={newPod.teamId ? podValidation : undefined}
                            disabled={!newPod.teamId}
                          />
                        </div>
                        <div>
                          <Label htmlFor="pod-description">Description</Label>
                          <Textarea
                            id="pod-description"
                            value={newPod.description}
                            onChange={(e) => setNewPod(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the pod's focus"
                          />
                        </div>
                        <div>
                          <Label>Team Members</Label>
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <AutocompleteInput<Person>
                                  value={currentMember.name}
                                  onChange={(value) => setCurrentMember(prev => ({ ...prev, name: value }))}
                                  placeholder="Member name"
                                  suggestions={podMemberSuggestions}
                                  onSelect={handleMemberSuggestionSelect}
                                  onSubmit={() => handleAddMember()}
                                />
                              </div>
                              <div className="w-32">
                                <Select
                                  value={currentMember.role || defaultFunctionId}
                                  onValueChange={(value) => setCurrentMember(prev => ({ ...prev, role: value as FunctionType }))}
                                  disabled={safeFunctions.length === 0}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {safeFunctions.length === 0 && (
                                      <SelectItem value="" disabled>
                                        No functions available
                                      </SelectItem>
                                    )}
                                    {safeFunctions.map((fn) => (
                                      <SelectItem key={fn.id} value={fn.id}>
                                        {fn.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button 
                                type="button" 
                                onClick={handleAddMember}
                                disabled={!currentMember.name.trim()}
                                size="sm"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            {newPod.members.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Added members:</div>
                                <div className="flex flex-wrap gap-2">
                                  {newPod.members.map((member, index) => (
                                    <div 
                                      key={index} 
                                      className="flex items-center gap-1 bg-muted rounded-md px-2 py-1"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-2 h-2 rounded-full" 
                                          style={{ backgroundColor: getRoleColor(member.role) }}
                                        />
                                        <span className="text-sm">{member.name}</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {getFunctionName(member.role)}
                                        </Badge>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 ml-1"
                                        onClick={() => handleRemoveMember(index)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {newPod.members.length === 0 && (
                              <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-muted-foreground/30 rounded-md">
                                No members added yet. Add members with their roles above.
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={closePodDialog}>Cancel</Button>
                          <Button onClick={handleSavePod} disabled={podValidation.isDuplicate}>
                            {editingPodId ? 'Save Changes' : 'Add Pod'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                {safePods.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recent Pods:</p>
                    <div className="space-y-1">
                      {safePods.slice(-3).map((pod) => (
                        <div key={pod.id} className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between">
                          <span className="truncate">{pod.name}</span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {getTeamName(pod.teamId)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {pod.members ? pod.members.length : 0} members
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    {safePods.length > 3 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => {
                          setDirectoryEntityType("pods");
                          setShowAllEntities(true);
                        }}
                      >
                        View all {safePods.length} pods →
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Function Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Puzzle className="h-5 w-5" />
                  Functions
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Maintain the shared directory of disciplines and roles
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{safeFunctions.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Active functions available for teams and pods
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDirectoryEntityType("functions");
                        setShowAllEntities(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                    <Dialog
                      open={isAddingFunction}
                      onOpenChange={(open) => {
                        if (!open) {
                          handleCloseFunctionDialog();
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFunctionDialog();
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Function
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{isEditingFunction ? 'Edit Function' : 'Add New Function'}</DialogTitle>
                          <DialogDescription>
                            {isEditingFunction
                              ? 'Update this function so pods and people stay aligned.'
                              : 'Keep functions in sync across people and pods'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="function-name">Function Name</Label>
                            <AutocompleteInput<OrgFunction>
                              inputId="function-name"
                              value={newFunction.name}
                              onChange={(value) => updateFunctionField('name', value)}
                              placeholder="e.g. Product, Engineering"
                              suggestions={functionSuggestions}
                              onSelect={handleFunctionSuggestionSelect}
                              validationState={functionValidation}
                            />
                            {functionErrors.name && (
                              <p className="mt-1 text-xs text-destructive">{functionErrors.name}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="function-description">Description (Optional)</Label>
                            <Textarea
                              id="function-description"
                              value={newFunction.description}
                              onChange={(e) => updateFunctionField('description', e.target.value)}
                              placeholder="How this function contributes to execution"
                            />
                          </div>
                          <div>
                            <Label htmlFor="function-color">Color</Label>
                            <div className="flex items-center gap-3">
                              <input
                                id="function-color"
                                type="color"
                                value={HEX_COLOR_PATTERN.test(newFunction.color) ? newFunction.color : '#3B82F6'}
                                onChange={(e) => updateFunctionField('color', e.target.value)}
                                className="h-10 w-12 rounded border border-input bg-background p-0"
                                aria-label="Function color"
                              />
                              <Input
                                value={newFunction.color}
                                onChange={(e) => updateFunctionField('color', e.target.value)}
                                placeholder="#3B82F6"
                                autoComplete="off"
                              />
                            </div>
                            {functionErrors.color && (
                              <p className="mt-1 text-xs text-destructive">{functionErrors.color}</p>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={handleCloseFunctionDialog}>Cancel</Button>
                            <Button onClick={handleSaveFunction} disabled={functionValidation.isDuplicate}>
                              {isEditingFunction ? 'Save Changes' : 'Add Function'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {recentFunctions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recent Functions:</p>
                    <div className="space-y-1">
                      {recentFunctions.map((fn) => (
                        <div key={fn.id} className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fn.color }} />
                            <span className="truncate">{fn.name}</span>
                          </div>
                          {fn.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {fn.description}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {safeFunctions.length > 3 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => {
                          setDirectoryEntityType("functions");
                          setShowAllEntities(true);
                        }}
                      >
                        View all {safeFunctions.length} functions →
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No functions yet. Add one to keep role assignments aligned.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* People Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  People
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage team members and their reporting structure
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{safePeople.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {safePeople.filter(p => p.managerId).length} with managers
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDirectoryEntityType("people");
                        setShowAllEntities(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                    <Dialog open={isAddingPerson} onOpenChange={(open) => {
                      if (!open) {
                        handleClosePersonDialog();
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button onClick={handleAddPersonClick}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingPersonId ? 'Edit Person' : 'Add New Person'}</DialogTitle>
                        <DialogDescription>
                          {editingPersonId
                            ? 'Update this person to keep reporting lines accurate.'
                            : 'Add a team member to your organization'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="person-name">Name</Label>
                          <AutocompleteInput<Person>
                            inputId="person-name"
                            value={newPerson.name}
                            onChange={(value) => setNewPerson(prev => ({ ...prev, name: value }))}
                            placeholder="Full name"
                            suggestions={personNameSuggestions}
                            onSelect={handlePersonNameSuggestionSelect}
                            validationState={personNameValidation}
                          />
                        </div>
                        <div>
                          <Label htmlFor="person-email">Email</Label>
                          <AutocompleteInput<Person>
                            inputId="person-email"
                            inputType="email"
                            value={newPerson.email}
                            onChange={(value) => setNewPerson(prev => ({ ...prev, email: value }))}
                            placeholder="email@company.com"
                            suggestions={[]}
                            validationState={personEmailValidation}
                          />
                        </div>
                      </div>
                        
                        {/* Native HTML select for Function */}
                        <div>
                          <Label htmlFor="person-function">Function</Label>
                          <select
                            id="person-function"
                            value={newPerson.functionId || defaultFunctionId}
                            onChange={(e) => setNewPerson(prev => ({ ...prev, functionId: e.target.value as FunctionType }))}
                            disabled={safeFunctions.length === 0}
                            className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {safeFunctions.length === 0 && (
                              <option value="">No functions available</option>
                            )}
                            {safeFunctions.map((fn) => (
                              <option key={fn.id} value={fn.id}>
                                {fn.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Native HTML select for Team */}
                        <div>
                          <Label htmlFor="person-team">Team</Label>
                          <select
                            id="person-team"
                            value={newPerson.teamId}
                            onChange={(e) => {
                              const value = e.target.value;
                              setNewPerson(prev => ({ ...prev, teamId: value, podId: '', managerId: '' }));
                              setManagerSearch('');
                            }}
                            className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select a team</option>
                            {safeTeams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Native HTML select for Pod (conditional) */}
                        {newPerson.teamId && (
                          <div>
                            <Label htmlFor="person-pod">Pod (Optional)</Label>
                            <select
                              id="person-pod"
                              value={newPerson.podId || ""}
                              onChange={(e) => setNewPerson(prev => ({ ...prev, podId: e.target.value }))}
                              className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">No Pod</option>
                              {getPodsForTeam(newPerson.teamId).map((pod) => (
                                <option key={pod.id} value={pod.id}>
                                  {pod.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        {/* Native HTML select for Manager */}
                        <div>
                          <Label htmlFor="person-manager">Manager (Optional)</Label>
                          <AutocompleteInput<Person>
                            inputId="person-manager"
                            value={managerSearch || (newPerson.managerId ? safePeople.find(p => p.id === newPerson.managerId)?.name || '' : '')}
                            onChange={(value) => {
                              setManagerSearch(value);
                              if (!value) {
                                setNewPerson(prev => ({ ...prev, managerId: '' }));
                              } else {
                                // Auto-select if exact match
                                const exactMatch = safePeople.find(p =>
                                  p.name.toLowerCase() === value.toLowerCase()
                                );
                                if (exactMatch) {
                                  setNewPerson(prev => ({ ...prev, managerId: exactMatch.id }));
                                }
                              }
                            }}
                            placeholder="Start typing to find a manager"
                            suggestions={managerSuggestions}
                            onSelect={handleManagerSuggestionSelect}
                            emptyStateMessage="No matching managers found"
                            emptyStateAction={managerSearch.trim() ? {
                              label: `Add "${managerSearch.trim()}" as new manager`,
                              onAction: handleCreateQuickManager,
                              icon: <Plus className="h-4 w-4" />
                            } : undefined}
                            disabled={isCreatingQuickManager}
                            minimalMode={true}
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {newPerson.managerId
                              ? `✓ Manager selected: ${safePeople.find(p => p.id === newPerson.managerId)?.name}`
                              : 'Leave blank if this person reports directly to leadership.'}
                          </p>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={handleClosePersonDialog}>Cancel</Button>
                          <Button onClick={handleSavePerson} disabled={personEmailValidation.isDuplicate}>
                            {editingPersonId ? 'Save Changes' : 'Add Person'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                {safePeople.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recent People:</p>
                    <div className="space-y-1">
                      {safePeople.slice(-3).map((person) => (
                        <div key={person.id} className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getRoleColor(person.functionId) }}
                            />
                            <span className="truncate">{person.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {getTeamName(person.teamId)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {getFunctionName(person.functionId)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    {safePeople.length > 3 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => {
                          setDirectoryEntityType("people");
                          setShowAllEntities(true);
                        }}
                      >
                        View all {safePeople.length} people →
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Dialogs moved outside of Collapsible so they work when collapsed */}
      <Dialog open={isAddingTeam} onOpenChange={(open) => {
        if (!open) {
          closeTeamDialog();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeamId ? 'Edit Team' : 'Add New Team'}</DialogTitle>
            <DialogDescription>
              {editingTeamId
                ? 'Update team details to keep pods and people aligned.'
                : 'Create a new team in your organization'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-name">Team Name</Label>
              <AutocompleteInput<Team>
                inputId="team-name"
                value={newTeam.name}
                onChange={(value) => {
                  setNewTeam(prev => ({ ...prev, name: value }));
                  if (teamError) {
                    setTeamError(null);
                  }
                }}
                placeholder="e.g. Product, Engineering, Marketing"
                suggestions={teamSuggestions}
                onSelect={handleTeamSuggestionSelect}
                validationState={teamValidation}
              />
              {teamError && (
                <p className="text-sm text-destructive mt-1">{teamError}</p>
              )}
            </div>
            <div>
              <Label htmlFor="team-description">Description</Label>
              <Textarea
                id="team-description"
                value={newTeam.description}
                onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the team's responsibilities"
              />
            </div>
            <div>
              <Label htmlFor="team-color">Team Color</Label>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: newTeam.color }} />
                <Select value={newTeam.color} onValueChange={(value) => setNewTeam(prev => ({ ...prev, color: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team color" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        {color.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeTeamDialog}>Cancel</Button>
              <Button onClick={handleSaveTeam} disabled={teamValidation.isDuplicate}>
                {editingTeamId ? 'Save Changes' : 'Add Team'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Pod Dialog */}
      <Dialog open={isAddingPod} onOpenChange={(open) => {
        if (!open) {
          closePodDialog();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPodId ? 'Edit Pod' : 'Add New Pod'}</DialogTitle>
            <DialogDescription>
              {editingPodId
                ? 'Update pod membership and details for this team.'
                : 'Create a new pod within a team'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pod-team">Team</Label>
              <Select
                value={newPod.teamId}
                onValueChange={(value) => {
                  setNewPod(prev => ({ ...prev, teamId: value }));
                  setPodValidation({ isDuplicate: false, similarEntities: [] });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {safeTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pod-name">Pod Name</Label>
              <AutocompleteInput<Pod>
                inputId="pod-name"
                value={newPod.name}
                onChange={(value) => setNewPod(prev => ({ ...prev, name: value }))}
                placeholder="e.g. Core Product, Growth, Platform"
                suggestions={newPod.teamId ? podSuggestions : []}
                onSelect={handlePodSuggestionSelect}
                validationState={newPod.teamId ? podValidation : undefined}
                disabled={!newPod.teamId}
              />
            </div>
            <div>
              <Label htmlFor="pod-description">Description</Label>
              <Textarea
                id="pod-description"
                value={newPod.description}
                onChange={(e) => setNewPod(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the pod's focus"
              />
            </div>
            <div>
              <Label>Team Members</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <AutocompleteInput<Person>
                      value={currentMember.name}
                      onChange={(value) => setCurrentMember(prev => ({ ...prev, name: value }))}
                      placeholder="Member name"
                      suggestions={podMemberSuggestions}
                      onSelect={handleMemberSuggestionSelect}
                      onSubmit={() => handleAddMember()}
                    />
                  </div>
                  <div className="w-32">
                    <Select
                      value={currentMember.role || defaultFunctionId}
                      onValueChange={(value) => setCurrentMember(prev => ({ ...prev, role: value as FunctionType }))}
                      disabled={safeFunctions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeFunctions.length === 0 && (
                          <SelectItem value="" disabled>
                            No functions available
                          </SelectItem>
                        )}
                        {safeFunctions.map((fn) => (
                          <SelectItem key={fn.id} value={fn.id}>
                            {fn.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!currentMember.name.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {newPod.members.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Added members:</div>
                    <div className="flex flex-wrap gap-2">
                      {newPod.members.map((member, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-muted rounded-md px-2 py-1"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getRoleColor(member.role) }}
                            />
                            <span className="text-sm">{member.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {getFunctionName(member.role)}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => handleRemoveMember(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {newPod.members.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-muted-foreground/30 rounded-md">
                    No members added yet. Add members with their roles above.
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closePodDialog}>Cancel</Button>
              <Button onClick={handleSavePod} disabled={podValidation.isDuplicate}>
                {editingPodId ? 'Save Changes' : 'Add Pod'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Function Dialog */}
      <Dialog
        open={isAddingFunction}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseFunctionDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingFunction ? 'Edit Function' : 'Add New Function'}</DialogTitle>
            <DialogDescription>
              {isEditingFunction
                ? 'Update this function so pods and people stay aligned.'
                : 'Keep functions in sync across people and pods'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="function-name-2">Function Name</Label>
              <AutocompleteInput<OrgFunction>
                inputId="function-name-2"
                value={newFunction.name}
                onChange={(value) => updateFunctionField('name', value)}
                placeholder="e.g. Product, Engineering"
                suggestions={functionSuggestions}
                onSelect={handleFunctionSuggestionSelect}
                validationState={functionValidation}
              />
              {functionErrors.name && (
                <p className="mt-1 text-xs text-destructive">{functionErrors.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="function-description-2">Description (Optional)</Label>
              <Textarea
                id="function-description-2"
                value={newFunction.description}
                onChange={(e) => updateFunctionField('description', e.target.value)}
                placeholder="How this function contributes to execution"
              />
            </div>
            <div>
              <Label htmlFor="function-color-2">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="function-color-2"
                  type="color"
                  value={HEX_COLOR_PATTERN.test(newFunction.color) ? newFunction.color : '#3B82F6'}
                  onChange={(e) => updateFunctionField('color', e.target.value)}
                  className="h-10 w-12 rounded border border-input bg-background p-0"
                  aria-label="Function color"
                />
                <Input
                  value={newFunction.color}
                  onChange={(e) => updateFunctionField('color', e.target.value)}
                  placeholder="#3B82F6"
                  autoComplete="off"
                />
              </div>
              {functionErrors.color && (
                <p className="mt-1 text-xs text-destructive">{functionErrors.color}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseFunctionDialog}>Cancel</Button>
              <Button onClick={handleSaveFunction} disabled={functionValidation.isDuplicate}>
                {isEditingFunction ? 'Save Changes' : 'Add Function'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Person Dialog */}
      <Dialog open={isAddingPerson} onOpenChange={(open) => {
        if (!open) {
          handleClosePersonDialog();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPersonId ? 'Edit Person' : 'Add New Person'}</DialogTitle>
            <DialogDescription>
              {editingPersonId
                ? 'Update this person to keep reporting lines accurate.'
                : 'Add a team member to your organization'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="person-name">Name</Label>
                <AutocompleteInput<Person>
                  inputId="person-name"
                  value={newPerson.name}
                  onChange={(value) => setNewPerson(prev => ({ ...prev, name: value }))}
                  placeholder="Full name"
                  suggestions={personNameSuggestions}
                  onSelect={handlePersonNameSuggestionSelect}
                  validationState={personNameValidation}
                />
              </div>
              <div>
                <Label htmlFor="person-email">Email</Label>
                <AutocompleteInput<Person>
                  inputId="person-email"
                  inputType="email"
                  value={newPerson.email}
                  onChange={(value) => setNewPerson(prev => ({ ...prev, email: value }))}
                  placeholder="email@company.com"
                  suggestions={[]}
                  validationState={personEmailValidation}
                />
              </div>
            </div>

            {/* Native HTML select for Function */}
            <div>
              <Label htmlFor="person-function">Function</Label>
              <select
                id="person-function"
                value={newPerson.functionId || defaultFunctionId}
                onChange={(e) => setNewPerson(prev => ({ ...prev, functionId: e.target.value as FunctionType }))}
                disabled={safeFunctions.length === 0}
                className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {safeFunctions.length === 0 && (
                  <option value="">No functions available</option>
                )}
                {safeFunctions.map((fn) => (
                  <option key={fn.id} value={fn.id}>
                    {fn.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Native HTML select for Team */}
            <div>
              <Label htmlFor="person-team">Team</Label>
              <select
                id="person-team"
                value={newPerson.teamId}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewPerson(prev => ({ ...prev, teamId: value, podId: '', managerId: '' }));
                  setManagerSearch('');
                }}
                className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a team</option>
                {safeTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Native HTML select for Pod (conditional) */}
            {newPerson.teamId && (
              <div>
                <Label htmlFor="person-pod">Pod (Optional)</Label>
                <select
                  id="person-pod"
                  value={newPerson.podId || ""}
                  onChange={(e) => setNewPerson(prev => ({ ...prev, podId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">No Pod</option>
                  {getPodsForTeam(newPerson.teamId).map((pod) => (
                    <option key={pod.id} value={pod.id}>
                      {pod.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Native HTML select for Manager */}
            <div>
              <Label htmlFor="person-manager">Manager (Optional)</Label>
                <AutocompleteInput<Person>
                  inputId="person-manager"
                  value={managerSearch || (newPerson.managerId ? safePeople.find(p => p.id === newPerson.managerId)?.name || '' : '')}
                  onChange={(value) => {
                    setManagerSearch(value);
                    if (!value) {
                      setNewPerson(prev => ({ ...prev, managerId: '' }));
                    } else {
                      // Auto-select if exact match
                      const exactMatch = safePeople.find(p =>
                        p.name.toLowerCase() === value.toLowerCase()
                      );
                      if (exactMatch) {
                        setNewPerson(prev => ({ ...prev, managerId: exactMatch.id }));
                      }
                    }
                  }}
                  placeholder="Start typing to find a manager"
                  suggestions={managerSuggestions}
                  onSelect={handleManagerSuggestionSelect}
                  emptyStateMessage="No matching managers found"
                  emptyStateAction={managerSearch.trim() ? {
                    label: `Add "${managerSearch.trim()}" as new manager`,
                    onAction: handleCreateQuickManager,
                    icon: <Plus className="h-4 w-4" />
                  } : undefined}
                  disabled={isCreatingQuickManager}
                  minimalMode={true}
                />
              <p className="mt-1 text-xs text-muted-foreground">
                {newPerson.managerId
                  ? `✓ Manager selected: ${safePeople.find(p => p.id === newPerson.managerId)?.name}`
                  : 'Leave blank if this person reports directly to leadership.'}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClosePersonDialog}>Cancel</Button>
              <Button onClick={handleSavePerson} disabled={personEmailValidation.isDuplicate}>
                {editingPersonId ? 'Save Changes' : 'Add Person'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* All Entities View Dialog */}
      <AllEntitiesView
        open={showAllEntities}
        onOpenChange={setShowAllEntities}
        teams={safeTeams}
        pods={safePods}
        people={safePeople}
        functions={safeFunctions}
        entityType={directoryEntityType}
        onAddTeam={() => {
          setShowAllEntities(false);
          openTeamDialog();
        }}
        onAddPod={() => {
          setShowAllEntities(false);
          openPodDialog();
        }}
        onAddPerson={() => {
          setShowAllEntities(false);
          openPersonDialog();
        }}
        onAddFunction={() => {
          setShowAllEntities(false);
          openFunctionDialog();
        }}
        onEditTeam={(team) => {
          setShowAllEntities(false);
          openTeamDialog(team);
        }}
        onEditPod={(pod) => {
          setShowAllEntities(false);
          openPodDialog(pod);
        }}
        onEditPerson={(person) => {
          setShowAllEntities(false);
          openPersonDialog(person);
        }}
        onEditFunction={(func) => {
          setShowAllEntities(false);
          openFunctionDialog(func);
        }}
        onDeleteTeam={handleDeleteTeam}
        onDeletePod={handleDeletePod}
        onDeletePerson={handleDeletePerson}
        onDeleteFunction={handleDeleteFunction}
      />
    </Card>
  );
}
