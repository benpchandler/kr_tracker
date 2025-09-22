import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from './utils/logger';
import {
  LOCAL_STORAGE_KEY,
  loadPersistedState,
  reportHydrationDiagnostics,
  type HydrationDiagnostics,
} from './state/hydration';

vi.mock('./utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('persistence sanitization', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete (window as typeof window & { __KR_TRACKER_HYDRATION__?: unknown }).__KR_TRACKER_HYDRATION__;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('collects diagnostics for malformed persisted payloads', () => {
    const invalidState = {
      mode: 'broken-mode',
      organizations: [{ id: '', name: '' }],
      teams: 'not-an-array',
      pods: null,
      people: [
        {
          id: '',
          name: '',
          email: '',
          functionId: 'unknown',
        },
      ],
      functions: [{ id: '', name: '', color: '' }],
      quarters: undefined,
      objectives: [
        {
          id: '',
          title: '',
          organizationId: '',
          krIds: [123],
        },
      ],
      krs: null,
      initiatives: [{ id: 'init-1', linkedKRIds: 'invalid' }],
      ui: {
        selectedTeam: 42,
        selectedQuarter: null,
        viewType: 'unknown',
        advancedFilters: 'oops',
        currentTab: 'metrics',
        isObjectivesCollapsed: 'nope',
      },
    };

    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invalidState));

    const result = loadPersistedState();
    expect(result).not.toBeNull();
    const { state, diagnostics } = result!;

    expect(state.mode).toBe('plan');
    expect(state.teams).toEqual([]);
    expect(state.ui.viewType).toBe('cards');

    expect(diagnostics.warnings.length).toBeGreaterThan(0);
    expect(diagnostics.warnings.some((warning) => warning.entity === 'ui' && warning.message.includes('View type'))).toBe(true);
    expect(
      diagnostics.warnings.some(
        (warning) => warning.entity === 'people' && warning.message.includes('missing a name')
      )
    ).toBe(true);
    expect(diagnostics.counts['ui:defaulted']).toBeGreaterThan(0);
  });

  it('persists hydration diagnostics snapshot and logs warnings', () => {
    vi.stubEnv('DEV', 'true');
    const consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});

    const diagnostics: HydrationDiagnostics = {
      warnings: [
        {
          entity: 'ui',
          type: 'defaulted',
          message: 'Example warning',
          details: { field: 'viewType' },
        },
      ],
      counts: { 'ui:defaulted': 1 },
    };

    reportHydrationDiagnostics(diagnostics);

    expect(logger.warn).toHaveBeenCalledWith('Hydration sanitization warnings detected', expect.objectContaining({
      warningCount: 1,
    }));

    const snapshot = (window as typeof window & {
      __KR_TRACKER_HYDRATION__?: { timestamp: string; diagnostics: HydrationDiagnostics };
    }).__KR_TRACKER_HYDRATION__;

    expect(snapshot).toBeDefined();
    expect(snapshot?.diagnostics.warnings).toHaveLength(1);
    expect(snapshot?.diagnostics.counts).toMatchObject({ 'ui:defaulted': 1 });

    consoleTableSpy.mockRestore();
  });
});
