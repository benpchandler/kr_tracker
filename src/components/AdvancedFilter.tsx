import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Filter, X } from "lucide-react";
import { Team, Pod, KR, Initiative, FilterOptions, FilterType as _FilterType } from "../types";

interface AdvancedFilterProps {
  teams: Team[];
  pods: Pod[];
  krs: KR[];
  initiatives: Initiative[];
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  mode: 'plan' | 'execution';
  quarters?: { id: string; name: string; }[];
}

export function AdvancedFilter({ 
  teams, 
  pods, 
  krs, 
  initiatives, 
  filters, 
  onFiltersChange,
  mode,
  quarters = []
}: AdvancedFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Get unique owners from KRs and initiatives
  const krOwners = [...new Set(krs.map(kr => kr.owner))];
  const initiativeOwners = [...new Set(initiatives.map(init => init.owner))];
  const allOwners = [...new Set([...krOwners, ...initiativeOwners])].sort();
  
  // Get unique status values
  const krStatuses = [...new Set(krs.map(kr => kr.status))];
  const initiativeStatuses = [...new Set(initiatives.map(init => init.status))];
  const allStatuses = [...new Set([...krStatuses, ...initiativeStatuses])].sort();
  
  // Get unique priorities
  const allPriorities = [...new Set(initiatives.map(init => init.priority))].sort();

  // Get pods for selected team
  const availablePods = filters.team && filters.team !== 'all' 
    ? pods.filter(pod => {
        const team = teams.find(t => t.name === filters.team);
        return team && pod.teamId === team.id;
      })
    : pods;

  // Get KRs for selected team/pod
  const availableKRs = krs.filter(kr => {
    if (filters.team && filters.team !== 'all') {
      const team = teams.find(t => t.name === filters.team);
      if (!team) return false;
      
      // Check if KR belongs to this team (considering multi-team KRs)
      const belongsToTeam = kr.teamIds?.includes(team.id) || kr.teamId === team.id;
      if (!belongsToTeam) return false;
    }
    
    if (filters.pod && filters.pod !== 'all') {
      const pod = pods.find(p => p.name === filters.pod);
      if (!pod || kr.podId !== pod.id) return false;
    }
    
    return true;
  });

  const handleFilterChange = (type: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters };
    
    if (value === 'all' || value === '') {
      delete newFilters[type];
    } else {
      newFilters[type] = value;
    }

    // Clear dependent filters
    if (type === 'team') {
      delete newFilters.pod;
      delete newFilters.kr;
    } else if (type === 'pod') {
      delete newFilters.kr;
    }

    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;
  const activeFilterCount = Object.keys(filters).length;

  const _getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'Unknown';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Team Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Team</label>
                <Select 
                  value={filters.team || 'all'} 
                  onValueChange={(value) => handleFilterChange('team', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.name}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pod Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Pod</label>
                <Select 
                  value={filters.pod || 'all'} 
                  onValueChange={(value) => handleFilterChange('pod', value)}
                  disabled={!filters.team || filters.team === 'all'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Pods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pods</SelectItem>
                    <SelectItem value="None">No Pod Assigned</SelectItem>
                    {availablePods.map((pod) => (
                      <SelectItem key={pod.id} value={pod.name}>
                        {pod.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* KR Filter (only in execution mode) */}
              {mode === 'execution' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Key Result</label>
                  <Select 
                    value={filters.kr || 'all'} 
                    onValueChange={(value) => handleFilterChange('kr', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All KRs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All KRs</SelectItem>
                      {availableKRs.map((kr) => (
                        <SelectItem key={kr.id} value={kr.title}>
                          {kr.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quarter Filter */}
              {quarters.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quarter</label>
                  <Select 
                    value={filters.quarter || 'all'} 
                    onValueChange={(value) => handleFilterChange('quarter', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Quarters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Quarters</SelectItem>
                      {quarters.map((quarter) => (
                        <SelectItem key={quarter.id} value={quarter.name}>
                          {quarter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Owner Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Owner</label>
                <Select 
                  value={filters.owner || 'all'} 
                  onValueChange={(value) => handleFilterChange('owner', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Owners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    {allOwners.map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={filters.status || 'all'} 
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {allStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('-', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter (for initiatives) */}
              {mode === 'execution' && allPriorities.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select 
                    value={filters.priority || 'all'} 
                    onValueChange={(value) => handleFilterChange('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {allPriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {Object.entries(filters).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="flex items-center gap-1">
                    <span className="capitalize">{key}:</span>
                    <span>{value}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => handleFilterChange(key as keyof FilterOptions, 'all')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}