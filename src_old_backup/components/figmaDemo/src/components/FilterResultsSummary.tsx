import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { FilterOptions } from "../types";
import { Filter } from "lucide-react";

interface FilterResultsSummaryProps {
  totalKRs: number;
  totalInitiatives: number;
  filteredKRs: number;
  filteredInitiatives: number;
  activeFilters: FilterOptions;
  currentTab: 'krs' | 'initiatives';
}

export function FilterResultsSummary({ 
  totalKRs, 
  totalInitiatives, 
  filteredKRs, 
  filteredInitiatives, 
  activeFilters, 
  currentTab 
}: FilterResultsSummaryProps) {
  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  
  if (!hasActiveFilters) return null;

  const currentTotal = currentTab === 'krs' ? totalKRs : totalInitiatives;
  const currentFiltered = currentTab === 'krs' ? filteredKRs : filteredInitiatives;
  const currentType = currentTab === 'krs' ? 'KRs' : 'Initiatives';
  
  const filterPercentage = currentTotal > 0 ? Math.round((currentFiltered / currentTotal) * 100) : 0;
  
  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Showing <span className="font-medium">{currentFiltered}</span> of <span className="font-medium">{currentTotal}</span> {currentType}
              <span className="text-muted-foreground ml-1">({filterPercentage}%)</span>
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {Object.entries(activeFilters).slice(0, 3).map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-xs">
                {key}: {value}
              </Badge>
            ))}
            {Object.keys(activeFilters).length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{Object.keys(activeFilters).length - 3} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}