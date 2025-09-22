import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Target, Lightbulb, Trash2, Edit2, Plus } from "lucide-react";

type ViewType = 'objectives' | 'krs' | 'initiatives';

interface Objective {
  id: string;
  title: string;
  description?: string;
  status?: string;
  krCount?: number;
  initiativeCount?: number;
}

interface KR {
  id: string;
  title: string;
  description?: string;
  teamId: string;
  teamName?: string;
  progress?: number;
  status?: string;
}

interface Initiative {
  id: string;
  title: string;
  description?: string;
  teamId: string;
  teamName?: string;
  linkedKRIds?: string[];
  status?: string;
}

interface ViewAllModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ViewType;
  items: (Objective | KR | Initiative)[];
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onAdd?: () => void;
  getTeamName?: (teamId: string) => string;
}

export function ViewAllModal({
  open,
  onOpenChange,
  type,
  items,
  onDelete,
  onEdit,
  onAdd,
  getTeamName
}: ViewAllModalProps) {
  const getTitle = () => {
    switch (type) {
      case 'objectives':
        return 'All Objectives';
      case 'krs':
        return 'All Key Results';
      case 'initiatives':
        return 'All Initiatives';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'objectives':
        return 'Manage your strategic objectives that group key results';
      case 'krs':
        return 'View and manage all key results across teams';
      case 'initiatives':
        return 'View and manage all strategic initiatives';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'objectives':
        return <Target className="h-5 w-5 rotate-45" />;
      case 'krs':
        return <Target className="h-5 w-5" />;
      case 'initiatives':
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  const renderObjective = (item: Objective) => (
    <div key={item.id} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <h4 className="font-medium">{item.title}</h4>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs">
            {item.krCount !== undefined && (
              <span className="text-muted-foreground">{item.krCount} KRs</span>
            )}
            {item.initiativeCount !== undefined && (
              <span className="text-muted-foreground">{item.initiativeCount} initiatives</span>
            )}
            {item.status && (
              <Badge variant="outline" className="text-xs">
                {item.status}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-4">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item.id)}
              className="h-8 w-8"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item.id)}
              className="h-8 w-8 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderKR = (item: KR) => (
    <div key={item.id} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <h4 className="font-medium">{item.title}</h4>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs">
            {item.teamName && (
              <Badge variant="secondary" className="text-xs">
                {item.teamName}
              </Badge>
            )}
            {item.progress !== undefined && (
              <span className="text-muted-foreground">Progress: {item.progress}%</span>
            )}
            {item.status && (
              <Badge variant="outline" className="text-xs">
                {item.status}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-4">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item.id)}
              className="h-8 w-8"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item.id)}
              className="h-8 w-8 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderInitiative = (item: Initiative) => (
    <div key={item.id} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <h4 className="font-medium">{item.title}</h4>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs">
            {item.teamName && (
              <Badge variant="secondary" className="text-xs">
                {item.teamName}
              </Badge>
            )}
            {item.linkedKRIds && item.linkedKRIds.length > 0 && (
              <span className="text-muted-foreground">
                Linked to {item.linkedKRIds.length} KR{item.linkedKRIds.length !== 1 ? 's' : ''}
              </span>
            )}
            {item.status && (
              <Badge variant="outline" className="text-xs">
                {item.status}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-4">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item.id)}
              className="h-8 w-8"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item.id)}
              className="h-8 w-8 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderItem = (item: any) => {
    switch (type) {
      case 'objectives':
        return renderObjective(item as Objective);
      case 'krs':
        return renderKR({
          ...item,
          teamName: getTeamName ? getTeamName(item.teamId) : item.teamId
        } as KR);
      case 'initiatives':
        return renderInitiative({
          ...item,
          teamName: getTeamName ? getTeamName(item.teamId) : item.teamId
        } as Initiative);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getIcon()}
              {getTitle()}
              <Badge variant="secondary" className="ml-2">
                {items.length} total
              </Badge>
            </div>
            {onAdd && (
              <Button onClick={onAdd} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add {type === 'objectives' ? 'Objective' : type === 'krs' ? 'KR' : 'Initiative'}
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="mt-4 max-h-[60vh] pr-4">
          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map(renderItem)}
            </div>
          ) : (
            <div className="text-center py-12">
              {getIcon()}
              <p className="mt-4 text-muted-foreground">
                No {type} found. Click the Add button to create your first one.
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}