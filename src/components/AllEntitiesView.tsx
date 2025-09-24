import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Team, Pod, Person, OrgFunction } from "../types";
import { Search, Edit2, Trash2, Plus } from "lucide-react";

interface AllEntitiesViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  pods: Pod[];
  people: Person[];
  functions: OrgFunction[];
  entityType: "functions" | "teams" | "pods" | "people";
  onAddTeam?: () => void;
  onAddPod?: () => void;
  onAddPerson?: () => void;
  onAddFunction?: () => void;
  onEditTeam?: (team: Team) => void;
  onEditPod?: (pod: Pod) => void;
  onEditPerson?: (person: Person) => void;
  onEditFunction?: (func: OrgFunction) => void;
  onDeleteTeam?: (teamId: string) => void;
  onDeletePod?: (podId: string) => void;
  onDeletePerson?: (personId: string) => void;
  onDeleteFunction?: (functionId: string) => void;
}

export function AllEntitiesView({
  open,
  onOpenChange,
  teams,
  pods,
  people,
  functions,
  entityType,
  onAddTeam,
  onAddPod,
  onAddPerson,
  onAddFunction,
  onEditTeam,
  onEditPod,
  onEditPerson,
  onEditFunction,
  onDeleteTeam,
  onDeletePod,
  onDeletePerson,
  onDeleteFunction,
}: AllEntitiesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Helper functions
  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || "Unknown Team";
  const getPodName = (podId: string) => pods.find(p => p.id === podId)?.name || "-";
  const getFunctionName = (functionId: string) => functions.find(f => f.id === functionId)?.name || "Unknown Function";
  const getManagerName = (managerId: string) => {
    const manager = people.find(p => p.id === managerId);
    return manager ? manager.name : "-";
  };

  // Filter functions
  const filteredFunctions = functions.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPods = pods.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    getTeamName(p.teamId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getFunctionName(p.functionId).toLowerCase().includes(searchQuery.toLowerCase()) ||
    getTeamName(p.teamId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get counts for each entity type
  const getPeopleForFunction = (functionId: string) => people.filter(p => p.functionId === functionId);
  const getPodsForTeam = (teamId: string) => pods.filter(p => p.teamId === teamId);
  const getPeopleForTeam = (teamId: string) => people.filter(p => p.teamId === teamId);
  const getPeopleForPod = (podId: string) => people.filter(p => p.podId === podId);

  const entityConfig = {
    functions: {
      directoryTitle: "Functions Directory",
      searchPlaceholder: "Search functions...",
      addButtonLabel: "Add Function",
      listHeading: "All Functions",
    },
    teams: {
      directoryTitle: "Teams Directory",
      searchPlaceholder: "Search teams...",
      addButtonLabel: "Add Team",
      listHeading: "All Teams",
    },
    pods: {
      directoryTitle: "Pods Directory",
      searchPlaceholder: "Search pods...",
      addButtonLabel: "Add Pod",
      listHeading: "All Pods",
    },
    people: {
      directoryTitle: "People Directory",
      searchPlaceholder: "Search people...",
      addButtonLabel: "Add Person",
      listHeading: "All People",
    },
  } as const;

  const { directoryTitle, searchPlaceholder, addButtonLabel, listHeading } = entityConfig[entityType];

  const addHandlers = {
    functions: onAddFunction,
    teams: onAddTeam,
    pods: onAddPod,
    people: onAddPerson,
  } as const;

  const handleAdd = addHandlers[entityType];

  const actionContainerClass = "flex items-center gap-1";

  const renderHeader = () => (
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-sm font-medium">{listHeading}</h3>
      {handleAdd && (
        <Button onClick={() => handleAdd()} className="h-9 px-4 text-sm font-medium">
          <Plus className="h-4 w-4 mr-2" />
          {addButtonLabel}
        </Button>
      )}
    </div>
  );

  useEffect(() => {
    if (open) {
      setSearchQuery("");
    }
  }, [entityType, open]);

  const renderContent = () => {
    switch (entityType) {
      case "functions":
        return (
          <div className="mt-4">
            {renderHeader()}
            <div className="space-y-2">
              {filteredFunctions.map((func) => {
                const isClickable = Boolean(onEditFunction);
                return (
                  <div
                    key={func.id}
                    className={`group flex items-center justify-between p-3 bg-card border rounded-md hover:bg-accent/50 transition-colors ${isClickable ? "cursor-pointer" : ""}`}
                    onClick={isClickable ? () => onEditFunction?.(func) : undefined}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: func.color }}
                      />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{func.name}</span>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          {getPeopleForFunction(func.id).length} people
                        </Badge>
                      </div>
                      {func.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{func.description}</p>
                      )}
                    </div>
                    </div>
                    {(onEditFunction || onDeleteFunction) && (
                      <div className={actionContainerClass}>
                        {onEditFunction && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditFunction(func);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        {onDeleteFunction && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteFunction(func.id);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case "teams":
        return (
          <div className="mt-4">
            {renderHeader()}
            <div className="space-y-2">
              {filteredTeams.map((team) => {
                const isClickable = Boolean(onEditTeam);
                return (
                  <div
                    key={team.id}
                    className={`group flex items-center justify-between p-3 bg-card border rounded-md hover:bg-accent/50 transition-colors ${isClickable ? "cursor-pointer" : ""}`}
                    onClick={isClickable ? () => onEditTeam?.(team) : undefined}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-2 h-2 rounded flex-shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{team.name}</span>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          {getPodsForTeam(team.id).length} pods
                        </Badge>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          {getPeopleForTeam(team.id).length} people
                        </Badge>
                      </div>
                      {team.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{team.description}</p>
                      )}
                    </div>
                    </div>
                    {(onEditTeam || onDeleteTeam) && (
                      <div className={actionContainerClass}>
                        {onEditTeam && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTeam(team);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        {onDeleteTeam && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTeam(team.id);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case "pods":
        return (
          <div className="mt-4">
            {renderHeader()}
            <div className="space-y-2">
              {filteredPods.map((pod) => {
                const isClickable = Boolean(onEditPod);
                return (
                  <div
                    key={pod.id}
                    className={`group flex items-center justify-between p-3 bg-card border rounded-md hover:bg-accent/50 transition-colors ${isClickable ? "cursor-pointer" : ""}`}
                    onClick={isClickable ? () => onEditPod?.(pod) : undefined}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{pod.name}</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {getTeamName(pod.teamId)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {getPeopleForPod(pod.id).length} members
                      </Badge>
                    </div>
                    {pod.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{pod.description}</p>
                    )}
                    </div>
                    {(onEditPod || onDeletePod) && (
                      <div className={actionContainerClass}>
                        {onEditPod && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditPod(pod);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        {onDeletePod && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePod(pod.id);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case "people":
        return (
          <div className="mt-4">
            {renderHeader()}
            <div className="space-y-2">
              {filteredPeople.map((person) => {
                const isClickable = Boolean(onEditPerson);
                return (
                  <div
                    key={person.id}
                    className={`group flex items-center justify-between p-3 bg-card border rounded-md hover:bg-accent/50 transition-colors ${isClickable ? "cursor-pointer" : ""}`}
                    onClick={isClickable ? () => onEditPerson?.(person) : undefined}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{person.name}</span>
                      <span className="text-xs text-muted-foreground">{person.email}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {getFunctionName(person.functionId)}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {getTeamName(person.teamId)}
                      </Badge>
                      {person.podId && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {getPodName(person.podId)}
                        </Badge>
                      )}
                      {person.managerId && (
                        <span className="text-xs text-muted-foreground">
                          Reports to: {getManagerName(person.managerId)}
                        </span>
                      )}
                    </div>
                    </div>
                    {(onEditPerson || onDeletePerson) && (
                      <div className={actionContainerClass}>
                        {onEditPerson && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditPerson(person);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        {onDeletePerson && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePerson(person.id);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[75vh] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-lg">{directoryTitle}</DialogTitle>
          <div className="mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8"
              />
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4">{renderContent()}</ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
