import { useState } from 'react';
import { PlanBaseline, useAppState, ActualData as _ActualData } from '../state/store';
import { KR } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Lock,
  Unlock,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  History,
  Archive
} from 'lucide-react';
import { cn } from '../lib/utils';

interface BaselineManagerProps {
  krs: KR[];
  weeks: string[];
}

export function BaselineManager({ krs, weeks }: BaselineManagerProps) {
  const { state, dispatch } = useAppState();
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const currentBaseline = state.planBaselines.find(b => b.id === state.currentBaselineId);
  const isLocked = !!currentBaseline;

  // Generate baseline data from current KR targets/plans
  const generateBaselineData = (): Record<string, Record<string, number>> => {
    const data: Record<string, Record<string, number>> = {};

    krs.forEach(kr => {
      data[kr.id] = {};

      // For simplicity, distribute the target evenly across weeks
      // In a real implementation, this would come from a PlanGrid component
      const weeklyTarget = parseFloat(kr.target) / weeks.length;
      let cumulative = parseFloat(kr.baseline || '0');

      weeks.forEach(week => {
        cumulative += weeklyTarget;
        data[kr.id][week] = cumulative;
      });
    });

    return data;
  };

  // Lock the baseline
  const handleLockBaseline = () => {
    const newBaseline: PlanBaseline = {
      id: `baseline-${Date.now()}`,
      version: state.planBaselines.length + 1,
      lockedAt: new Date().toISOString(),
      lockedBy: 'Current User', // In a real app, this would come from auth context
      data: generateBaselineData()
    };

    dispatch({ type: 'LOCK_PLAN', baseline: newBaseline });
    setShowLockDialog(false);
  };

  // Unlock the baseline
  const handleUnlockBaseline = () => {
    dispatch({ type: 'UNLOCK_PLAN' });
    setShowUnlockDialog(false);
  };

  // Switch to a different baseline version
  const handleSwitchBaseline = (baselineId: string) => {
    dispatch({ type: 'SET_CURRENT_BASELINE_ID', id: baselineId });
    setShowHistoryDialog(false);
  };

  // Format date
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate baseline coverage
  const getBaselineCoverage = () => {
    if (!currentBaseline) return 0;

    const totalCells = krs.length * weeks.length;
    let filledCells = 0;

    krs.forEach(kr => {
      weeks.forEach(week => {
        if (currentBaseline.data[kr.id]?.[week] !== undefined) {
          filledCells++;
        }
      });
    });

    return (filledCells / totalCells) * 100;
  };

  const coverage = getBaselineCoverage();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                Baseline Management
              </CardTitle>
              <CardDescription>
                {isLocked
                  ? 'Plan is locked for execution. Unlock to make changes.'
                  : 'Lock your plan to start tracking actuals.'}
              </CardDescription>
            </div>
            {currentBaseline && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Version {currentBaseline.version}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentBaseline ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Locked On
                  </div>
                  <p className="font-medium">{formatDate(currentBaseline.lockedAt)}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Locked By
                  </div>
                  <p className="font-medium">{currentBaseline.lockedBy}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Archive className="h-4 w-4" />
                    Coverage
                  </div>
                  <p className="font-medium">{coverage.toFixed(0)}% of cells</p>
                </div>
              </div>

              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Baseline Active</AlertTitle>
                <AlertDescription>
                  The plan is locked and you can now enter actual values. To modify the plan,
                  you must first unlock the baseline.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowUnlockDialog(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Unlock className="h-4 w-4" />
                  Unlock Plan
                </Button>
                {state.planBaselines.length > 1 && (
                  <Button
                    onClick={() => setShowHistoryDialog(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <History className="h-4 w-4" />
                    Version History
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle>No Baseline Set</AlertTitle>
                <AlertDescription>
                  Lock your plan to create a baseline. Once locked, you can start entering
                  actual values and tracking progress against the plan.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Before locking, ensure:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• All KRs have defined targets</li>
                  <li>• Weekly plans are set for the period</li>
                  <li>• Teams and owners are assigned</li>
                  <li>• Initiatives are linked to KRs</li>
                </ul>
              </div>

              <Button
                onClick={() => setShowLockDialog(true)}
                className="gap-2"
              >
                <Lock className="h-4 w-4" />
                Lock Plan & Create Baseline
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lock Confirmation Dialog */}
      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock Plan and Create Baseline?</DialogTitle>
            <DialogDescription>
              This will create a baseline version of your current plan. Once locked:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span className="text-sm">You can start entering actual values</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span className="text-sm">Metrics will be calculated against this baseline</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <span className="text-sm">Plan values cannot be edited without unlocking</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLockDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLockBaseline} className="gap-1">
              <Lock className="h-4 w-4" />
              Lock Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Confirmation Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Plan?</DialogTitle>
            <DialogDescription>
              Unlocking the plan will allow you to make changes. Consider:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <span className="text-sm">You won't be able to enter actuals while unlocked</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <span className="text-sm">Existing actuals will be preserved</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span className="text-sm">You can re-lock with a new baseline version</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlockDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUnlockBaseline} variant="destructive" className="gap-1">
              <Unlock className="h-4 w-4" />
              Unlock Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Baseline Version History</DialogTitle>
            <DialogDescription>
              Switch between different baseline versions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-96 overflow-y-auto">
            {state.planBaselines.map(baseline => (
              <div
                key={baseline.id}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                  baseline.id === state.currentBaselineId && "border-primary bg-primary/5"
                )}
                onClick={() => handleSwitchBaseline(baseline.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Version {baseline.version}</span>
                      {baseline.id === state.currentBaselineId && (
                        <Badge variant="default" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(baseline.lockedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {baseline.lockedBy}
                      </span>
                    </div>
                  </div>
                  {baseline.id === state.currentBaselineId && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}