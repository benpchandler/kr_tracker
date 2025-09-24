import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { logger } from '../utils/logger';

vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedLogger = logger as unknown as {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

describe('AppProvider dispatch instrumentation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete (window as typeof window & { __KR_TRACKER_ACTIONS__?: unknown }).__KR_TRACKER_ACTIONS__;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('skips tracing when debug flags are disabled', async () => {
    vi.stubEnv('VITE_DEBUG_STORE', 'false');
    vi.stubEnv('DEV', 'false');

    const { AppProvider, useAppState } = await import('./store');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppProvider>{children}</AppProvider>
    );

    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'SET_MODE', payload: 'analysis' });
    });

    await waitFor(() => {
      expect(result.current.state.mode).toBe('analysis');
    });

    expect(mockedLogger.debug).not.toHaveBeenCalled();
    expect((window as typeof window & { __KR_TRACKER_ACTIONS__?: unknown }).__KR_TRACKER_ACTIONS__).toBeUndefined();
  });

  it('records traces when debug flag is enabled', async () => {
    vi.stubEnv('VITE_DEBUG_STORE', 'true');
    vi.stubEnv('DEV', 'false');

    const { AppProvider, useAppState } = await import('./store');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppProvider>{children}</AppProvider>
    );

    const { result } = renderHook(() => useAppState(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'SET_SELECTED_TEAM', payload: 'team-123' });
    });

    await waitFor(() => {
      expect(mockedLogger.debug).toHaveBeenCalled();
    });

    const [message, metadata] = mockedLogger.debug.mock.calls[0];
    expect(message).toBe('App store dispatch');
    expect(metadata?.action?.type).toBe('SET_SELECTED_TEAM');
    expect(metadata?.stateChanges).toContain('selectedTeam');

    const actions = (window as typeof window & {
      __KR_TRACKER_ACTIONS__?: Array<{ action: { type: string }; stateChanges: string[] }>;
    }).__KR_TRACKER_ACTIONS__;

    expect(actions).toBeDefined();
    expect(actions).toHaveLength(1);
    expect(actions?.[0].action.type).toBe('SET_SELECTED_TEAM');
  });
});
