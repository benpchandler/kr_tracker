import { useState } from "react";
import { Team, Pod, PodMember, Person, FunctionType } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Plus, Users, Building2, Edit2, Trash2, X, ChevronDown, ChevronRight, User } from "lucide-react";

interface OrganizationManagerProps {
  teams: Team[];
  pods: Pod[];
  people: Person[];
  onTeamsChange: (teams: Team[]) => void;
  onPodsChange: (pods: Pod[]) => void;
  onPeopleChange: (people: Person[]) => void;
}

export function OrganizationManager({ teams, pods, people, onTeamsChange, onPodsChange, onPeopleChange }: OrganizationManagerProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isAddingPod, setIsAddingPod] = useState(false);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '', color: '#3B82F6' });
  const [newPod, setNewPod] = useState({ name: '', teamId: '', description: '', members: [] as PodMember[] });
  const [newPerson, setNewPerson] = useState({ name: '', email: '', function: 'Product' as FunctionType, managerId: '', teamId: '', podId: '' });
  const [currentMember, setCurrentMember] = useState({ name: '', role: 'Product' as const });

  // Static options arrays to prevent render issues
  const ROLE_OPTIONS = [
    { value: 'Analytics', label: 'Analytics', color: '#8B5CF6' },
    { value: 'S&O', label: 'S&O', color: '#10B981' },
    { value: 'Engineering', label: 'Engineering', color: '#3B82F6' },
    { value: 'Design', label: 'Design', color: '#F59E0B' },
    { value: 'Product', label: 'Product', color: '#EF4444' }
  ];

  const COLOR_OPTIONS = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Yellow' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EF4444', label: 'Red' },
    { value: '#06B6D4', label: 'Cyan' },
    { value: '#84CC16', label: 'Lime' },
    { value: '#F97316', label: 'Orange' }
  ];

  // Debug logging functions
  const debugLog = (message: string, data?: any) => {
    console.log(`[OrganizationManager] ${message}`, data);
  };

  const errorLog = (message: string, error?: any) => {
    console.error(`[OrganizationManager] ERROR: ${message}`, error);
  };

  // Safe data access with fallbacks
  const safeTeams = Array.isArray(teams) ? teams.filter(t => t && t.id && t.name) : [];
  const safePods = Array.isArray(pods) ? pods.filter(p => p && p.id && p.name && p.teamId) : [];
  const safePeople = Array.isArray(people) ? people.filter(p => p && p.id && p.name && p.active) : [];

  const handleAddTeam = () => {
    try {
      debugLog('handleAddTeam called', { newTeam });
      
      if (newTeam.name.trim()) {
        const team: Team = {
          id: `team-${Date.now()}`,
          name: newTeam.name,
          description: newTeam.description,
          color: newTeam.color
        };
        
        debugLog('Creating new team', team);
        onTeamsChange([...teams, team]);
        setNewTeam({ name: '', description: '', color: '#3B82F6' });
        setIsAddingTeam(false);
        debugLog('Team added successfully');
      }
    } catch (error) {
      errorLog('Failed to add team', error);
    }
  };

  const handleAddPod = () => {
    try {
      debugLog('handleAddPod called', { newPod });
      
      if (newPod.name.trim() && newPod.teamId) {
        const pod: Pod = {
          id: `pod-${Date.now()}`,
          name: newPod.name,
          teamId: newPod.teamId,
          description: newPod.description,
          members: newPod.members
        };
        
        debugLog('Creating new pod', pod);
        onPodsChange([...pods, pod]);
        setNewPod({ name: '', teamId: '', description: '', members: [] });
        setCurrentMember({ name: '', role: 'Product' });
        setIsAddingPod(false);
        debugLog('Pod added successfully');
      }
    } catch (error) {
      errorLog('Failed to add pod', error);
    }
  };

  const handleAddPerson = () => {
    try {
      debugLog('handleAddPerson called', { newPerson });
      
      if (newPerson.name.trim() && newPerson.email.trim() && newPerson.teamId) {
        const person: Person = {
          id: `person-${Date.now()}`,
          name: newPerson.name,
          email: newPerson.email,
          function: newPerson.function,
          managerId: newPerson.managerId || undefined,
          teamId: newPerson.teamId,
          podId: newPerson.podId || undefined,
          joinDate: new Date().toISOString().split('T')[0],
          active: true
        };
        
        debugLog('Creating new person', person);
        onPeopleChange([...people, person]);
        setNewPerson({ name: '', email: '', function: 'Product', managerId: '', teamId: '', podId: '' });
        setIsAddingPerson(false);
        debugLog('Person added successfully');
      } else {
        debugLog('Person validation failed', {
          hasName: !!newPerson.name.trim(),
          hasEmail: !!newPerson.email.trim(),
          hasTeam: !!newPerson.teamId
        });
      }
    } catch (error) {
      errorLog('Failed to add person', error);
    }
  };

  const handleAddMember = () => {
    try {
      debugLog('handleAddMember called', { currentMember });
      
      if (currentMember.name.trim()) {
        setNewPod(prev => ({
          ...prev,
          members: [...prev.members, { ...currentMember }]
        }));
        setCurrentMember({ name: '', role: 'Product' });
        debugLog('Member added to pod');
      }
    } catch (error) {
      errorLog('Failed to add member', error);
    }
  };

  const handleRemoveMember = (index: number) => {
    try {
      debugLog('handleRemoveMember called', { index });
      
      setNewPod(prev => ({
        ...prev,
        members: prev.members.filter((_, i) => i !== index)
      }));
      debugLog('Member removed from pod');
    } catch (error) {
      errorLog('Failed to remove member', error);
    }
  };

  const getRoleColor = (role: string) => {
    const roleOption = ROLE_OPTIONS.find(r => r.value === role);
    return roleOption ? roleOption.color : '#6B7280';
  };

  const getTeamName = (teamId: string) => {
    const team = safeTeams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getPodName = (podId: string) => {
    const pod = safePods.find(p => p.id === podId);
    return pod ? pod.name : 'No Pod';
  };

  const getPersonName = (personId: string) => {
    const person = safePeople.find(p => p.id === personId);
    return person ? person.name : 'No Manager';
  };
  
  // Get pods filtered by selected team
  const getPodsForTeam = (teamId: string) => {
    try {
      if (!teamId) return [];
      return safePods.filter(p => p.teamId === teamId);
    } catch (error) {
      errorLog('Failed to compute pods for team', error);
      return [];
    }
  };

  // Enhanced button click handler with comprehensive logging
  const handleAddPersonClick = (e: React.MouseEvent) => {
    try {
      debugLog('Add Person button clicked');
      e.stopPropagation();
      
      // Log current state
      debugLog('Current state before opening dialog', {
        teams: safeTeams.length,
        pods: safePods.length,
        people: safePeople.length,
        isAddingPerson
      });
      
      setIsAddingPerson(true);
      debugLog('Dialog state set to open');
    } catch (error) {
      errorLog('Failed to handle Add Person click', error);
    }
  };

  // Enhanced dialog close handler
  const handleClosePersonDialog = () => {
    try {
      debugLog('Closing person dialog');
      setIsAddingPerson(false);
      setNewPerson({ name: '', email: '', function: 'Product', managerId: '', teamId: '', podId: '' });
      debugLog('Person dialog closed and state reset');
    } catch (error) {
      errorLog('Failed to close person dialog', error);
    }
  };

  return (
    <Card>
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <div className="flex items-center justify-between p-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-3 hover:bg-muted/50 cursor-pointer flex-1 -m-4 p-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCollapsed(!isCollapsed); }}>
              {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-base font-medium leading-none">Organization Structure</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isCollapsed
                      ? `${safeTeams.length} ${safeTeams.length === 1 ? 'team' : 'teams'}, ${safePods.length} ${safePods.length === 1 ? 'pod' : 'pods'}, ${safePeople.length} ${safePeople.length === 1 ? 'person' : 'people'}`
                      : "Set up your teams, pods, and people for OKR management"
                    }
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          {isCollapsed && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={(e) => { e.stopPropagation(); setIsAddingTeam(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add Team
              </Button>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); setIsAddingPod(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add Pod
              </Button>
              <Button size="sm" onClick={handleAddPersonClick}>
                <Plus className="h-4 w-4 mr-1" />
                Add Person
              </Button>
            </div>
          )}
        </div>
        
        <CollapsibleContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Team Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Teams
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Organize your company structure into functional teams
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{safeTeams.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {safePods.length} pods total
                    </p>
                  </div>
                  <Dialog open={isAddingTeam} onOpenChange={setIsAddingTeam}>
                    <DialogTrigger asChild>
                      <Button onClick={(e) => e.stopPropagation()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Team
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Team</DialogTitle>
                        <DialogDescription>Create a new team in your organization</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="team-name">Team Name</Label>
                          <Input
                            id="team-name"
                            value={newTeam.name}
                            onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Product, Engineering, Marketing"
                          />
                        </div>
                        <div>
                          <Label htmlFor="team-description">Description</Label>
                          <Textarea
                            id="team-description"
                            value={newTeam.description}
                            onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the team's responsibilities"
                          />
                        </div>
                        <div>
                          <Label htmlFor="team-color">Team Color</Label>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded border" style={{ backgroundColor: newTeam.color }} />
                            <Select value={newTeam.color} onValueChange={(value) => setNewTeam(prev => ({ ...prev, color: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select team color" />
                              </SelectTrigger>
                              <SelectContent>
                                {COLOR_OPTIONS.map((color) => (
                                  <SelectItem key={color.value} value={color.value}>
                                    {color.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddingTeam(false)}>Cancel</Button>
                          <Button onClick={handleAddTeam}>Add Team</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {safeTeams.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recent Teams:</p>
                    <div className="space-y-1">
                      {safeTeams.slice(-3).map((team) => (
                        <div key={team.id} className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: team.color }} />
                            <span className="truncate">{team.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {safePods.filter(p => p.teamId === team.id).length} pods
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pod Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Pods
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create cross-functional pods within teams for focused execution
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{safePods.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {safePods.reduce((acc, pod) => acc + (pod.members ? pod.members.length : 0), 0)} members total
                    </p>
                  </div>
                  <Dialog open={isAddingPod} onOpenChange={setIsAddingPod}>
                    <DialogTrigger asChild>
                      <Button onClick={(e) => e.stopPropagation()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Pod
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Pod</DialogTitle>
                        <DialogDescription>Create a new pod within a team</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="pod-team">Team</Label>
                          <Select value={newPod.teamId} onValueChange={(value) => setNewPod(prev => ({ ...prev, teamId: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a team" />
                            </SelectTrigger>
                            <SelectContent>
                              {safeTeams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="pod-name">Pod Name</Label>
                          <Input
                            id="pod-name"
                            value={newPod.name}
                            onChange={(e) => setNewPod(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Core Product, Growth, Platform"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pod-description">Description</Label>
                          <Textarea
                            id="pod-description"
                            value={newPod.description}
                            onChange={(e) => setNewPod(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the pod's focus"
                          />
                        </div>
                        <div>
                          <Label>Team Members</Label>
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Input
                                  value={currentMember.name}
                                  onChange={(e) => setCurrentMember(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="Member name"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddMember();
                                    }
                                  }}
                                />
                              </div>
                              <div className="w-32">
                                <Select 
                                  value={currentMember.role} 
                                  onValueChange={(value) => setCurrentMember(prev => ({ ...prev, role: value as any }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ROLE_OPTIONS.map((role) => (
                                      <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button 
                                type="button" 
                                onClick={handleAddMember}
                                disabled={!currentMember.name.trim()}
                                size="sm"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            {newPod.members.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Added members:</div>
                                <div className="flex flex-wrap gap-2">
                                  {newPod.members.map((member, index) => (
                                    <div 
                                      key={index} 
                                      className="flex items-center gap-1 bg-muted rounded-md px-2 py-1"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-2 h-2 rounded-full" 
                                          style={{ backgroundColor: getRoleColor(member.role) }}
                                        />
                                        <span className="text-sm">{member.name}</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {member.role}
                                        </Badge>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 ml-1"
                                        onClick={() => handleRemoveMember(index)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {newPod.members.length === 0 && (
                              <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-muted-foreground/30 rounded-md">
                                No members added yet. Add members with their roles above.
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddingPod(false)}>Cancel</Button>
                          <Button onClick={handleAddPod}>Add Pod</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {safePods.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recent Pods:</p>
                    <div className="space-y-1">
                      {safePods.slice(-3).map((pod) => (
                        <div key={pod.id} className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between">
                          <span className="truncate">{pod.name}</span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {getTeamName(pod.teamId)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {pod.members ? pod.members.length : 0} members
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* People Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  People
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage team members and their reporting structure
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{safePeople.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {safePeople.filter(p => p.managerId).length} with managers
                    </p>
                  </div>
                  <Dialog open={isAddingPerson} onOpenChange={setIsAddingPerson}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAddPersonClick}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Person
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Person</DialogTitle>
                        <DialogDescription>Add a team member to your organization</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="person-name">Name</Label>
                            <Input
                              id="person-name"
                              value={newPerson.name}
                              onChange={(e) => setNewPerson(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Full name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="person-email">Email</Label>
                            <Input
                              id="person-email"
                              type="email"
                              value={newPerson.email}
                              onChange={(e) => setNewPerson(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="email@company.com"
                            />
                          </div>
                        </div>
                        
                        {/* Native HTML select for Function */}
                        <div>
                          <Label htmlFor="person-function">Function</Label>
                          <select
                            id="person-function"
                            value={newPerson.function}
                            onChange={(e) => setNewPerson(prev => ({ ...prev, function: e.target.value as FunctionType }))}
                            className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Native HTML select for Team */}
                        <div>
                          <Label htmlFor="person-team">Team</Label>
                          <select
                            id="person-team"
                            value={newPerson.teamId}
                            onChange={(e) => setNewPerson(prev => ({ ...prev, teamId: e.target.value, podId: '' }))}
                            className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select a team</option>
                            {safeTeams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Native HTML select for Pod (conditional) */}
                        {newPerson.teamId && (
                          <div>
                            <Label htmlFor="person-pod">Pod (Optional)</Label>
                            <select
                              id="person-pod"
                              value={newPerson.podId || ""}
                              onChange={(e) => setNewPerson(prev => ({ ...prev, podId: e.target.value }))}
                              className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">No Pod</option>
                              {getPodsForTeam(newPerson.teamId).map((pod) => (
                                <option key={pod.id} value={pod.id}>
                                  {pod.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        {/* Native HTML select for Manager */}
                        <div>
                          <Label htmlFor="person-manager">Manager (Optional)</Label>
                          <select
                            id="person-manager"
                            value={newPerson.managerId || ""}
                            onChange={(e) => setNewPerson(prev => ({ ...prev, managerId: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">No Manager</option>
                            {safePeople.map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={handleClosePersonDialog}>Cancel</Button>
                          <Button onClick={handleAddPerson}>Add Person</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {safePeople.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recent People:</p>
                    <div className="space-y-1">
                      {safePeople.slice(-3).map((person) => (
                        <div key={person.id} className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: getRoleColor(person.function) }}
                            />
                            <span className="truncate">{person.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {getTeamName(person.teamId)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {person.function}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Dialogs moved outside of Collapsible so they work when collapsed */}
      <Dialog open={isAddingTeam} onOpenChange={setIsAddingTeam}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Team</DialogTitle>
            <DialogDescription>Create a new team in your organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={newTeam.name}
                onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Product, Engineering, Marketing"
              />
            </div>
            <div>
              <Label htmlFor="team-description">Description</Label>
              <Textarea
                id="team-description"
                value={newTeam.description}
                onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the team's responsibilities"
              />
            </div>
            <div>
              <Label htmlFor="team-color">Team Color</Label>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: newTeam.color }} />
                <Select value={newTeam.color} onValueChange={(value) => setNewTeam(prev => ({ ...prev, color: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team color" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        {color.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingTeam(false)}>Cancel</Button>
              <Button onClick={handleAddTeam}>Add Team</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Pod Dialog */}
      <Dialog open={isAddingPod} onOpenChange={setIsAddingPod}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Pod</DialogTitle>
            <DialogDescription>Create a new pod within a team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pod-team">Team</Label>
              <Select value={newPod.teamId} onValueChange={(value) => setNewPod(prev => ({ ...prev, teamId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {safeTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pod-name">Pod Name</Label>
              <Input
                id="pod-name"
                value={newPod.name}
                onChange={(e) => setNewPod(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Core Product, Growth, Platform"
              />
            </div>
            <div>
              <Label htmlFor="pod-description">Description</Label>
              <Textarea
                id="pod-description"
                value={newPod.description}
                onChange={(e) => setNewPod(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the pod's focus"
              />
            </div>
            <div>
              <Label>Team Members</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      value={currentMember.name}
                      onChange={(e) => setCurrentMember(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Member name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMember();
                        }
                      }}
                    />
                  </div>
                  <div className="w-32">
                    <Select
                      value={currentMember.role}
                      onValueChange={(value) => setCurrentMember(prev => ({ ...prev, role: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!currentMember.name.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {newPod.members.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Added members:</div>
                    <div className="flex flex-wrap gap-2">
                      {newPod.members.map((member, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-muted rounded-md px-2 py-1"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getRoleColor(member.role) }}
                            />
                            <span className="text-sm">{member.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {member.role}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => handleRemoveMember(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {newPod.members.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-muted-foreground/30 rounded-md">
                    No members added yet. Add members with their roles above.
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingPod(false)}>Cancel</Button>
              <Button onClick={handleAddPod}>Add Pod</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Person Dialog */}
      <Dialog open={isAddingPerson} onOpenChange={setIsAddingPerson}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Person</DialogTitle>
            <DialogDescription>Add a team member to your organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="person-name">Name</Label>
                <Input
                  id="person-name"
                  value={newPerson.name}
                  onChange={(e) => setNewPerson(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label htmlFor="person-email">Email</Label>
                <Input
                  id="person-email"
                  type="email"
                  value={newPerson.email}
                  onChange={(e) => setNewPerson(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@company.com"
                />
              </div>
            </div>

            {/* Native HTML select for Function */}
            <div>
              <Label htmlFor="person-function">Function</Label>
              <select
                id="person-function"
                value={newPerson.function}
                onChange={(e) => setNewPerson(prev => ({ ...prev, function: e.target.value as FunctionType }))}
                className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Native HTML select for Team */}
            <div>
              <Label htmlFor="person-team">Team</Label>
              <select
                id="person-team"
                value={newPerson.teamId}
                onChange={(e) => setNewPerson(prev => ({ ...prev, teamId: e.target.value, podId: '' }))}
                className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a team</option>
                {safeTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Native HTML select for Pod (conditional) */}
            {newPerson.teamId && (
              <div>
                <Label htmlFor="person-pod">Pod (Optional)</Label>
                <select
                  id="person-pod"
                  value={newPerson.podId || ""}
                  onChange={(e) => setNewPerson(prev => ({ ...prev, podId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">No Pod</option>
                  {getPodsForTeam(newPerson.teamId).map((pod) => (
                    <option key={pod.id} value={pod.id}>
                      {pod.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Native HTML select for Manager */}
            <div>
              <Label htmlFor="person-manager">Manager (Optional)</Label>
              <select
                id="person-manager"
                value={newPerson.managerId || ""}
                onChange={(e) => setNewPerson(prev => ({ ...prev, managerId: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">No Manager</option>
                {safePeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClosePersonDialog}>Cancel</Button>
              <Button onClick={handleAddPerson}>Add Person</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}