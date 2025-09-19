import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { Team } from "../types";

interface AddInitiativeDialogProps {
  onAddInitiative: (initiative: any) => void;
  teams: Team[];
}

export function AddInitiativeDialog({ onAddInitiative, teams }: AddInitiativeDialogProps) {
  return (
    <Button size="sm" variant="secondary">
      <Plus className="h-4 w-4 mr-1" />
      Add Initiative
    </Button>
  );
}