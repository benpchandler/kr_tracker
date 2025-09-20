import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";

interface TeamFilterProps {
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  teams: string[];
  counts: Record<string, number>;
}

export function TeamFilter({ selectedTeam, onTeamChange, teams, counts }: TeamFilterProps) {
  // Deduplicate teams to prevent duplicate keys
  const uniqueTeams = Array.from(new Set(teams));
  
  return (
    <div className="flex items-center gap-4">
      <Select value={selectedTeam} onValueChange={onTeamChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teams</SelectItem>
          {uniqueTeams.map((team, index) => (
            <SelectItem key={`${team}-${index}`} value={team}>
              {team}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedTeam !== "all" && (
        <Badge variant="secondary">
          {counts[selectedTeam] || 0} items
        </Badge>
      )}
    </div>
  );
}
