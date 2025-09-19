import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Target, TrendingUp, TrendingDown, Minus, MessageSquare, Activity } from "lucide-react";

interface KRCardProps {
  id: string;
  title: string;
  description?: string;
  team: string;
  owner: string;
  status: string;
  target: string;
  current: string;
  progress: number;
  autoUpdateEnabled: boolean;
  onUpdate?: (id: string, updates: any) => void;
}

export function KRCard({
  id,
  title,
  description,
  team,
  owner,
  status,
  target,
  current,
  progress,
  autoUpdateEnabled,
  onUpdate
}: KRCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'off-track':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTrendIcon = () => {
    if (progress > 70) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (progress < 30) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-2">
          <Target className="h-5 w-5 text-primary" />
          <Badge className={getStatusColor(status)}>
            {status.replace('-', ' ')}
          </Badge>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className="font-medium">{progress}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Current: </span>
            <span className="font-medium">{current}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Target: </span>
            <span className="font-medium">{target}</span>
          </div>
        </div>

        {autoUpdateEnabled && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            Auto-updating
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1">
            <MessageSquare className="h-4 w-4 mr-1" />
            Comment
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            Update
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}