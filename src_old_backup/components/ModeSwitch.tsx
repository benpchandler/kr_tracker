import { Settings, TrendingUp } from "lucide-react";
import { AppMode } from "../types";

interface ModeSwitchProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeSwitch({ currentMode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="flex bg-muted rounded-lg p-1">
      <button
        onClick={() => onModeChange('plan')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          currentMode === 'plan'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Settings className="h-4 w-4" />
        Plan Mode
      </button>
      <button
        onClick={() => onModeChange('execution')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          currentMode === 'execution'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <TrendingUp className="h-4 w-4" />
        Execution Mode
      </button>
    </div>
  );
}

interface ModeDescriptionProps {
  mode: AppMode;
}

export function ModeDescription({ mode }: ModeDescriptionProps) {
  if (mode === 'plan') {
    return (
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">Plan Mode</h3>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Set up your organizational structure, define KRs and initiatives, configure data sources, and establish quarterly goals.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
        <h3 className="font-semibold text-green-900 dark:text-green-100">Execution Mode</h3>
      </div>
      <p className="text-sm text-green-700 dark:text-green-300">
        Track progress, update actuals, and monitor performance against your quarterly goals. Use filters to focus on specific teams or initiatives.
      </p>
    </div>
  );
}