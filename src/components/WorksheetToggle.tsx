import React from 'react';

type WorksheetView = 'plan' | 'actuals';

interface Props {
  currentView: WorksheetView;
  onViewChange: (view: WorksheetView) => void;
}

export function WorksheetToggle({ currentView, onViewChange }: Props) {
  return (
    <div className="worksheet-toggle">
      <button
        className={currentView === 'plan' ? 'active' : ''}
        onClick={() => onViewChange('plan')}
      >
        Plan
      </button>
      <button
        className={currentView === 'actuals' ? 'active' : ''}
        onClick={() => onViewChange('actuals')}
      >
        Actuals
      </button>
    </div>
  );
}
