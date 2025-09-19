import { Card } from "./ui/card";
import { FilterOptions } from "../types";

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
  const filterCount = Object.keys(activeFilters).length;

  return (
    <Card className="p-4 bg-muted/50">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="font-medium">{filterCount} filters active</span>
          <span className="text-muted-foreground ml-2">
            Showing {currentTab === 'krs' ? `${filteredKRs} of ${totalKRs} KRs` : `${filteredInitiatives} of ${totalInitiatives} initiatives`}
          </span>
        </div>
      </div>
    </Card>
  );
}