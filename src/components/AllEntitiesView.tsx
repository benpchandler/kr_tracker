import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Team, Pod, Person, OrgFunction } from "../types";
import { Building2, Users, User, Puzzle, Search, Edit2, Trash2, Plus } from "lucide-react";

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
  const getPodName = (podId: string) => pods.find(p => p.id === podId)?.name || "Unknown Pod";
  const getFunctionName = (functionId: string) => functions.find(f => f.id === functionId)?.name || "Unknown Function";
  const getManagerName = (managerId: string) => people.find(p => p.id === managerId)?.name || "None";

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
  const getPodsForTeam = (teamId: string) => pods.filter(p => p.teamId === teamId);
  const getPeopleForTeam = (teamId: string) => people.filter(p => p.teamId === teamId);
  const getPeopleForPod = (podId: string) => people.filter(p => p.podId === podId);
  const getPeopleForFunction = (functionId: string) => people.filter(p => p.functionId === functionId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Organization Directory</DialogTitle>
          <DialogDescription>
            View and manage all teams, pods, people, and functions in your organization
          </DialogDescription>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search across all entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "functions" | "teams" | "pods" | "people")} className="flex-1 flex flex-col">
          <TabsList className="mx-6 grid w-auto grid-cols-4">
            <TabsTrigger value="functions" className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" />
              Functions ({filteredFunctions.length})
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Teams ({filteredTeams.length})
            </TabsTrigger>
            <TabsTrigger value="pods" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pods ({filteredPods.length})
            </TabsTrigger>
            <TabsTrigger value="people" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              People ({filteredPeople.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="functions" className="px-6 pb-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">All Functions</h3>
                {onAddFunction && (
                  <Button onClick={onAddFunction} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Function
                  </Button>
                )}
              </div>
              <div className="grid gap-4">
                {filteredFunctions.map((func) => (
                  <Card key={func.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: func.color }}
                          />
                          <CardTitle className="text-base">{func.name}</CardTitle>
                          <Badge variant="secondary">
                            {getPeopleForFunction(func.id).length} people
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {onEditFunction && (
                            <Button
                              onClick={() => onEditFunction(func)}
                              size="sm"
                              variant="ghost"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {onDeleteFunction && (
                            <Button
                              onClick={() => onDeleteFunction(func.id)}
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {func.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{func.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="teams" className="px-6 pb-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">All Teams</h3>
                {onAddTeam && (
                  <Button onClick={onAddTeam} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team
                  </Button>
                )}
              </div>
              <div className="grid gap-4">
                {filteredTeams.map((team) => (
                  <Card key={team.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          <CardTitle className="text-base">{team.name}</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="secondary">
                              {getPodsForTeam(team.id).length} pods
                            </Badge>
                            <Badge variant="secondary">
                              {getPeopleForTeam(team.id).length} people
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {onEditTeam && (
                            <Button
                              onClick={() => onEditTeam(team)}
                              size="sm"
                              variant="ghost"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {onDeleteTeam && (
                            <Button
                              onClick={() => onDeleteTeam(team.id)}
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {team.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{team.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pods" className="px-6 pb-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">All Pods</h3>
                {onAddPod && (
                  <Button onClick={onAddPod} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Pod
                  </Button>
                )}
              </div>
              <div className="grid gap-4">
                {filteredPods.map((pod) => (
                  <Card key={pod.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-base">{pod.name}</CardTitle>
                          <Badge>{getTeamName(pod.teamId)}</Badge>
                          <Badge variant="secondary">
                            {getPeopleForPod(pod.id).length} members
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {onEditPod && (
                            <Button
                              onClick={() => onEditPod(pod)}
                              size="sm"
                              variant="ghost"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {onDeletePod && (
                            <Button
                              onClick={() => onDeletePod(pod.id)}
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {pod.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{pod.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="people" className="px-6 pb-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">All People</h3>
                {onAddPerson && (
                  <Button onClick={onAddPerson} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Person
                  </Button>
                )}
              </div>
              <div className="grid gap-4">
                {filteredPeople.map((person) => (
                  <Card key={person.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{person.name}</CardTitle>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{person.email}</span>
                            <Badge variant="outline">
                              {getFunctionName(person.functionId)}
                            </Badge>
                            <Badge variant="outline">
                              {getTeamName(person.teamId)}
                            </Badge>
                            {person.podId && (
                              <Badge variant="outline">
                                {getPodName(person.podId)}
                              </Badge>
                            )}
                            {person.managerId && (
                              <span>Reports to: {getManagerName(person.managerId)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {onEditPerson && (
                            <Button
                              onClick={() => onEditPerson(person)}
                              size="sm"
                              variant="ghost"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {onDeletePerson && (
                            <Button
                              onClick={() => onDeletePerson(person.id)}
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}