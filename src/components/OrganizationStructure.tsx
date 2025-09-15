import React from 'react'
import { useStore, useDispatch } from '../state/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge, Card as TremorCard, Metric, Text, Grid, Col, Flex } from '@tremor/react'
import { Users, Building2, Target, User, Plus } from 'lucide-react'
import { FunctionalArea, PersonLevel, PodRole, type Person, type Pod, type PodMembership } from '../models/types'

export function OrganizationStructure() {
  const state = useStore(s => s)
  const dispatch = useDispatch()

  // Calculate stats
  const stats = {
    totalPeople: state.people.length || state.individuals.length,
    teams: state.teams.length,
    pods: state.pods.length,
    avgPodSize: state.pods.length > 0
      ? Math.round((state.podMemberships.length || 0) / state.pods.length * 10) / 10
      : 0,
  }

  // Group people by function
  const peopleByFunction = React.useMemo(() => {
    const grouped: Record<string, Person[]> = {}
    state.people.forEach(person => {
      const func = person.function || 'Unknown'
      if (!grouped[func]) grouped[func] = []
      grouped[func].push(person)
    })
    return grouped
  }, [state.people])

  return (
    <div className="space-y-6">
      {/* Overview Stats using Tremor */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
        <Col>
          <TremorCard>
            <Flex alignItems="start">
              <div>
                <Text>Total People</Text>
                <Metric>{stats.totalPeople}</Metric>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </Flex>
          </TremorCard>
        </Col>

        <Col>
          <TremorCard>
            <Flex alignItems="start">
              <div>
                <Text>Teams</Text>
                <Metric>{stats.teams}</Metric>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </Flex>
          </TremorCard>
        </Col>

        <Col>
          <TremorCard>
            <Flex alignItems="start">
              <div>
                <Text>Pods</Text>
                <Metric>{stats.pods}</Metric>
              </div>
              <Target className="h-8 w-8 text-gray-400" />
            </Flex>
          </TremorCard>
        </Col>

        <Col>
          <TremorCard>
            <Flex alignItems="start">
              <div>
                <Text>Avg Pod Size</Text>
                <Metric>{stats.avgPodSize}</Metric>
              </div>
              <User className="h-8 w-8 text-gray-400" />
            </Flex>
          </TremorCard>
        </Col>
      </Grid>

      {/* Teams Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Teams</CardTitle>
              <CardDescription>Business units that own objectives and coordinate pods</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {state.teams.map(team => {
              const teamPods = state.pods.filter(p => p.teamId === team.id)
              const lead = team.leadId ? state.people.find(p => p.id === team.leadId) : null

              return (
                <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{team.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {lead ? `Lead: ${lead.name}` : 'No lead assigned'}
                      {' • '}
                      {teamPods.length} pods
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              )
            })}
            {state.teams.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No teams configured yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* People Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>People</CardTitle>
              <CardDescription>Team members with their functions and reporting lines</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Person
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {state.people.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(peopleByFunction).map(([func, people]) => (
                <div key={func}>
                  <h4 className="font-medium mb-3 text-sm uppercase text-muted-foreground">{func}</h4>
                  <div className="grid gap-3">
                    {people.map(person => {
                      const manager = person.managerId
                        ? state.people.find(p => p.id === person.managerId)
                        : null

                      return (
                        <div key={person.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium">{person.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {person.level} • {manager ? `Reports to ${manager.name}` : 'No manager'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{person.function}</Badge>
                            <Button variant="ghost" size="sm">Edit</Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No people added yet</p>
              <p className="text-sm text-muted-foreground">
                People will be migrated from the existing individuals list or you can add new ones
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pods Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pods</CardTitle>
              <CardDescription>Cross-functional teams that execute on objectives</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Pod
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {state.pods.map(pod => {
              const team = state.teams.find(t => t.id === pod.teamId)
              const members = state.podMemberships.filter(m => m.podId === pod.id)

              return (
                <div key={pod.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{pod.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {team?.name} • {pod.mission || 'No mission defined'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>

                  {members.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {members.map(membership => {
                        const person = state.people.find(p => p.id === membership.personId) ||
                                      state.individuals.find(i => i.id === membership.personId)
                        if (!person) return null

                        return (
                          <Badge key={membership.personId} variant="outline">
                            {person.name} ({membership.role}) - {Math.round(membership.allocation * 100)}%
                          </Badge>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No members assigned</p>
                  )}
                </div>
              )
            })}
            {state.pods.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No pods created yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}