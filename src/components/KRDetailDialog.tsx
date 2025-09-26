import { useState, useEffect } from "react";
import { KR, WeeklyActual } from "../types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { PlanOverridePanel } from "./PlanOverridePanel";
import { 
  Save, 
  X, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Plus
} from "lucide-react";

interface KRDetailDialogProps {
  kr: KR | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<KR>) => void;
  onAddWeeklyActual: (krId: string, weeklyActual: Omit<WeeklyActual, 'id' | 'krId'>) => void;
  weeks?: string[];
}

export function KRDetailDialog({ kr, isOpen, onClose, onUpdate, onAddWeeklyActual, weeks }: KRDetailDialogProps) {
  const [editData, setEditData] = useState({
    current: '',
    progress: 0,
    forecast: '',
    status: 'on-track' as KR['status']
  });
  
  const [newWeeklyActual, setNewWeeklyActual] = useState({
    weekOf: '',
    actual: '',
    notes: ''
  });

  useEffect(() => {
    if (kr) {
      setEditData({
        current: kr.current,
        progress: kr.progress,
        forecast: kr.forecast || '',
        status: kr.status
      });
      
      // Set current week as default
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      setNewWeeklyActual({
        weekOf: startOfWeek.toISOString().split('T')[0],
        actual: kr.current,
        notes: ''
      });
    }
  }, [kr]);

  if (!kr) return null;

  const handleSave = () => {
    // Auto-update status based on progress
    let newStatus = editData.status;
    if (editData.progress >= 100) {
      newStatus = 'completed';
    } else if (editData.progress >= 75) {
      newStatus = 'on-track';
    } else if (editData.progress >= 50) {
      newStatus = 'at-risk';
    } else if (editData.progress > 0) {
      newStatus = 'at-risk';
    } else {
      newStatus = 'not-started';
    }

    onUpdate(kr.id, {
      current: editData.current,
      progress: editData.progress,
      forecast: editData.forecast,
      status: newStatus,
      lastUpdated: new Date().toISOString()
    });
    onClose();
  };

  const handleAddWeeklyActual = () => {
    if (newWeeklyActual.weekOf && newWeeklyActual.actual) {
      const baseline = parseFloat(kr.baseline) || 0;
      const target = parseFloat(kr.target) || 0;
      const actual = parseFloat(newWeeklyActual.actual) || 0;
      const forecast = parseFloat(kr.forecast || '0') || 0;
      
      // Calculate expected value for this week based on progress
      const expectedAtProgress = baseline + ((target - baseline) * kr.progress / 100);
      const variance = actual - expectedAtProgress;
      const forecastVariance = actual - forecast;

      onAddWeeklyActual(kr.id, {
        weekOf: newWeeklyActual.weekOf,
        actual: newWeeklyActual.actual,
        variance,
        forecastVariance,
        notes: newWeeklyActual.notes,
        enteredBy: 'Current User',
        enteredAt: new Date().toISOString()
      });
      
      setNewWeeklyActual({
        weekOf: '',
        actual: '',
        notes: ''
      });
    }
  };

  const statusConfig = {
    'not-started': { color: 'bg-gray-500', label: 'Not Started' },
    'on-track': { color: 'bg-green-500', label: 'On Track' },
    'at-risk': { color: 'bg-yellow-500', label: 'At Risk' },
    'off-track': { color: 'bg-red-500', label: 'Off Track' },
    'completed': { color: 'bg-blue-500', label: 'Completed' }
  };

  const getWeekOverWeekChange = () => {
    if (kr.weeklyActuals.length < 2) return null;
    
    const sorted = [...kr.weeklyActuals].sort((a, b) => 
      new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()
    );
    
    const current = parseFloat(sorted[0]?.actual || '0');
    const previous = parseFloat(sorted[1]?.actual || '0');
    const change = current - previous;
    
    return { change, percentage: previous !== 0 ? (change / previous) * 100 : 0 };
  };

  const weekOverWeek = getWeekOverWeekChange();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {kr.title}
          </DialogTitle>
          <DialogDescription>
            Update progress, add weekly actuals, and track performance
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Update Section */}
          <div className="space-y-4">
            <div>
              <h3 className="flex items-center gap-2 mb-4">
                Progress Update
                <Badge 
                  variant="secondary" 
                  className={`${statusConfig[editData.status].color} text-white border-0`}
                >
                  {statusConfig[editData.status].label}
                </Badge>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Current Value</Label>
                  <Input
                    value={editData.current}
                    onChange={(e) => setEditData(prev => ({ ...prev, current: e.target.value }))}
                    placeholder={`Current ${kr.unit}`}
                  />
                </div>

                <div>
                  <Label>Forecast</Label>
                  <Input
                    value={editData.forecast}
                    onChange={(e) => setEditData(prev => ({ ...prev, forecast: e.target.value }))}
                    placeholder={`Forecast ${kr.unit}`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Progress</Label>
                    <span className="font-medium">{editData.progress}%</span>
                  </div>
                  <Slider
                    value={[editData.progress]}
                    onValueChange={(value) => setEditData(prev => ({ ...prev, progress: value[0] }))}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <Progress value={editData.progress} className="h-2 mt-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Baseline</p>
                    <p className="font-medium">{kr.baseline} {kr.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Target</p>
                    <p className="font-medium">{kr.target} {kr.unit}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Week-over-Week Analysis */}
            {weekOverWeek && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Week-over-Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {weekOverWeek.change > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : weekOverWeek.change < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : null}
                    <span className={`font-medium ${
                      weekOverWeek.change > 0 ? 'text-green-600' : 
                      weekOverWeek.change < 0 ? 'text-red-600' : 
                      'text-muted-foreground'
                    }`}>
                      {weekOverWeek.change > 0 ? '+' : ''}{weekOverWeek.change.toFixed(1)} {kr.unit}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({weekOverWeek.percentage > 0 ? '+' : ''}{weekOverWeek.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Weekly Actuals Section */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <PlanOverridePanel kr={kr} weeks={weeks} condensed />
              </CardContent>
            </Card>

            <div>
              <h3 className="mb-4">Weekly Actuals</h3>
              
              {/* Add New Weekly Actual */}
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Weekly Actual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Week Of</Label>
                      <Input
                        type="date"
                        value={newWeeklyActual.weekOf}
                        onChange={(e) => setNewWeeklyActual(prev => ({ ...prev, weekOf: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Actual Value</Label>
                      <Input
                        value={newWeeklyActual.actual}
                        onChange={(e) => setNewWeeklyActual(prev => ({ ...prev, actual: e.target.value }))}
                        placeholder={`Actual ${kr.unit}`}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={newWeeklyActual.notes}
                      onChange={(e) => setNewWeeklyActual(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any notes about this week's performance..."
                      rows={2}
                    />
                  </div>
                  <Button 
                    onClick={handleAddWeeklyActual} 
                    className="w-full"
                    disabled={!newWeeklyActual.weekOf || !newWeeklyActual.actual}
                  >
                    Add Weekly Actual
                  </Button>
                </CardContent>
              </Card>

              {/* Weekly Actuals History */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {kr.weeklyActuals
                  .sort((a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime())
                  .map((weekly, index) => (
                    <Card key={weekly.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {new Date(weekly.weekOf).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{weekly.actual} {kr.unit}</div>
                          <div className="flex items-center gap-1 text-xs">
                            {weekly.variance > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : weekly.variance < 0 ? (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            ) : null}
                            <span className={
                              weekly.variance > 0 ? 'text-green-600' : 
                              weekly.variance < 0 ? 'text-red-600' : 
                              'text-muted-foreground'
                            }>
                              {weekly.variance > 0 ? '+' : ''}{weekly.variance.toFixed(1)} vs plan
                            </span>
                          </div>
                        </div>
                      </div>
                      {weekly.notes && (
                        <p className="text-xs text-muted-foreground mt-2">{weekly.notes}</p>
                      )}
                    </Card>
                  ))}
                
                {kr.weeklyActuals.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No weekly actuals recorded yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}