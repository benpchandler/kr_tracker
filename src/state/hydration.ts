import { AppMode, Team, Pod, Quarter, KR, Initiative, ViewType, FilterOptions, Person, OrgFunction, Organization, Objective } from "../types";
import { mockFunctions, mockOrganizations } from "../data/mockData";
import { logger } from "../utils/logger";

export const LOCAL_STORAGE_KEY = "kr-tracker-state-v4";
const LEGACY_STORAGE_KEYS = ["kr-tracker-state-v3"];
const STORAGE_KEYS = [LOCAL_STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

type SanitizationEntity = "functions" | "organizations" | "objectives" | "people" | "initiatives" | "ui" | "state";
type SanitizationKind = "discarded" | "defaulted";

export type SanitizationWarning = {
  entity: SanitizationEntity;
  type: SanitizationKind;
  message: string;
  details?: Record<string, unknown>;
};

export type HydrationDiagnostics = {
  warnings: SanitizationWarning[];
  counts: Record<string, number>;
};

interface DiagnosticsCollector {
  record: (entity: SanitizationEntity, type: SanitizationKind, message: string, details?: Record<string, unknown>) => void;
  snapshot: () => HydrationDiagnostics;
}

const createDiagnosticsCollector = (): DiagnosticsCollector => {
  const warnings: SanitizationWarning[] = [];
  const counts: Record<string, number> = {};

  return {
    record(entity, type, message, details) {
      warnings.push({ entity, type, message, details });
      const key = `${entity}:${type}`;
      counts[key] = (counts[key] ?? 0) + 1;
    },
    snapshot() {
      return {
        warnings: [...warnings],
        counts: { ...counts },
      };
    },
  };
};

const recordDefault = (
  diagnostics: DiagnosticsCollector,
  entity: SanitizationEntity,
  message: string,
  details?: Record<string, unknown>,
) => {
  diagnostics.record(entity, "defaulted", message, details);
};

const recordDiscard = (
  diagnostics: DiagnosticsCollector,
  entity: SanitizationEntity,
  message: string,
  details?: Record<string, unknown>,
) => {
  diagnostics.record(entity, "discarded", message, details);
};

const sanitizeMode = (value: any, diagnostics: DiagnosticsCollector): AppMode => {
  if (value === "execution" || value === "analysis" || value === "plan") {
    return value;
  }

  if (value !== undefined) {
    recordDefault(diagnostics, "ui", "Mode defaulted to plan", { provided: value });
  }

  return "plan";
};

const sanitizeViewType = (value: any, diagnostics: DiagnosticsCollector): ViewType => {
  if (value === "table" || value === "spreadsheet" || value === "cards") {
    return value;
  }

  if (value !== undefined) {
    recordDefault(diagnostics, "ui", "View type defaulted to cards", { provided: value });
  }

  return "cards";
};

const sanitizeTab = (value: any, diagnostics: DiagnosticsCollector): "krs" | "initiatives" => {
  if (value === "initiatives" || value === "krs") {
    return value;
  }

  if (value !== undefined) {
    recordDefault(diagnostics, "ui", "Tab defaulted to \"krs\"", { provided: value });
  }

  return "krs";
};

const sanitizeFilters = (value: any, diagnostics: DiagnosticsCollector): FilterOptions => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as FilterOptions;
  }

  if (value !== undefined) {
    recordDefault(diagnostics, "ui", "Advanced filters reset to empty object", { receivedType: typeof value });
  }

  return {};
};

const sanitizeBoolean = (
  value: any,
  fallback: boolean,
  diagnostics: DiagnosticsCollector,
  field: string,
): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value !== undefined) {
    recordDefault(diagnostics, "ui", `Boolean flag "${field}" defaulted`, { provided: value, fallback });
  }

  return fallback;
};

export const cloneOrgFunctions = (functions: OrgFunction[]): OrgFunction[] => functions.map(fn => ({ ...fn }));

