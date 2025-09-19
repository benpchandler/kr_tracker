import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";

interface TeamFilterProps {
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  teams: string[];
  counts?: Record<string, number>;
}

export function TeamFilter({ selectedTeam, onTeamChange, teams, counts }: TeamFilterProps) {
  return (
    <div className="relative inline-block text-left">
      <Button variant="outline" className="flex items-center gap-2">
        {selectedTeam === 'all' ? 'All Teams' : selectedTeam}
        <ChevronDown className="h-4 w-4" />
      </Button>
      {/* TODO: Add dropdown menu implementation */}
    </div>
  );
}