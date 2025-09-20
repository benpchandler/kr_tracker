import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Team, Pod, Person, OrgFunction } from "../types";
import { Building2, Users, User, Puzzle, Search, Edit2, Trash2, Plus, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface AllEntitiesViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  pods: Pod[];
  people: Person[];
  functions: OrgFunction[];
  initialTab?: "functions" | "teams" | "pods" | "people";
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
  initialTab = "functions",
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
  const [activeTab, setActiveTab] = useState(initialTab);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[75vh] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-lg">Organization Directory</DialogTitle>
          <div className="mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search across all entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 grid w-auto grid-cols-4">
            <TabsTrigger value="functions" className="text-xs">
              <Puzzle className="h-3 w-3 mr-1" />
              Functions ({filteredFunctions.length})
            </TabsTrigger>
            <TabsTrigger value="teams" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              Teams ({filteredTeams.length})
            </TabsTrigger>
            <TabsTrigger value="pods" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Pods ({filteredPods.length})
            </TabsTrigger>
            <TabsTrigger value="people" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              People ({filteredPeople.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-4">
            <TabsContent value="functions" className="mt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium">All Functions</h3>
                {onAddFunction && (
                  <Button onClick={onAddFunction} size="sm" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Function
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {filteredFunctions.map((func) => (
                  <div
                    key={func.id}
                    className="group flex items-center justify-between p-3 bg-card border rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onEditFunction?.(func)}
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditFunction?.(func);
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete function "${func.name}"?`)) {
                            onDeleteFunction?.(func.id);
                          }
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="teams" className="mt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium">All Teams</h3>
                {onAddTeam && (
                  <Button onClick={onAddTeam} size="sm" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Team
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {filteredTeams.map((team) => (
                  <div
                    key={team.id}
                    className="group flex items-center justify-between p-3 bg-card border rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onEditTeam?.(team)}
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTeam?.(team);
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete team "${team.name}"?`)) {
                            onDeleteTeam?.(team.id);
                          }
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pods" className="mt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium">All Pods</h3>
                {onAddPod && (
                  <Button onClick={onAddPod} size="sm" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Pod
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {filteredPods.map((pod) => (
                  <div
                    key={pod.id}
                    className="group flex items-center justify-between p-3 bg-card border rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onEditPod?.(pod)}
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPod?.(pod);
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete pod "${pod.name}"?`)) {
                            onDeletePod?.(pod.id);
                          }
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="people" className="mt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium">All People</h3>
                {onAddPerson && (
                  <Button onClick={onAddPerson} size="sm" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Person
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {filteredPeople.map((person) => (
                  <div
                    key={person.id}
                    className="group flex items-center justify-between p-3 bg-card border rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onEditPerson?.(person)}
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPerson?.(person);
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove "${person.name}" from the organization?`)) {
                            onDeletePerson?.(person.id);
                          }
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}