const sanitizeFunctions = (value: any, diagnostics: DiagnosticsCollector): OrgFunction[] => {
  if (!Array.isArray(value)) {
    if (value !== undefined) {
      recordDiscard(diagnostics, "functions", "Functions list replaced because persisted value was not an array", {
        receivedType: typeof value,
      });
    }
    return [];
  }

  return value
    .map((fn, index) => {
      if (!fn || typeof fn !== "object") {
        recordDiscard(diagnostics, "functions", "Function entry discarded because it was not an object", { index });
        return null;
      }

      const candidate = fn as Record<string, unknown>;

      const rawId = typeof candidate.id === "string" ? candidate.id.trim() : "";
      const id = rawId || `function-${index}`;
      if (!rawId) {
        recordDefault(diagnostics, "functions", "Generated fallback id for function entry", { index, fallback: id });
      }

      const rawName = typeof candidate.name === "string" ? candidate.name.trim() : "";
      const name = rawName || id;
      if (!rawName) {
        recordDefault(diagnostics, "functions", "Function name defaulted to id", { id });
      }

      const description = typeof candidate.description === "string" && candidate.description.trim()
        ? candidate.description.trim()
        : undefined;

      const rawColor = typeof candidate.color === "string" ? candidate.color.trim() : "";
      const color = rawColor || "#6B7280";
      if (!rawColor) {
        recordDefault(diagnostics, "functions", "Function color defaulted", { id, fallback: color });
      }

      const rawCreatedAt = typeof candidate.createdAt === "string" ? candidate.createdAt.trim() : "";
      const createdAt = rawCreatedAt || new Date().toISOString();
      if (!rawCreatedAt) {
        recordDefault(diagnostics, "functions", "Function createdAt defaulted to now", { id });
      }

      return { id, name, description, color, createdAt } satisfies OrgFunction;
    })
    .filter((fn): fn is OrgFunction => fn !== null);
};

const sanitizeOrganizations = (value: any, diagnostics: DiagnosticsCollector): Organization[] => {
  if (!Array.isArray(value)) {
    if (value !== undefined) {
      recordDiscard(diagnostics, "organizations", "Organizations replaced because persisted value was not an array", {
        receivedType: typeof value,
      });
    }
    return [];
  }

  return value
    .map((org, index) => {
      if (!org || typeof org !== "object") {
        recordDiscard(diagnostics, "organizations", "Organization entry discarded because it was not an object", { index });
        return null;
      }

      const candidate = org as Record<string, unknown>;
      const rawId = typeof candidate.id === "string" ? candidate.id.trim() : "";
      const id = rawId || `org-${index}`;
      if (!rawId) {
        recordDefault(diagnostics, "organizations", "Generated fallback id for organization", { index, fallback: id });
      }

      const rawName = typeof candidate.name === "string" ? candidate.name.trim() : "";
      if (!rawName) {
        recordDiscard(diagnostics, "organizations", "Organization discarded because it was missing a name", { id });
        return null;
      }

      return {
        id,
        name: rawName,
        description: typeof candidate.description === "string" ? candidate.description.trim() : undefined,
        industry: typeof candidate.industry === "string" ? candidate.industry.trim() : undefined,
        headquarters: typeof candidate.headquarters === "string" ? candidate.headquarters.trim() : undefined,
      } satisfies Organization;
    })
    .filter((org): org is Organization => org !== null);
};

