import { useState, useRef, useCallback, useEffect } from 'react';
import { KR, WeekData as _WeekData } from '../types';
import { PlanBaseline, ActualData, useAppState } from '../state/store';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Clipboard, Save, Lock, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ActualsGridProps {
  krs: KR[];
  baseline: PlanBaseline | null;
  actuals: ActualData;
  weeks: string[]; // ISO week format: 'YYYY-Www'
  onUpdate: (updates: ActualData) => void;
  readOnly?: boolean;
}

export function ActualsGrid({
  krs,
  baseline,
  actuals,
  weeks,
  onUpdate,
  readOnly = false
}: ActualsGridProps) {
  const { state } = useAppState();
  const [focusedCell, setFocusedCell] = useState<{ krId: string; weekISO: string } | null>(null);
  const [pendingChanges, setPendingChanges] = useState<ActualData>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Get plan value from baseline
  const getPlanValue = (krId: string, weekISO: string): number | null => {
    if (!baseline) return null;
    return baseline.data[krId]?.[weekISO] ?? null;
  };

  // Get actual value
  const getActualValue = (krId: string, weekISO: string): number | null => {
    // Check pending changes first
    if (pendingChanges[krId]?.[weekISO] !== undefined) {
      return pendingChanges[krId][weekISO];
    }
    // Then check saved actuals
    return actuals[krId]?.[weekISO] ?? null;
  };

  // Sanitize input value (remove $, %, commas)
  const sanitizeValue = (value: string): number | null => {
    const cleaned = value
      .replace(/[$,%]/g, '')
      .replace(/,/g, '')
      .trim();

    if (cleaned === '' || cleaned === '-') return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // Handle cell value change
  const handleCellChange = (krId: string, weekISO: string, value: string) => {
    const numValue = sanitizeValue(value);

    setPendingChanges(prev => ({
      ...prev,
      [krId]: {
        ...prev[krId],
        [weekISO]: numValue ?? 0
      }
    }));
    setHasUnsavedChanges(true);
  };

  // Handle multi-cell paste
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!focusedCell || readOnly || !e.clipboardData) return;

    e.preventDefault();
    const text = e.clipboardData.getData('text');

    // Parse TSV/CSV data
    const rows = text.split(/\r?\n/).filter(row => row.trim());
    const data = rows.map(row => row.split(/\t|,/).map(cell => cell.trim()));

    // Find starting position
    const krIndex = krs.findIndex(kr => kr.id === focusedCell.krId);
    const weekIndex = weeks.findIndex(week => week === focusedCell.weekISO);

    if (krIndex === -1 || weekIndex === -1) return;

    const updates: ActualData = { ...pendingChanges };

    // Fill data from paste position
    data.forEach((row, rowOffset) => {
      const targetKrIndex = krIndex + rowOffset;
      if (targetKrIndex >= krs.length) return;

      const targetKrId = krs[targetKrIndex].id;
      if (!updates[targetKrId]) {
        updates[targetKrId] = {};
      }

      row.forEach((cell, colOffset) => {
        const targetWeekIndex = weekIndex + colOffset;
        if (targetWeekIndex >= weeks.length) return;

        const targetWeek = weeks[targetWeekIndex];
        const value = sanitizeValue(cell);
        if (value !== null) {
          updates[targetKrId][targetWeek] = value;
        }
      });
    });

    setPendingChanges(updates);
    setHasUnsavedChanges(true);
  }, [focusedCell, krs, weeks, readOnly, pendingChanges]);

  // Save changes
  const handleSave = () => {
    onUpdate(pendingChanges);
    setPendingChanges({});
    setHasUnsavedChanges(false);
  };

  // Discard changes
  const handleDiscard = () => {
    setPendingChanges({});
    setHasUnsavedChanges(false);
  };

  // Calculate variance for a cell
  const getVariance = (krId: string, weekISO: string): number | null => {
    const plan = getPlanValue(krId, weekISO);
    const actual = getActualValue(krId, weekISO);

    if (plan === null || actual === null) return null;
    return actual - plan;
  };

  // Get health color based on variance
  const getHealthColor = (variance: number | null): string => {
    if (variance === null) return '';
    if (variance >= 0) return 'text-green-600';
    if (variance >= -5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Setup paste event listener
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    grid.addEventListener('paste', handlePaste);
    return () => grid.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Get team name for KR
  const getTeamName = (kr: KR): string => {
    const team = state.teams.find(t => t.id === kr.teamId);
    return team?.name || 'Unknown';
  };

  if (!baseline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            No Baseline Locked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please lock a plan baseline in Plan Mode before entering actuals.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Weekly Actuals</CardTitle>
            {baseline && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Baseline v{baseline.version}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <>
                <Button onClick={handleDiscard} variant="outline" size="sm">
                  Discard Changes
                </Button>
                <Button onClick={handleSave} size="sm" className="gap-1">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </>
            )}
            <Badge variant="outline" className="gap-1">
              <Clipboard className="h-3 w-3" />
              Paste from Excel/Sheets
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={gridRef} className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background min-w-[200px]">
                  Key Result
                </TableHead>
                <TableHead className="min-w-[80px]">Team</TableHead>
                <TableHead className="min-w-[80px]">Unit</TableHead>
                {weeks.map(week => (
                  <TableHead key={week} className="text-center min-w-[100px]">
                    <div>Week {week.split('-W')[1]}</div>
                    <div className="text-xs text-muted-foreground">{week}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {krs.map(kr => (
                <TableRow key={kr.id}>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    <div className="max-w-[200px]">
                      <div className="truncate">{kr.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Target: {kr.target}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTeamName(kr)}</Badge>
                  </TableCell>
                  <TableCell>{kr.unit}</TableCell>
                  {weeks.map(week => {
                    const plan = getPlanValue(kr.id, week);
                    const actual = getActualValue(kr.id, week);
                    const variance = getVariance(kr.id, week);
                    const isFocused = focusedCell?.krId === kr.id && focusedCell?.weekISO === week;

                    return (
                      <TableCell key={week} className="p-1">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground text-center">
                            Plan: {plan ?? '-'}
                          </div>
                          <Input
                            type="text"
                            value={actual ?? ''}
                            onChange={(e) => handleCellChange(kr.id, week, e.target.value)}
                            onFocus={() => setFocusedCell({ krId: kr.id, weekISO: week })}
                            onBlur={() => setFocusedCell(null)}
                            className={cn(
                              "h-8 text-center",
                              isFocused && "ring-2 ring-primary",
                              variance !== null && getHealthColor(variance)
                            )}
                            placeholder="-"
                            disabled={readOnly}
                          />
                          {variance !== null && (
                            <div className={cn("text-xs text-center", getHealthColor(variance))}>
                              {variance > 0 ? '+' : ''}{variance.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!readOnly && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Quick Entry Tips
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Copy data from Excel/Google Sheets and paste directly into cells</li>
              <li>• Values are automatically sanitized (removes $, %, commas)</li>
              <li>• Click a cell to set the paste anchor point</li>
              <li>• Multi-cell paste fills across weeks and down KRs</li>
              <li>• Press Save to persist changes or Discard to reset</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}