import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Slider } from "./ui/slider";
import {
  Calendar,
  Target,
  TrendingUp,
  Edit2,
  Save,
  X,
  Trash2,
} from "lucide-react";

interface KRCardProps {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: string;
  current: string;
  deadline: string;
  owner: string;
  team: string;
  status: "not-started" | "on-track" | "at-risk" | "off-track" | "completed";
  onUpdate?: (
    id: string,
    updates: {
      progress: number;
      current: string;
      status:
        | "not-started"
        | "on-track"
        | "at-risk"
        | "off-track"
        | "completed";
    },
  ) => void;
  onDelete?: (id: string) => void;
}

const statusConfig = {
  "not-started": { color: "bg-gray-500", label: "Not Started" },
  "on-track": { color: "bg-green-500", label: "On Track" },
  "at-risk": { color: "bg-yellow-500", label: "At Risk" },
  "off-track": { color: "bg-red-500", label: "Off Track" },
  completed: { color: "bg-blue-500", label: "Completed" },
};

export function KRCard({
  id,
  title,
  description,
  progress,
  target,
  current,
  deadline,
  owner,
  team,
  status,
  onUpdate,
  onDelete,
}: KRCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editProgress, setEditProgress] = useState(progress);
  const [editCurrent, setEditCurrent] = useState(current);

  // Ensure status is valid, fallback to 'not-started' if invalid
  const validStatus = statusConfig[status] ? status : 'not-started';

  const handleSave = () => {
    if (onUpdate) {
      // Auto-update status based on progress
      let newStatus = validStatus;
      if (editProgress >= 100) {
        newStatus = "completed";
      } else if (editProgress >= 75) {
        newStatus = "on-track";
      } else if (editProgress >= 50) {
        newStatus = "at-risk";
      } else if (editProgress > 0) {
        newStatus = "off-track";
      } else {
        newStatus = "not-started";
      }

      onUpdate(id, {
        progress: editProgress,
        current: editCurrent,
        status: newStatus,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditProgress(progress);
    setEditCurrent(current);
    setIsEditing(false);
  };
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="line-clamp-2">
              {title}
            </CardTitle>
            <p className="text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Badge
              variant="secondary"
              className={`${statusConfig[validStatus].color} text-white border-0`}
            >
              {statusConfig[validStatus].label}
            </Badge>
            {onUpdate && !isEditing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0"
                aria-label="Edit key result"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(id)}
                className="h-6 w-6 p-0 text-destructive"
                aria-label="Delete key result"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    Progress
                  </span>
                  <span className="font-medium">
                    {editProgress}%
                  </span>
                </div>
                <Slider
                  value={[editProgress]}
                  onValueChange={(value) =>
                    setEditProgress(value[0])
                  }
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    Current
                  </p>
                  <Input
                    value={editCurrent}
                    onChange={(e) =>
                      setEditCurrent(e.target.value)
                    }
                    placeholder="Current value"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    Target
                  </p>
                  <p className="font-medium py-2">{target}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="flex-1"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Progress
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Current</p>
                <p className="font-medium">{current}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Target</p>
                <p className="font-medium">{target}</p>
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Due {deadline}
          </span>
          <span>
            {owner} • {team}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
