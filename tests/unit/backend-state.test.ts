import { describe, it, expect, beforeEach, vi } from 'vitest';
import { persistState, loadPersistedState, type PersistedAppState, type DataSource } from '../../src/state/hydration';

describe('Backend State Source Tracking', () => {
  const mockState: PersistedAppState = {
    mode: 'plan',
    organizations: [],
    teams: [],
    pods: [],
    people: [],
    functions: [],
    quarters: [],
    objectives: [],
    krs: [],
    initiatives: [],
    ui: {
      selectedTeam: 'all',
      selectedQuarter: 'q4-2024',
      viewType: 'cards',
      advancedFilters: {},
      currentTab: 'krs',
      isObjectivesCollapsed: true,
    },
  };

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('persistState', () => {
    it('should persist state with backend source', () => {
      persistState(mockState, 'backend');

      const stored = localStorage.getItem('kr-tracker-state-v4');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.source).toBe('backend');
      expect(parsed.sourceTimestamp).toBeTruthy();
    });

    it('should persist state with mock source', () => {
      persistState(mockState, 'mock');

      const stored = localStorage.getItem('kr-tracker-state-v4');
      const parsed = JSON.parse(stored!);
      expect(parsed.source).toBe('mock');
    });

    it('should use existing source if not provided', () => {
      const stateWithSource = { ...mockState, source: 'backend' as DataSource };
      persistState(stateWithSource);

      const stored = localStorage.getItem('kr-tracker-state-v4');
      const parsed = JSON.parse(stored!);
      expect(parsed.source).toBe('backend');
    });

    it('should default to unknown if no source provided', () => {
      persistState(mockState);

      const stored = localStorage.getItem('kr-tracker-state-v4');
      const parsed = JSON.parse(stored!);
      expect(parsed.source).toBe('unknown');
    });
  });

  describe('loadPersistedState', () => {
    it('should load state with source information', () => {
      const stateWithSource = {
        ...mockState,
        source: 'backend',
        sourceTimestamp: new Date().toISOString(),
      };
      localStorage.setItem('kr-tracker-state-v4', JSON.stringify(stateWithSource));

      const result = loadPersistedState();
      expect(result).toBeTruthy();
      expect(result?.state.source).toBe('backend');
      expect(result?.state.sourceTimestamp).toBeTruthy();
    });

    it('should default source to unknown if invalid', () => {
      const stateWithInvalidSource = {
        ...mockState,
        source: 'invalid-source',
      };
      localStorage.setItem('kr-tracker-state-v4', JSON.stringify(stateWithInvalidSource));

      const result = loadPersistedState();
      expect(result?.state.source).toBe('unknown');
    });

    it('should handle missing source gracefully', () => {
      localStorage.setItem('kr-tracker-state-v4', JSON.stringify(mockState));

      const result = loadPersistedState();
      expect(result?.state.source).toBe('unknown');
    });
  });

  describe('Source Validation', () => {
    it('should reject mock data when backend is expected', () => {
      // This behavior is tested in the App component
      // Here we just verify the source is correctly tracked
      const mockSourceState = { ...mockState, source: 'mock' as DataSource };
      persistState(mockSourceState, 'mock');

      const loaded = loadPersistedState();
      expect(loaded?.state.source).toBe('mock');

      // App logic should check: if (shouldUseBackend && persisted.source === 'mock')
      // and not apply the state
    });
  });

  describe('Migration from older versions', () => {
    it('should handle state without source field', () => {
      // Simulate old state format without source field
      localStorage.setItem('kr-tracker-state-v4', JSON.stringify(mockState));

      const result = loadPersistedState();
      expect(result).toBeTruthy();
      expect(result?.state.source).toBe('unknown');
      // May have warnings for empty arrays defaulting
      expect(result?.diagnostics).toBeTruthy();
    });
  });
});