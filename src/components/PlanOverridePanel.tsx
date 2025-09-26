import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../state/store';
import type { KR } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { cn } from '../lib/utils';
import { generateWeeks } from '../utils/weeks';

interface PlanOverridePanelProps {
  kr: Pick<KR, 'id' | 'title' | 'unit' | 'baseline' | 'target'>;
  weeks?: string[];
  onDone?: () => void;
  condensed?: boolean;
}

interface DraftValue {
  value: string;
}

const formatNumber = (value: number | undefined, unit: string): string => {
  if (value === undefined) {
    return '—';
  }

  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return unit ? `${formatted} ${unit}` : formatted;
};

export function PlanOverridePanel({ kr, weeks, onDone, condensed }: PlanOverridePanelProps) {
  const { state, dispatch } = useAppState();
  const planValues = state.planDraft[kr.id] || {};
  const actualValues = state.actuals[kr.id] || {};

  const availableWeeks = useMemo(() => {
    if (weeks && weeks.length > 0) {
      return weeks;
    }

    const fromPeriod = state.currentPeriod
      ? generateWeeks(state.currentPeriod.startISO, state.currentPeriod.endISO)
      : [];

    if (fromPeriod.length > 0) {
      return fromPeriod;
    }

    const unique = new Set<string>();
    Object.keys(planValues).forEach(week => unique.add(week));
    Object.keys(actualValues).forEach(week => unique.add(week));

    return Array.from(unique).sort();
  }, [weeks, state.currentPeriod, planValues, actualValues]);

  const [overrideMode, setOverrideMode] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, DraftValue>>({});
  const [invalidWeeks, setInvalidWeeks] = useState<string[]>([]);

  useEffect(() => {
    if (!overrideMode) {
      setDraftValues({});
      setInvalidWeeks([]);
      return;
    }

    setDraftValues(() => {
      const entries: Record<string, DraftValue> = {};
      availableWeeks.forEach(week => {
        const existing = planValues[week];
        entries[week] = {
          value: existing !== undefined ? existing.toString() : '',
        };
      });
      return entries;
    });
  }, [overrideMode, availableWeeks, planValues]);

  useEffect(() => {
    if (!overrideMode) {
      return;
    }

    const invalid: string[] = [];
    Object.entries(draftValues).forEach(([week, { value }]) => {
      if (value.trim() === '') {
        return;
      }

      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        invalid.push(week);
      }
    });
    setInvalidWeeks(invalid);
  }, [overrideMode, draftValues]);

  const coverage = useMemo(() => {
    if (availableWeeks.length === 0) {
      return 0;
    }
    const filled = availableWeeks.filter(week => planValues[week] !== undefined).length;
    return Math.round((filled / availableWeeks.length) * 100);
  }, [availableWeeks, planValues]);

  const planTotal = useMemo(() => {
    return availableWeeks.reduce((sum, week) => sum + (planValues[week] ?? 0), 0);
  }, [availableWeeks, planValues]);

  const actualTotal = useMemo(() => {
    return availableWeeks.reduce((sum, week) => sum + (actualValues[week] ?? 0), 0);
  }, [availableWeeks, actualValues]);

  const hasChanges = useMemo(() => {
    if (!overrideMode) {
      return false;
    }

    return availableWeeks.some(week => {
      const draft = draftValues[week];
      if (!draft) {
        return false;
      }

      const trimmed = draft.value.trim();
      const existing = planValues[week];

      if (trimmed === '') {
        return existing !== undefined;
      }

      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) {
        return true;
      }

      return existing !== numeric;
    });
  }, [overrideMode, availableWeeks, draftValues, planValues]);

  const handleToggleOverride = (checked: boolean) => {
    setOverrideMode(checked);
    if (!checked) {
      setDraftValues({});
      setInvalidWeeks([]);
    }
  };

  const handleValueChange = (week: string, value: string) => {
    setDraftValues(prev => ({
      ...prev,
      [week]: {
        value,
      },
    }));
  };

  const handleCancel = () => {
    setOverrideMode(false);
    setDraftValues({});
    setInvalidWeeks([]);
  };

  const handleSave = () => {
    if (!overrideMode) {
      return;
    }

    availableWeeks.forEach(week => {
      const draft = draftValues[week];
      if (!draft) {
        return;
      }

      const trimmed = draft.value.trim();
      if (trimmed === '') {
        if (planValues[week] !== undefined) {
          dispatch({ type: 'SET_PLAN_VALUE', krId: kr.id, weekISO: week, value: null });
        }
        return;
      }

      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) {
        dispatch({ type: 'SET_PLAN_VALUE', krId: kr.id, weekISO: week, value: numeric });
      }
    });

    setOverrideMode(false);
    setDraftValues({});
    setInvalidWeeks([]);

    if (onDone) {
      onDone();
    }
  };

  const containerClasses = cn('space-y-4', condensed && 'p-0');

  return (
    <div className={containerClasses}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-base font-medium">Weekly Plan</h4>
          <p className="text-sm text-muted-foreground">
            {coverage > 0
              ? `Hydrated from backend draft with ${coverage}% coverage`
              : 'No plan values received for this key result yet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Plan Σ {planTotal.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Actual Σ {actualTotal.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </Badge>
          <div className="flex items-center gap-2">
            <Label htmlFor={`override-${kr.id}`} className="text-sm">Override plan</Label>
            <Switch
              id={`override-${kr.id}`}
              checked={overrideMode}
              onCheckedChange={handleToggleOverride}
              aria-label="Toggle plan override mode"
            />
          </div>
        </div>
      </div>

      {invalidWeeks.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            Enter numeric values only. Invalid entries: {invalidWeeks.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Week</TableHead>
              <TableHead className="w-32">Plan</TableHead>
              <TableHead className="w-32">Actual</TableHead>
              <TableHead className="w-32">Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {availableWeeks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  No weeks available for this key result.
                </TableCell>
              </TableRow>
            ) : (
              availableWeeks.map(week => {
                const plan = planValues[week];
                const actual = actualValues[week];
                const variance =
                  plan !== undefined && actual !== undefined ? actual - plan : undefined;
                const draft = draftValues[week];

                return (
                  <TableRow key={week}>
                    <TableCell className="text-sm font-medium">{week}</TableCell>
                    <TableCell>
                      {overrideMode ? (
                        <Input
                          value={draft?.value ?? ''}
                          onChange={(event) => handleValueChange(week, event.target.value)}
                          placeholder="0"
                          inputMode="decimal"
                        />
                      ) : (
                        <span className="text-sm">
                          {formatNumber(plan, kr.unit)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatNumber(actual, kr.unit)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          variance === undefined && 'text-muted-foreground',
                          typeof variance === 'number' && variance > 0 && 'text-green-600',
                          typeof variance === 'number' && variance < 0 && 'text-red-600',
                        )}
                      >
                        {variance === undefined ? '—' : formatNumber(variance, kr.unit)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {overrideMode && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || invalidWeeks.length > 0}>
            Save overrides
          </Button>
        </div>
      )}
    </div>
  );
}
