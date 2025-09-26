import { useState } from "react";
import { KR, KRComment, WeeklyActual } from "../types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { KRDetailDialog } from "./KRDetailDialog";
import { 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Database, 
  Save, 
  RefreshCw,
  BarChart3,
  AlertTriangle,
  Edit,
  Calendar
} from "lucide-react";

interface KRSpreadsheetViewProps {
  krs: KR[];
  teams: { id: string; name: string; color: string }[];
  onUpdateKR: (id: string, updates: Partial<KR>) => void;
  onAddComment: (krId: string, comment: Omit<KRComment, 'id' | 'krId' | 'timestamp'>) => void;
  onAddWeeklyActual: (krId: string, weeklyActual: Omit<WeeklyActual, 'id' | 'krId'>) => void;
  weeks: string[];
}

export function KRSpreadsheetView({ krs, teams, onUpdateKR, onAddComment, onAddWeeklyActual, weeks }: KRSpreadsheetViewProps) {
  const [editingKR, setEditingKR] = useState<KR | null>(null);
  const [commentingKR, setCommentingKR] = useState<string | null>(null);
  const [newComment, setNewComment] = useState({ content: '', type: 'general' as const, author: 'Current User' });

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'Unknown';
  const getTeamColor = (teamId: string) => teams.find(t => t.id === teamId)?.color || '#666';

  const statusConfig = {
    'not-started': { color: 'bg-gray-500', label: 'Not Started' },
    'on-track': { color: 'bg-green-500', label: 'On Track' },
    'at-risk': { color: 'bg-yellow-500', label: 'At Risk' },
    'off-track': { color: 'bg-red-500', label: 'Off Track' },
    'completed': { color: 'bg-blue-500', label: 'Completed' }
  };

  const handleKRUpdate = (krId: string, field: string, value: any) => {
    const kr = krs.find(k => k.id === krId);
    if (!kr) return;

    let updates: any = { [field]: value };
    
    // Auto-update status based on progress if progress is being changed
    if (field === 'progress') {
      const progress = parseInt(value) || 0;
      if (progress >= 100) {
        updates.status = 'completed';
      } else if (progress >= 75) {
        updates.status = 'on-track';
      } else if (progress >= 50) {
        updates.status = 'at-risk';
      } else if (progress > 0) {
        updates.status = 'at-risk';
      } else {
        updates.status = 'not-started';
      }
    }

    updates.lastUpdated = new Date().toISOString();
    onUpdateKR(krId, updates);
  };

  const handleAddComment = () => {
    if (commentingKR && newComment.content.trim()) {
      onAddComment(commentingKR, newComment);
      setNewComment({ content: '', type: 'general', author: 'Current User' });
      setCommentingKR(null);
    }
  };

  const calculateVariance = (kr: KR) => {
    const current = parseFloat(kr.current) || 0;
    const baseline = parseFloat(kr.baseline) || 0;
    const target = parseFloat(kr.target) || 0;
    
    if (target === baseline || isNaN(current) || isNaN(baseline) || isNaN(target)) return 0;
    
    const expectedAtProgress = baseline + ((target - baseline) * kr.progress / 100);
    return current - expectedAtProgress;
  };

  const calculateForecastVariance = (kr: KR) => {
    const current = parseFloat(kr.current) || 0;
    const forecast = parseFloat(kr.forecast || '0') || 0;
    return current - forecast;
  };

  const getLatestWeeklyActual = (kr: KR) => {
    if (kr.weeklyActuals.length === 0) return null;
    return kr.weeklyActuals.sort((a, b) => 
      new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()
    )[0];
  };

  const getWeekOverWeekChange = (kr: KR) => {
    if (kr.weeklyActuals.length < 2) return null;
    
    const sorted = [...kr.weeklyActuals].sort((a, b) => 
      new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()
    );
    
    const current = parseFloat(sorted[0]?.actual || '0');
    const previous = parseFloat(sorted[1]?.actual || '0');
    return current - previous;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                KR Execution Tracker
              </CardTitle>
              <p className="text-muted-foreground">
                Update progress, track vs plan, and manage forecasts
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh Auto-Updates
              </Button>
              <Button variant="outline" size="sm">
                <Database className="h-4 w-4 mr-1" />
                Export to CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">KR Title</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Baseline</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Weekly Actual</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Forecast</TableHead>
                  <TableHead>vs Plan</TableHead>
                  <TableHead>vs Forecast</TableHead>
                  <TableHead>WoW Change</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {krs.map((kr) => {
                  const variance = calculateVariance(kr);
                  const forecastVariance = calculateForecastVariance(kr);
                  const latestWeekly = getLatestWeeklyActual(kr);
                  const wowChange = getWeekOverWeekChange(kr);
                  
                  return (
                    <TableRow key={kr.id} className="group">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-8 rounded-sm" 
                            style={{ backgroundColor: getTeamColor(kr.teamId) }}
                          />
                          <div>
                            <div className="font-medium">{kr.title}</div>
                            <div className="text-xs text-muted-foreground">
                              Due: {kr.deadline ? new Date(kr.deadline).toLocaleDateString() : 'No deadline'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: getTeamColor(kr.teamId) }}>
                          {getTeamName(kr.teamId)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>{kr.owner}</TableCell>
                      
                      <TableCell>
                        <span className="text-sm">{kr.baseline} {kr.unit}</span>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm font-medium">{kr.target} {kr.unit}</span>
                      </TableCell>
                      
                      <TableCell>
                        <div 
                          className="cursor-pointer hover:bg-accent rounded px-2 py-1"
                          onClick={() => setEditingKR(kr)}
                        >
                          {kr.current} {kr.unit}
                        </div>
                      </TableCell>

                      <TableCell>
                        {latestWeekly ? (
                          <div className="text-sm">
                            <div className="font-medium">{latestWeekly.actual} {kr.unit}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(latestWeekly.weekOf).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer hover:bg-accent rounded px-2 py-1 text-muted-foreground text-sm"
                            onClick={() => setEditingKR(kr)}
                          >
                            No data
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(100, Math.max(0, kr.progress || 0))} className="w-16 h-2" />
                          <span className="text-sm font-medium w-8">{kr.progress}%</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div 
                          className="cursor-pointer hover:bg-accent rounded px-2 py-1"
                          onClick={() => setEditingKR(kr)}
                        >
                          {kr.forecast || '-'} {kr.forecast ? kr.unit : ''}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {variance > 0 ? (
                            <>
                              <TrendingUp className="h-3 w-3 text-green-500" />
                              <span className="text-green-600 text-sm">+{variance.toFixed(1)}</span>
                            </>
                          ) : variance < 0 ? (
                            <>
                              <TrendingDown className="h-3 w-3 text-red-500" />
                              <span className="text-red-600 text-sm">{variance.toFixed(1)}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">0</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          {forecastVariance > 0 ? (
                            <>
                              <TrendingUp className="h-3 w-3 text-green-500" />
                              <span className="text-green-600 text-sm">+{forecastVariance.toFixed(1)}</span>
                            </>
                          ) : forecastVariance < 0 ? (
                            <>
                              <TrendingDown className="h-3 w-3 text-red-500" />
                              <span className="text-red-600 text-sm">{forecastVariance.toFixed(1)}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">0</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {wowChange !== null ? (
                          <div className="flex items-center gap-1">
                            {wowChange > 0 ? (
                              <>
                                <TrendingUp className="h-3 w-3 text-green-500" />
                                <span className="text-green-600 text-sm">+{wowChange.toFixed(1)}</span>
                              </>
                            ) : wowChange < 0 ? (
                              <>
                                <TrendingDown className="h-3 w-3 text-red-500" />
                                <span className="text-red-600 text-sm">{wowChange.toFixed(1)}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground text-sm">0</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`${statusConfig[kr.status].color} text-white border-0`}
                        >
                          {statusConfig[kr.status].label}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => setEditingKR(kr)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>

                          <Dialog open={commentingKR === kr.id} onOpenChange={(open) => setCommentingKR(open ? kr.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Comment - {kr.title}</DialogTitle>
                                <DialogDescription>
                                  Add a comment about performance or forecast changes
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Comment Type</Label>
                                  <Select 
                                    value={newComment.type} 
                                    onValueChange={(value: any) => setNewComment(prev => ({ ...prev, type: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select comment type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="general">General Update</SelectItem>
                                      <SelectItem value="above-plan">Above Plan</SelectItem>
                                      <SelectItem value="below-plan">Below Plan</SelectItem>
                                      <SelectItem value="forecast-update">Forecast Update</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Comment</Label>
                                  <Textarea
                                    value={newComment.content}
                                    onChange={(e) => setNewComment(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="Explain the current performance or forecast changes..."
                                    rows={3}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setCommentingKR(null)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleAddComment}>
                                    Add Comment
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {kr.autoUpdateEnabled && (
                            <div className="flex items-center gap-1">
                              <Database className="h-3 w-3 text-blue-500" />
                            </div>
                          )}
                          
                          {kr.comments.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {kr.comments.length}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* KR Detail Dialog */}
      <KRDetailDialog
        kr={editingKR}
        isOpen={editingKR !== null}
        onClose={() => setEditingKR(null)}
        onUpdate={onUpdateKR}
        onAddWeeklyActual={onAddWeeklyActual}
        weeks={weeks}
      />
    </div>
  );
}