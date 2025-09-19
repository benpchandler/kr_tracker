import React from 'react';
import { useStore, useDispatch } from '../state/store';
import { Building2, Users, Target, Lightbulb, Plus, ChevronRight, ChevronDown, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

export function PlanModeDashboard() {
  const state = useStore();
  const dispatch = useDispatch();
  const { teams, pods, individuals: people, krs: keyResults, initiatives, objectives } = state;

  // Calculate statistics
  const totalPods = pods.length;
  const totalPeople = people.length;
  const managersCount = people.filter((p: any) =>
    people.some((other: any) => other.managerId === p.id)
  ).length;
  const autoUpdatingKRs = keyResults.filter((kr: any) => kr.sqlQuery).length;
  const linkedInitiatives = initiatives.filter((i: any) => !i.isPlaceholder).length;

  // Collapsible sections management
  const [organizationOpen, setOrganizationOpen] = React.useState(false);
  const [objectivesOpen, setObjectivesOpen] = React.useState(false);

  const tabs = [
    { id: 'teams', label: 'Manage teams & pods' },
    { id: 'krs', label: 'Configure KRs & targets' },
    { id: 'initiatives', label: 'Link initiatives' },
    { id: 'sql', label: 'Set up SQL queries' },
    { id: 'relationships', label: 'Define relationships' },
  ];

  const stats = [
    {
      label: 'Teams',
      value: teams.length,
      subtext: `${totalPods} pods total`,
      icon: Building2,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'People',
      value: totalPeople,
      subtext: `${managersCount} with managers`,
      icon: Users,
      color: 'bg-green-50 text-green-600'
    },
    {
      label: 'Planned KRs',
      value: keyResults.length,
      subtext: `${autoUpdatingKRs} auto-updating`,
      icon: Target,
      color: 'bg-purple-50 text-purple-600'
    },
    {
      label: 'Initiatives',
      value: initiatives.length,
      subtext: `${linkedInitiatives} linked to KRs`,
      icon: Lightbulb,
      color: 'bg-orange-50 text-orange-600'
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header with mode toggle */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team OKR & Initiative Tracker</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track key results and initiatives across your organization
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Mode Toggle */}
              <div className="flex bg-gray-900 rounded-lg p-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="bg-white text-gray-900 shadow-sm hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Plan Mode
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-gray-800"
                >
                  Execution Mode
                </Button>
              </div>
              
              {/* Team Selector */}
              <div className="min-w-[140px]">
                <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm">
                  <option>All Teams</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        {/* Plan Mode Description */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 bg-gray-100 rounded">
              <Settings className="h-4 w-4 text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Plan Mode</h2>
          </div>
          <p className="text-sm text-gray-600">
            Set up your organizational structure, define KRs and initiatives, configure data sources, and establish quarterly goals.
          </p>
          
          {/* Tabs */}
          <div className="flex gap-6 mt-4 border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className="pb-3 text-sm font-medium border-b-2 text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 mb-2">{stat.label}</div>
                  <div className="text-xs text-gray-400">{stat.subtext}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Sections */}
        <div className="space-y-6">
          {/* Organization Structure */}
          <Card>
            <Collapsible open={organizationOpen} onOpenChange={setOrganizationOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      {organizationOpen ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-gray-600" />
                        <CardTitle className="text-lg">Organization Structure</CardTitle>
                      </div>
                      <span className="text-sm text-gray-500">
                        {teams.length} teams, {totalPods} pods, {totalPeople} people
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Team
                      </Button>
                      <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Pod
                      </Button>
                      <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Person
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="space-y-4">
                    {/* Organization content would be rendered here */}
                    <p className="text-sm text-gray-600">
                      Organization structure management interface would be displayed here.
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Objectives & Key Results */}
          <Card>
            <Collapsible open={objectivesOpen} onOpenChange={setObjectivesOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      {objectivesOpen ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-gray-600" />
                        <CardTitle className="text-lg">Objectives & Key Results</CardTitle>
                      </div>
                      <span className="text-sm text-gray-500">
                        {keyResults.length} KRs, {initiatives.length} initiatives
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                        <Plus className="h-4 w-4 mr-1" />
                        Add KR
                      </Button>
                      <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Initiative
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="space-y-4">
                    {/* Objectives and KRs content would be rendered here */}
                    <p className="text-sm text-gray-600">
                      Objectives and Key Results management interface would be displayed here.
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      </div>
    </div>
  );
}

