import type { OrgFunction, Person, Pod, Team } from "../types";

/**
 * Normalize user-provided strings into a consistent format for comparison.
 * - lowercases
 * - trims whitespace
 * - removes diacritic marks
 * - strips non-alphanumeric characters
 */
export const normalizeString = (value: string): string => {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

/**
 * Normalize email values for duplicate detection.
 */
export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j < cols; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[rows - 1][cols - 1];
};

/**
 * Return a similarity score between 0 and 1, where 1 is an exact match.
 */
export const calculateSimilarity = (a: string, b: string): number => {
  const normalizedA = normalizeString(a);
  const normalizedB = normalizeString(b);

  if (!normalizedA && !normalizedB) {
    return 1;
  }

  if (!normalizedA || !normalizedB) {
    return 0;
  }

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);

  if (maxLength === 0) {
    return 1;
  }

  return 1 - distance / maxLength;
};

export const findSimilarEntities = <T extends { name: string }>(
  entities: T[],
  query: string,
  threshold = 0.7
): T[] => {
  const normalized = normalizeString(query);

  if (!normalized) {
    return [];
  }

  return entities
    .filter((entity) => Boolean(entity?.name))
    .map((entity) => ({
      entity,
      similarity: calculateSimilarity(normalized, normalizeString(entity.name)),
    }))
    .filter(({ similarity }) => similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .map(({ entity }) => entity);
};

export const checkDuplicate = (
  entities: Array<{ name: string; id?: string }>,
  name: string,
  excludeId?: string
): boolean => {
  const normalized = normalizeString(name);

  if (!normalized) {
    return false;
  }

  return entities.some((entity) =>
    entity.id !== excludeId && normalizeString(entity.name) === normalized
  );
};

/**
 * Convenience helpers for frequently used entity comparisons.
 */
export const findSimilarTeams = (teams: Team[], name: string, threshold?: number) =>
  findSimilarEntities(teams, name, threshold);

export const findSimilarPods = (pods: Pod[], name: string, threshold?: number) =>
  findSimilarEntities(pods, name, threshold);

export const findSimilarFunctions = (functions: OrgFunction[], name: string, threshold?: number) =>
  findSimilarEntities(functions, name, threshold);

export const findSimilarPeople = (people: Person[], name: string, threshold?: number) =>
  findSimilarEntities(people, name, threshold);
