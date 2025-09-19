import React from 'react';
import { useStore, useDispatch } from '../state/store';
import { ChevronDown, Settings } from 'lucide-react';

export function AppHeader() {
  const state = useStore();
  const dispatch = useDispatch();
  const { teams, currentBaselineId, currentView } = state;

  const isExecutionMode = !!currentBaselineId;

  const handleModeToggle = (mode: 'plan' | 'execution') => {
    if (mode === 'execution' && !currentBaselineId) {
      // Need to lock baseline first
      alert('Please lock the baseline first to enter Execution Mode');
      return;
    }
    // Mode is controlled by baseline lock status
  };

  const handleTeamFilter = (teamId: string) => {
    dispatch({
      type: 'SET_VIEW_FILTER',
      filter: teamId === 'all'
        ? { level: 'organization' }
        : { level: 'team', targetId: teamId }
    });
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* App Title */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Team OKR & Initiative Tracker
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track key results and initiatives across your organization
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleModeToggle('plan')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !isExecutionMode
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="h-4 w-4" />
                Plan Mode
              </button>
              <button
                onClick={() => handleModeToggle('execution')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isExecutionMode
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Execution Mode
              </button>
            </div>

            {/* Team Filter Dropdown */}
            <div className="relative">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                {currentView?.level === 'team' && currentView.targetId
                  ? teams.find((t: any) => t.id === currentView.targetId)?.name || 'All Teams'
                  : 'All Teams'}
                <ChevronDown className="h-4 w-4" />
              </button>
              {/* Dropdown would go here */}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}