import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Lightbulb, Calendar, Users } from "lucide-react";

interface InitiativeCardProps {
  id: string;
  title: string;
  description?: string;
  team: string;
  owner: string;
  status: string;
  priority: string;
  impact: number;
  confidence: number;
  progress: number;
  startDate?: string;
  endDate?: string;
}

export function InitiativeCard({
  id,
  title,
  description,
  team,
  owner,
  status,
  priority,
  impact,
  confidence,
  progress,
  startDate,
  endDate
}: InitiativeCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'on-hold':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <div className="flex gap-2">
            <Badge className={getPriorityColor(priority)}>
              {priority}
            </Badge>
            <Badge className={getStatusColor(status)}>
              {status.replace('-', ' ')}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Team</span>
          <Badge variant="outline">{team}</Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Owner</span>
          <span className="font-medium">{owner}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Impact: </span>
            <span className="font-medium">{impact}/10</span>
          </div>
          <div>
            <span className="text-muted-foreground">Confidence: </span>
            <span className="font-medium">{confidence}/10</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {(startDate || endDate) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {startDate && new Date(startDate).toLocaleDateString()}
            {startDate && endDate && ' - '}
            {endDate && new Date(endDate).toLocaleDateString()}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Users className="h-4 w-4 mr-1" />
            Team
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}