import React, { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Copy, Target, Users, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppState } from '../state/store';
import type { KR, Quarter } from '../types';

interface CopyKRsDialogProps {
  open: boolean;
  onClose: () => void;
  fromQuarter: Quarter;
  toQuarter: Quarter;
}

type TargetAdjustment = 'keep' | 'increase-10' | 'increase-20' | 'custom';

interface KRSelection {
  kr: KR;
  selected: boolean;
}

export function CopyKRsDialog({ open, onClose, fromQuarter, toQuarter }: CopyKRsDialogProps) {
  const { state, dispatch } = useAppState();
  const [krSelections, setKRSelections] = useState<KRSelection[]>([]);
  const [targetAdjustment, setTargetAdjustment] = useState<TargetAdjustment>('keep');
  const [customPercentage, setCustomPercentage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get KRs from the source quarter
  const sourceKRs = useMemo(() => {
    return state.krs.filter(kr => kr.quarterId === fromQuarter.id);
  }, [state.krs, fromQuarter.id]);

  // Initialize selections when dialog opens
  React.useEffect(() => {
    if (open && sourceKRs.length > 0) {
      setKRSelections(sourceKRs.map(kr => ({ kr, selected: false })));
    }
  }, [open, sourceKRs]);

  // Get team name for display
  const getTeamName = useCallback((teamId: string) => {
    const team = state.teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  }, [state.teams]);

  const handleToggleKR = useCallback((krId: string) => {
    setKRSelections(prev =>
      prev.map(selection =>
        selection.kr.id === krId
          ? { ...selection, selected: !selection.selected }
          : selection
      )
    );
  }, []);

  const handleToggleAll = useCallback(() => {
    const allSelected = krSelections.every(s => s.selected);
    setKRSelections(prev =>
      prev.map(selection => ({ ...selection, selected: !allSelected }))
    );
  }, [krSelections]);

  const selectedKRs = useMemo(() => {
    return krSelections.filter(s => s.selected).map(s => s.kr);
  }, [krSelections]);

  const calculateNewTarget = useCallback((originalTarget: string): string => {
    const numericTarget = parseFloat(originalTarget.replace(/[,$%]/g, ''));
    if (isNaN(numericTarget)) return originalTarget;

    let multiplier = 1;
    switch (targetAdjustment) {
      case 'increase-10':
        multiplier = 1.1;
        break;
      case 'increase-20':
        multiplier = 1.2;
        break;
      case 'custom':
        const customPercent = parseFloat(customPercentage);
        if (!isNaN(customPercent)) {
          multiplier = 1 + (customPercent / 100);
        }
        break;
      default:
        multiplier = 1;
    }

    const newTarget = Math.round(numericTarget * multiplier);
    return newTarget.toString();
  }, [targetAdjustment, customPercentage]);

  const handleCopyKRs = useCallback(async () => {
    if (selectedKRs.length === 0) return;

    setIsProcessing(true);

    try {
      const newKRs: KR[] = selectedKRs.map(kr => ({
        ...kr,
        id: `kr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        quarterId: toQuarter.id,
        target: calculateNewTarget(kr.target),
        current: kr.baseline, // Reset current to baseline
        progress: 0,
        status: 'not-started' as const,
        weeklyActuals: [], // Clear weekly actuals
        comments: [], // Clear comments
        lastUpdated: new Date().toISOString(),
      }));

      // Use dedicated rollover action for better analytics and logging
      const adjustmentLabel = targetAdjustment === 'keep' ? 'keep' :
                             targetAdjustment === 'increase-10' ? '+10%' :
                             targetAdjustment === 'increase-20' ? '+20%' :
                             `+${customPercentage}%`;

      dispatch({
        type: 'ROLLOVER_KRS',
        payload: {
          krs: newKRs,
          fromQuarter: fromQuarter.name,
          toQuarter: toQuarter.name,
          adjustment: adjustmentLabel,
        },
      });

      setIsProcessing(false);
      onClose();

      // Show success notification (you might want to add a toast system)
      console.info(`Successfully copied ${newKRs.length} KRs from ${fromQuarter.name} to ${toQuarter.name}`);
    } catch (error) {
      console.error('Error copying KRs:', error);
      setIsProcessing(false);
    }
  }, [selectedKRs, toQuarter, fromQuarter, calculateNewTarget, dispatch, state.krs, onClose]);

  const allSelected = krSelections.length > 0 && krSelections.every(s => s.selected);
  const someSelected = krSelections.some(s => s.selected);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy KRs from {fromQuarter.name}
          </DialogTitle>
          <DialogDescription>
            Select the KRs you want to copy to {toQuarter.name}. They'll be reset to "not-started" with cleared actuals.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-6">
          {sourceKRs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No KRs found in {fromQuarter.name}</p>
              <p className="text-sm">Create some KRs first, then you can copy them to future quarters.</p>
            </div>
          ) : (
            <>
              {/* KR Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Select KRs to Copy</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={allSelected}
                        onCheckedChange={handleToggleAll}
                        className={cn(someSelected && !allSelected && "data-[state=checked]:bg-muted")}
                      />
                      <Label htmlFor="select-all" className="text-sm">
                        Select all ({krSelections.length} KRs)
                      </Label>
                    </div>
                    <Badge variant={selectedKRs.length > 0 ? "default" : "secondary"}>
                      {selectedKRs.length} selected
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>KR Title</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Owner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {krSelections.map(({ kr, selected }) => (
                        <TableRow
                          key={kr.id}
                          className={cn("cursor-pointer", selected && "bg-muted/50")}
                          onClick={() => handleToggleKR(kr.id)}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => handleToggleKR(kr.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{kr.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {kr.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {getTeamName(kr.teamId)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {kr.target} {kr.unit}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{kr.owner}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Target Adjustment */}
              {selectedKRs.length > 0 && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-medium">Target Adjustment</h3>
                  <RadioGroup
                    value={targetAdjustment}
                    onValueChange={(value) => setTargetAdjustment(value as TargetAdjustment)}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="keep" id="keep" />
                      <Label htmlFor="keep">Keep same targets</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="increase-10" id="increase-10" />
                      <Label htmlFor="increase-10">Increase targets by 10%</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="increase-20" id="increase-20" />
                      <Label htmlFor="increase-20">Increase targets by 20%</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom">Custom increase:</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={customPercentage}
                        onChange={(e) => setCustomPercentage(e.target.value)}
                        className="w-20"
                        min="0"
                        max="1000"
                        disabled={targetAdjustment !== 'custom'}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </RadioGroup>

                  {/* Preview of changes */}
                  <div className="bg-muted/30 p-3 rounded-md">
                    <h4 className="text-sm font-medium mb-2">Preview of changes:</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Quarter: {fromQuarter.name} → {toQuarter.name}
                      </div>
                      <div>Status: All KRs reset to "not-started"</div>
                      <div>Progress: Reset to 0, actuals cleared</div>
                      {targetAdjustment !== 'keep' && (
                        <div>
                          Targets: {
                            targetAdjustment === 'increase-10' ? '+10%' :
                            targetAdjustment === 'increase-20' ? '+20%' :
                            `+${customPercentage}%`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCopyKRs}
            disabled={selectedKRs.length === 0 || isProcessing || (targetAdjustment === 'custom' && !customPercentage)}
          >
            {isProcessing ? 'Copying...' : `Copy ${selectedKRs.length} KR${selectedKRs.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add global gtag type for analytics
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}