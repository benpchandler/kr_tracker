import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { Team, Pod } from "../types";

interface AddKRDialogProps {
  onAddKR: (kr: any) => void;
  teams: Team[];
  pods: Pod[];
}

export function AddKRDialog({ onAddKR, teams, pods }: AddKRDialogProps) {
  return (
    <Button size="sm" variant="secondary">
      <Plus className="h-4 w-4 mr-1" />
      Add KR
    </Button>
  );
}