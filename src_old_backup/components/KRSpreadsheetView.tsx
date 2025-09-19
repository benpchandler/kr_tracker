import { Card } from "./ui/card";
import { KR, Team } from "../types";

interface KRSpreadsheetViewProps {
  krs: KR[];
  teams: Team[];
  onUpdateKR: (id: string, updates: any) => void;
  onAddComment: (krId: string, comment: any) => void;
  onAddWeeklyActual: (krId: string, weeklyActual: any) => void;
}

export function KRSpreadsheetView({
  krs,
  teams,
  onUpdateKR,
  onAddComment,
  onAddWeeklyActual
}: KRSpreadsheetViewProps) {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">
        Spreadsheet view coming soon...
      </div>
    </Card>
  );
}