const sanitizeObjectives = (
  value: any,
  fallbackOrgId: string | undefined,
  diagnostics: DiagnosticsCollector,
): Objective[] => {
  if (!Array.isArray(value)) {
    if (value !== undefined) {
      recordDiscard(diagnostics, "objectives", "Objectives replaced because persisted value was not an array", {
        receivedType: typeof value,
      });
    }
    return [];
  }

  return value
    .map((obj, index) => {
      if (!obj || typeof obj !== "object") {
        recordDiscard(diagnostics, "objectives", "Objective discarded because it was not an object", { index });
        return null;
      }

      const candidate = obj as Record<string, unknown>;
      const rawId = typeof candidate.id === "string" ? candidate.id.trim() : "";
      const id = rawId || `obj-${index}`;
      if (!rawId) {
        recordDefault(diagnostics, "objectives", "Generated fallback id for objective", { index, fallback: id });
      }

      const rawTitle = typeof candidate.title === "string" && candidate.title.trim()
        ? candidate.title.trim()
        : typeof candidate.name === "string" && candidate.name.trim()
          ? candidate.name.trim()
          : "";
      if (!rawTitle) {
        recordDiscard(diagnostics, "objectives", "Objective discarded because it was missing a title", { id });
        return null;
      }

      const organizationIdCandidate = typeof candidate.organizationId === "string" && candidate.organizationId.trim()
        ? candidate.organizationId.trim()
        : fallbackOrgId;

      if (!organizationIdCandidate) {
        recordDiscard(diagnostics, "objectives", "Objective discarded because organizationId was missing", { id });
        return null;
      }

      const krIds: string[] = [];
      if (Array.isArray(candidate.krIds)) {
        for (const item of candidate.krIds) {
          if (typeof item === "string") {
            const trimmed = item.trim();
            if (trimmed) {
              krIds.push(trimmed);
            }
          } else {
            recordDiscard(diagnostics, "objectives", "Objective krIds entry discarded because it was not a string", { id });
          }
        }
      }

      const status =
        candidate.status === "draft" ||
        candidate.status === "active" ||
        candidate.status === "paused" ||
        candidate.status === "completed"
          ? candidate.status
          : undefined;
      if (!status && candidate.status !== undefined) {
        recordDefault(diagnostics, "objectives", "Objective status defaulted because value was invalid", { id, provided: candidate.status });
      }

      return {
        id,
        organizationId: organizationIdCandidate,
        title: rawTitle,
        description: typeof candidate.description === "string" ? candidate.description.trim() : undefined,
        owner: typeof candidate.owner === "string" ? candidate.owner.trim() : undefined,
        teamId: typeof candidate.teamId === "string" ? candidate.teamId.trim() : undefined,
        podId: typeof candidate.podId === "string" ? candidate.podId.trim() : undefined,
        status,
        krIds,
      } satisfies Objective;
    })
    .filter((objective): objective is Objective => objective !== null);
};

const sanitizePeople = (
  value: any,
  functionsList: OrgFunction[],
  diagnostics: DiagnosticsCollector,
): Person[] => {
  if (!Array.isArray(value)) {
    if (value !== undefined) {
      recordDiscard(diagnostics, "people", "People replaced because persisted value was not an array", {
        receivedType: typeof value,
      });
    }
    return [];
  }

  const fallbackFunctionId = functionsList[0]?.id || "Product";
  const validFunctionIds = new Set(functionsList.map((fn) => fn.id));

  return value
    .map((person, index) => {
      if (!person || typeof person !== "object") {
        recordDiscard(diagnostics, "people", "Person discarded because it was not an object", { index });
        return null;
      }

      const candidate = person as Record<string, unknown>;
      const rawId = typeof candidate.id === "string" ? candidate.id.trim() : "";
      const id = rawId || `person-${index}`;
      if (!rawId) {
        recordDefault(diagnostics, "people", "Generated fallback id for person", { index, fallback: id });
      }

      const rawName = typeof candidate.name === "string" ? candidate.name.trim() : "";
      if (!rawName) {
        recordDiscard(diagnostics, "people", "Person discarded because it was missing a name", { id });
        return null;
      }

      const rawEmail = typeof candidate.email === "string" ? candidate.email.trim() : "";
      const email = rawEmail || `${id}@company.com`;
      if (!rawEmail) {
        recordDefault(diagnostics, "people", "Person email defaulted", { id, fallback: email });
      }

      const rawFunctionId = typeof candidate.functionId === "string" ? candidate.functionId.trim() : "";
      const legacyFunctionId = typeof candidate.function === "string" ? candidate.function.trim() : "";
      let functionId = rawFunctionId || legacyFunctionId;
      if (!functionId) {
        functionId = fallbackFunctionId;
        recordDefault(diagnostics, "people", "Person functionId defaulted to fallback", { id, fallback: functionId, reason: "missing" });
      } else if (validFunctionIds.size > 0 && !validFunctionIds.has(functionId)) {
        recordDefault(diagnostics, "people", "Person functionId defaulted to fallback", {
          id,
          fallback: fallbackFunctionId,
          provided: functionId,
          reason: "invalid",
        });
        functionId = fallbackFunctionId;
      }

      const joinDate = typeof candidate.joinDate === "string" && candidate.joinDate.trim()
        ? candidate.joinDate.trim()
        : new Date().toISOString().split("T")[0];
      if (joinDate !== candidate.joinDate) {
        recordDefault(diagnostics, "people", "Person joinDate defaulted to today", { id });
      }

      const active = typeof candidate.active === "boolean" ? candidate.active : true;
      if (active !== candidate.active) {
        recordDefault(diagnostics, "people", "Person active flag defaulted to true", { id });
      }

      return {
        id,
        name: rawName,
        email,
        functionId,
        managerId: typeof candidate.managerId === "string" ? candidate.managerId.trim() : undefined,
        teamId: typeof candidate.teamId === "string" ? candidate.teamId.trim() : "",
        podId: typeof candidate.podId === "string" ? candidate.podId.trim() : undefined,
        joinDate,
        active,
      } satisfies Person;
    })
    .filter((person): person is Person => person !== null);
};

