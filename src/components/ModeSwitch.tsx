import { AppMode } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Settings, Play, Calendar, BarChart3 } from "lucide-react";

interface ModeSwitchProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeSwitch({ currentMode, onModeChange }: ModeSwitchProps) {
  return (
    <Card className="w-fit">
      <CardContent className="p-2">
        <div className="flex items-center gap-1">
          <Button
            variant={currentMode === 'plan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onModeChange('plan')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Plan Mode
          </Button>
          <Button
            variant={currentMode === 'execution' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onModeChange('execution')}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Execution Mode
          </Button>
          <Button
            variant={currentMode === 'analysis' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onModeChange('analysis')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analysis Mode
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModeDescriptionProps {
  mode: AppMode;
}

export function ModeDescription({ mode }: ModeDescriptionProps) {
  const descriptions = {
    plan: {
      title: "Plan Mode",
      description: "Set up your organizational structure, define KRs and initiatives, configure data sources, and establish quarterly goals.",
      features: ["Manage teams & pods", "Configure KRs & targets", "Link initiatives", "Set up SQL queries", "Define relationships"]
    },
    execution: {
      title: "Execution Mode", 
      description: "Track progress, update actuals, add comments about performance, and adjust forecasts throughout the quarter.",
      features: ["Update progress", "Track vs plan", "Add comments", "Adjust forecasts", "View auto-updates"]
    },
    analysis: {
      title: "Analysis Mode",
      description: "Analyze performance patterns, forecast scenarios, and gain strategic insights from your KR data and initiative portfolio.",
      features: ["Monte Carlo forecasting", "Risk analysis", "Team performance insights", "Initiative impact analysis", "Trend visualization"]
    }
  };

  const info = descriptions[mode];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {mode === 'plan' ? (
          <Settings className="h-5 w-5 text-muted-foreground" />
        ) : mode === 'execution' ? (
          <Play className="h-5 w-5 text-muted-foreground" />
        ) : (
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        )}
        <h2>{info.title}</h2>
      </div>
      <p className="text-muted-foreground">{info.description}</p>
      <div className="flex flex-wrap gap-2 mt-2">
        {info.features.map((feature, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
          >
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
}