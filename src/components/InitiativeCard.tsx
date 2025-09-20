import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Calendar, Users, Flag, Trash2 } from "lucide-react";

type PriorityKey = 'high' | 'medium' | 'low';

interface InitiativeCardProps {
  id: string;
  title: string;
  description: string;
  priority?: string | null;
  status: string;
  team: string;
  owner: string;
  contributors?: string[];
  deadline?: string | null;
  tags?: string[];
  onDelete?: (id: string) => void;
}

type PriorityDisplayConfig = { color: string; label: string };

const priorityConfig: Record<PriorityKey, PriorityDisplayConfig> = {
  high: { color: 'bg-red-100 text-red-800 border-red-200', label: 'High' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium' },
  low: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Low' }
};

const fallbackPriorityConfig: PriorityDisplayConfig = {
  color: 'bg-gray-100 text-gray-800 border-gray-200',
  label: 'Priority Unknown'
};

const isValidPriority = (value: unknown): value is PriorityKey =>
  value === 'high' || value === 'medium' || value === 'low';

const getPriorityInfo = (priority: InitiativeCardProps['priority']): PriorityDisplayConfig => {
  if (typeof priority === 'string') {
    const normalizedPriority = priority.toLowerCase();
    if (isValidPriority(normalizedPriority)) {
      return priorityConfig[normalizedPriority];
    }
  }
  return fallbackPriorityConfig;
};

const statusConfig = {
  planning: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Planning' },
  'in-progress': { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'In Progress' },
  'on-hold': { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'On Hold' },
  completed: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelled' }
};

export function InitiativeCard({
  id,
  title,
  description,
  priority,
  status,
  team,
  owner,
  contributors = [],
  deadline,
  tags = [],
  onDelete,
}: InitiativeCardProps) {
  const priorityInfo = getPriorityInfo(priority);
  const statusInfo = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.planning;

  const formattedDeadline =
    typeof deadline === 'string' && deadline.trim().length > 0
      ? deadline
      : 'No deadline set';

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="line-clamp-1">{title}</CardTitle>
              <Badge variant="outline" className={priorityInfo.color}>
                <Flag className="h-3 w-3 mr-1" />
                {priorityInfo.label}
              </Badge>
            </div>
            <p className="text-muted-foreground line-clamp-2">{description}</p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Badge variant="outline" className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(id)}
                className="h-6 w-6 p-0 text-destructive"
                aria-label="Delete initiative"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {contributors.slice(0, 3).map((contributor, index) => (
                <Avatar key={index} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-xs">
                    {contributor
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
              ))}
              {contributors.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                  +{contributors.length - 3}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formattedDeadline}
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <span>{owner} • {team}</span>
        </div>
      </CardContent>
    </Card>
  );
}
