import { useEffect, useMemo, useState } from 'react';
import { PlanBaseline, useAppState } from '../state/store';
import type { PlanDraftData } from '../state/store';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { logger } from '../utils/logger';

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
  const planDraft = state.planDraft;

  const availableWeeks = useMemo(() => {
    if (weeks.length > 0) {
      return weeks;
    }

    const uniqueWeeks = new Set<string>();
    Object.values(planDraft).forEach(weekMap => {
      if (!weekMap) return;
      Object.keys(weekMap).forEach(week => uniqueWeeks.add(week));
    });

    return Array.from(uniqueWeeks).sort();
  }, [weeks, planDraft]);

  const sanitizePlanValues = (plan: Record<string, number> | undefined): Record<string, number> => {
    if (!plan) {
      return {};
    }

    const sanitized: Record<string, number> = {};
    Object.entries(plan).forEach(([weekKey, value]) => {
      const numeric = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(numeric)) {
        return;
      }
      sanitized[weekKey] = numeric;
    });
    return sanitized;
  };

  const generateFallbackPlan = (kr: KR): Record<string, number> => {
    const fallback: Record<string, number> = {};
    const planWeeks = weeks.length > 0 ? weeks : availableWeeks;
    if (planWeeks.length === 0) {
      return fallback;
    }

    const target = Number.parseFloat(kr.target);
    const baselineValue = Number.parseFloat(kr.baseline || '0');
    const validTarget = Number.isFinite(target) ? target : 0;
    const validBaseline = Number.isFinite(baselineValue) ? baselineValue : 0;
    const incremental = planWeeks.length > 0 ? (validTarget - validBaseline) / planWeeks.length : 0;

    let cumulative = validBaseline;
    planWeeks.forEach(week => {
      cumulative += incremental;
      fallback[week] = Number.isFinite(cumulative) ? Number(cumulative.toFixed(2)) : 0;
    });

    return fallback;
  };

  // Generate baseline data from plan draft values
  const generateBaselineData = (): PlanDraftData => {
    const data: PlanDraftData = {};
    const fallbackKrIds: string[] = [];
    const incompleteWeeks: Record<string, string[]> = {};

    krs.forEach(kr => {
      const sanitizedPlan = sanitizePlanValues(planDraft[kr.id]);
      if (Object.keys(sanitizedPlan).length === 0) {
        data[kr.id] = generateFallbackPlan(kr);
        fallbackKrIds.push(kr.id);
        return;
      }

      const missingWeeks = weeks.filter(week => sanitizedPlan[week] === undefined);
      if (missingWeeks.length > 0) {
        incompleteWeeks[kr.id] = missingWeeks;
      }

      data[kr.id] = { ...sanitizedPlan };
    });

    if (fallbackKrIds.length > 0) {
      logger.warn('Using fallback plan generation for KRs without plan data', { krIds: fallbackKrIds });
    }

    if (Object.keys(incompleteWeeks).length > 0) {
      logger.warn('Plan data missing for some KR weeks', { gaps: incompleteWeeks });
    }

    return data;
  };

  const calculateCoverage = (data: PlanDraftData, weekKeys: string[]): number => {
    if (krs.length === 0 || weekKeys.length === 0) {
      return 0;
    }

    const totalCells = krs.length * weekKeys.length;
    let filledCells = 0;

    krs.forEach(kr => {
      weekKeys.forEach(week => {
        if (data[kr.id]?.[week] !== undefined) {
          filledCells++;
        }
      });
    });

    return totalCells === 0 ? 0 : (filledCells / totalCells) * 100;
  };

  const baselineCoverage = useMemo(() => (
    currentBaseline ? calculateCoverage(currentBaseline.data, weeks) : 0
  ), [currentBaseline, weeks, krs]);

  const planCoverage = useMemo(() => calculateCoverage(planDraft, availableWeeks), [planDraft, availableWeeks, krs]);

  const planPreviewKRs = useMemo(() => (
    krs.filter(kr => {
      const plan = planDraft[kr.id];
      return plan && Object.keys(plan).length > 0;
    }).slice(0, 3)
  ), [krs, planDraft]);

  const previewWeeks = useMemo(() => (
    availableWeeks.slice(0, Math.min(availableWeeks.length, 4))
  ), [availableWeeks]);

  const planlessKRs = useMemo(() => (
    krs.filter(kr => !planDraft[kr.id] || Object.keys(planDraft[kr.id]).length === 0)
  ), [krs, planDraft]);

  const planlessSummary = useMemo(() => {
    if (planlessKRs.length === 0) {
      return [] as string[];
    }

    if (planlessKRs.length <= 3) {
      return planlessKRs.map(kr => kr.title);
    }

    const names = planlessKRs.slice(0, 3).map(kr => kr.title);
    names.push(`+${planlessKRs.length - 3} more`);
    return names;
  }, [planlessKRs]);

  useEffect(() => {
    if (planCoverage > 0) {
      logger.debug('Plan draft coverage computed', { planCoverage: Number(planCoverage.toFixed(1)) });
    }
  }, [planCoverage]);

  useEffect(() => {
    if (currentBaseline) {
      logger.debug('Baseline coverage computed', {
        baselineId: currentBaseline.id,
        coverage: Number(baselineCoverage.toFixed(1)),
      });
    }
  }, [baselineCoverage, currentBaseline]);

  useEffect(() => {
    if (planlessKRs.length > 0) {
      logger.warn('Plan draft missing entries for some KRs', {
        krIds: planlessKRs.map(kr => kr.id),
      });
    }
  }, [planlessKRs]);

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
                  <p className="font-medium">{baselineCoverage.toFixed(0)}% of cells</p>
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

              <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Plan Draft Coverage</p>
                    <p className="text-xs text-muted-foreground">
                      Tracking {krs.length} {krs.length === 1 ? 'key result' : 'key results'} across {availableWeeks.length}{' '}
                      {availableWeeks.length === 1 ? 'week' : 'weeks'}.
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {planCoverage.toFixed(0)}% coverage
                  </Badge>
                </div>

                {planlessKRs.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                    Missing plan values for {planlessKRs.length}{' '}
                    {planlessKRs.length === 1 ? 'KR' : 'KRs'}: {planlessSummary.join(', ')}
                  </div>
                )}

                {planPreviewKRs.length > 0 && previewWeeks.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px]">Key Result</TableHead>
                          {previewWeeks.map(week => (
                            <TableHead key={week} className="text-center text-xs uppercase tracking-wide">
                              {week}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {planPreviewKRs.map(kr => (
                          <TableRow key={kr.id}>
                            <TableCell>
                              <div className="font-medium truncate">{kr.title}</div>
                              <div className="text-xs text-muted-foreground">Unit: {kr.unit}</div>
                            </TableCell>
                            {previewWeeks.map(week => {
                              const value = planDraft[kr.id]?.[week];
                              return (
                                <TableCell key={week} className="text-center text-sm">
                                  {value !== undefined ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No plan data received from the backend yet. Once data is available, it will appear here.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowLockDialog(true)}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Lock Plan & Create Baseline
                </Button>
              </div>
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