const sanitizeInitiatives = (value: any, diagnostics: DiagnosticsCollector): Initiative[] => {
  if (!Array.isArray(value)) {
    if (value !== undefined) {
      recordDiscard(diagnostics, "initiatives", "Initiatives replaced because persisted value was not an array", {
        receivedType: typeof value,
      });
    }
    return [];
  }

  return value
    .filter((init) => {
      if (!init || typeof init !== "object") {
        recordDiscard(diagnostics, "initiatives", "Initiative discarded because it was not an object", {});
        return false;
      }
      return true;
    })
    .map((init: any) => ({
      ...init,
      linkedKRIds: Array.isArray(init.linkedKRIds) ? init.linkedKRIds : [],
    }))
    .map((init) => {
      if (!Array.isArray(init.linkedKRIds) || init.linkedKRIds.length === 0) {
        recordDefault(diagnostics, "initiatives", "Initiative linkedKRIds defaulted to empty array", {
          id: typeof init.id === "string" ? init.id : undefined,
        });
        return { ...init, linkedKRIds: [] };
      }

      return init;
    });
};

export type PersistedAppState = {
  mode: AppMode;
  organizations: Organization[];
  teams: Team[];
  pods: Pod[];
  people: Person[];
  functions: OrgFunction[];
  quarters: Quarter[];
  objectives: Objective[];
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

export const loadPersistedState = (): { state: PersistedAppState; diagnostics: HydrationDiagnostics } | null => {
  if (typeof window === "undefined") return null;

  for (const key of STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    const diagnostics = createDiagnosticsCollector();

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        recordDiscard(diagnostics, "state", "Persisted payload ignored because it was not an object", { key });
        continue;
      }

      const sanitizedInitiatives = sanitizeInitiatives(parsed.initiatives, diagnostics);
      const sanitizedFunctions = sanitizeFunctions(parsed.functions, diagnostics);
      const functions = sanitizedFunctions.length > 0 ? sanitizedFunctions : cloneOrgFunctions(mockFunctions);
      if (sanitizedFunctions.length === 0) {
        recordDefault(diagnostics, "functions", "Fell back to default function catalog", { source: "mockFunctions" });
      }

      const sanitizedPeople = sanitizePeople(parsed.people, functions, diagnostics);
      const organizations = sanitizeOrganizations(parsed.organizations, diagnostics);
      const fallbackOrgId = organizations[0]?.id ?? mockOrganizations[0]?.id;
      if (!organizations.length && fallbackOrgId) {
        recordDefault(diagnostics, "organizations", "Using fallback organization id for objectives", { fallbackOrgId });
      }
      const objectives = sanitizeObjectives(parsed.objectives, fallbackOrgId, diagnostics);

      const coerceArray = <T,>(candidate: any, label: string): T[] => {
        if (Array.isArray(candidate)) {
          return candidate;
        }
        if (candidate !== undefined) {
          recordDefault(diagnostics, "state", `${label} defaulted to empty array`, { receivedType: typeof candidate });
        }
        return [];
      };

      const teams = coerceArray<Team>(parsed.teams, "Teams list");
      const pods = coerceArray<Pod>(parsed.pods, "Pods list");
      const quarters = coerceArray<Quarter>(parsed.quarters, "Quarters list");
      const krs = coerceArray<KR>(parsed.krs, "KRs list");

      const selectedTeam = typeof parsed.ui?.selectedTeam === "string" ? parsed.ui.selectedTeam : "all";
      if (selectedTeam !== parsed.ui?.selectedTeam && parsed.ui?.selectedTeam !== undefined) {
        recordDefault(diagnostics, "ui", "Selected team defaulted to \"all\"", { provided: parsed.ui?.selectedTeam });
      }

      const selectedQuarter = typeof parsed.ui?.selectedQuarter === "string" ? parsed.ui.selectedQuarter : "q4-2024";
      if (selectedQuarter !== parsed.ui?.selectedQuarter && parsed.ui?.selectedQuarter !== undefined) {
        recordDefault(diagnostics, "ui", "Selected quarter defaulted to \"q4-2024\"", { provided: parsed.ui?.selectedQuarter });
      }

      const sanitizedState: PersistedAppState = {
        mode: sanitizeMode(parsed.mode, diagnostics),
        organizations,
        teams,
        pods,
        people: sanitizedPeople,
        functions,
        quarters,
        objectives,
        krs,
        initiatives: sanitizedInitiatives,
        ui: {
          selectedTeam,
          selectedQuarter,
          viewType: sanitizeViewType(parsed.ui?.viewType, diagnostics),
          advancedFilters: sanitizeFilters(parsed.ui?.advancedFilters, diagnostics),
          currentTab: sanitizeTab(parsed.ui?.currentTab, diagnostics),
          isObjectivesCollapsed: sanitizeBoolean(parsed.ui?.isObjectivesCollapsed, true, diagnostics, "isObjectivesCollapsed"),
        },
      };

      return { state: sanitizedState, diagnostics: diagnostics.snapshot() };
    } catch (error) {
      logger.error("Failed to parse persisted state", { error, key });
    }
  }

  return null;
};

export const persistState = (state: PersistedAppState) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error("Failed to persist state", { error });
  }
};

export const reportHydrationDiagnostics = (diagnostics: HydrationDiagnostics) => {
  if (typeof window !== "undefined") {
    (window as typeof window & {
      __KR_TRACKER_HYDRATION__?: {
        timestamp: string;
        diagnostics: HydrationDiagnostics;
      };
    }).__KR_TRACKER_HYDRATION__ = {
      timestamp: new Date().toISOString(),
      diagnostics: {
        warnings: [...diagnostics.warnings],
        counts: { ...diagnostics.counts },
      },
    };
  }

  if (diagnostics.warnings.length === 0) {
    return;
  }

  logger.warn("Hydration sanitization warnings detected", {
    warningCount: diagnostics.warnings.length,
    counts: diagnostics.counts,
  });

  if (import.meta.env.DEV && typeof console !== "undefined" && typeof console.table === "function") {
    const tableData = diagnostics.warnings.map((warning) => ({
      entity: warning.entity,
      type: warning.type,
      message: warning.message,
      ...(warning.details ?? {}),
    }));
    console.table(tableData);
  }
};
