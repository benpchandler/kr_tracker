import { Initiative, KR, Person, Pod, Team } from "../types";

export interface TeamNormalizationOptions {
  teams: Team[];
  pods?: Pod[];
  people?: Person[];
  krs?: KR[];
  initiatives?: Initiative[];
}

export interface TeamNormalizationResult {
  teams: Team[];
  pods: Pod[];
  people: Person[];
  krs: KR[];
  initiatives: Initiative[];
  teamIdMap: Record<string, string>;
}

export const normalizeTeamName = (name: string): string => name.trim().toLowerCase();

const sanitizeColor = (color?: string): string => (color && color.trim() ? color : "#3B82F6");

export function enforceUniqueTeamData(options: TeamNormalizationOptions): TeamNormalizationResult {
  const { teams, pods = [], people = [], krs = [], initiatives = [] } = options;

  const canonicalTeams: Team[] = [];
  const nameToIndex = new Map<string, number>();
  const teamIdMap: Record<string, string> = {};

  teams.forEach((team) => {
    if (!team) {
      return;
    }

    const id = team.id?.trim();
    const name = team.name?.trim();
    if (!id || !name) {
      return;
    }

    const normalizedName = normalizeTeamName(name);

    if (!nameToIndex.has(normalizedName)) {
      const sanitizedTeam: Team = {
        ...team,
        id,
        name,
        color: sanitizeColor(team.color),
        description: team.description?.trim() || team.description,
      };

      nameToIndex.set(normalizedName, canonicalTeams.length);
      canonicalTeams.push(sanitizedTeam);
      teamIdMap[id] = id;
      return;
    }

    const index = nameToIndex.get(normalizedName)!;
    const existing = canonicalTeams[index];
    const merged: Team = {
      ...existing,
      description: existing.description || team.description,
      color: existing.color || sanitizeColor(team.color),
    };

    canonicalTeams[index] = merged;
    teamIdMap[id] = existing.id;
  });

  canonicalTeams.forEach((team) => {
    if (!teamIdMap[team.id]) {
      teamIdMap[team.id] = team.id;
    }
  });

  const fallbackTeamId = canonicalTeams[0]?.id;
  const remapTeamId = (teamId?: string): string | undefined => {
    if (!teamId) {
      return fallbackTeamId;
    }

    const trimmed = teamId.trim();
    if (!trimmed) {
      return fallbackTeamId;
    }

    return teamIdMap[trimmed] || fallbackTeamId || trimmed;
  };

  const validTeamIds = new Set(canonicalTeams.map((team) => team.id));

  const normalizePods: Pod[] = pods
    .map((pod) => {
      const nextTeamId = remapTeamId(pod.teamId);
      if (!nextTeamId || !validTeamIds.has(nextTeamId)) {
        return null;
      }
      return {
        ...pod,
        teamId: nextTeamId,
      };
    })
    .filter((pod): pod is Pod => pod !== null);

  const normalizePeople: Person[] = people
    .map((person) => {
      const nextTeamId = remapTeamId(person.teamId);
      if (!nextTeamId) {
        return null;
      }
      return {
        ...person,
        teamId: nextTeamId,
      };
    })
    .filter((person): person is Person => person !== null);

  const normalizeKRs: KR[] = krs.map((kr) => {
    const primaryTeamId = remapTeamId(kr.teamId);
    const mappedTeamIds = kr.teamIds?.map(remapTeamId).filter((id): id is string => Boolean(id));

    return {
      ...kr,
      teamId: primaryTeamId ?? kr.teamId,
      teamIds: mappedTeamIds && mappedTeamIds.length > 0 ? Array.from(new Set(mappedTeamIds)) : kr.teamIds,
    };
  });

  const normalizeInitiatives: Initiative[] = initiatives.map((initiative) => ({
    ...initiative,
    teamId: remapTeamId(initiative.teamId) ?? initiative.teamId,
  }));

  return {
    teams: canonicalTeams,
    pods: normalizePods,
    people: normalizePeople,
    krs: normalizeKRs,
    initiatives: normalizeInitiatives,
    teamIdMap,
  };
}
