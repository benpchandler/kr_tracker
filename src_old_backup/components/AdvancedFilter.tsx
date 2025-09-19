import { Card } from "./ui/card";
import { Team, Pod, KR, Initiative, Quarter, FilterOptions, AppMode } from "../types";

interface AdvancedFilterProps {
  teams: Team[];
  pods: Pod[];
  krs: KR[];
  initiatives: Initiative[];
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  mode: AppMode;
  quarters: Quarter[];
}

export function AdvancedFilter({
  teams,
  pods,
  krs,
  initiatives,
  filters,
  onFiltersChange,
  mode,
  quarters
}: AdvancedFilterProps) {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">
        Advanced filters coming soon...
      </div>
    </Card>
  );
}