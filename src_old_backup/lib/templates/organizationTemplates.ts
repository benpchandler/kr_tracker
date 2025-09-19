import { Aggregation, Unit } from '../../models/types'

export type OrganizationTemplateEntityKey = string

export type OrganizationTemplateDefinition = {
  id: string
  title: string
  description: string
  icon: string
  summary: string[]
  seeded: {
    organizationName?: string
    teams: Array<{
      key: OrganizationTemplateEntityKey
      name: string
      color?: string
    }>
    objectives: Array<{
      key: OrganizationTemplateEntityKey
      name: string
      teamKeys?: OrganizationTemplateEntityKey[]
    }>
    keyResults: Array<{
      key: OrganizationTemplateEntityKey
      name: string
      unit: Unit
      aggregation: Aggregation
      goalStart?: number
      goalEnd?: number
      teamKey?: OrganizationTemplateEntityKey
      objectiveKey?: OrganizationTemplateEntityKey
    }>
  }
}

export const ORGANIZATION_TEMPLATES: OrganizationTemplateDefinition[] = [
  {
    id: 'single-team',
    title: 'Single Team Launch',
    description: 'Start with one team and a focused outcome.',
    icon: 'target',
    summary: [
      '1 cross-functional team',
      '1 objective aligned to launch readiness',
      '2 measurable key results',
    ],
    seeded: {
      organizationName: 'New Team Org',
      teams: [
        { key: 'team-core', name: 'Core Team', color: '#2563eb' },
      ],
      objectives: [
        { key: 'obj-launch-readiness', name: 'Deliver a confident first launch', teamKeys: ['team-core'] },
      ],
      keyResults: [
        {
          key: 'kr-activation',
          name: 'Activate 250 beta users',
          unit: 'count',
          aggregation: 'cumulative',
          goalStart: 0,
          goalEnd: 250,
          teamKey: 'team-core',
          objectiveKey: 'obj-launch-readiness',
        },
        {
          key: 'kr-quality',
          name: 'Hit 95% quality score',
          unit: 'percent',
          aggregation: 'average',
          goalStart: 70,
          goalEnd: 95,
          teamKey: 'team-core',
          objectiveKey: 'obj-launch-readiness',
        },
      ],
    },
  },
  {
    id: 'startup-structure',
    title: 'Startup Structure',
    description: 'Seed product, growth, and operations pods with ready metrics.',
    icon: 'rocket',
    summary: [
      '3 teams across product, growth, and operations',
      '3 objectives covering adoption, revenue, and service',
      '5 key results calibrated for series A readiness',
    ],
    seeded: {
      organizationName: 'Startup HQ',
      teams: [
        { key: 'team-product', name: 'Product Discovery', color: '#7c3aed' },
        { key: 'team-growth', name: 'Growth Experiments', color: '#d97706' },
        { key: 'team-ops', name: 'Customer Operations', color: '#16a34a' },
      ],
      objectives: [
        { key: 'obj-adoption', name: 'Accelerate product-market fit', teamKeys: ['team-product'] },
        { key: 'obj-revenue', name: 'Grow sustainable revenue', teamKeys: ['team-growth'] },
        { key: 'obj-service', name: 'Deliver reliable customer experience', teamKeys: ['team-ops'] },
      ],
      keyResults: [
        {
          key: 'kr-weekly-active',
          name: 'Reach 1,200 weekly active accounts',
          unit: 'count',
          aggregation: 'snapshot',
          goalStart: 400,
          goalEnd: 1200,
          teamKey: 'team-product',
          objectiveKey: 'obj-adoption',
        },
        {
          key: 'kr-feature-ship',
          name: 'Ship 4 high-impact releases',
          unit: 'count',
          aggregation: 'cumulative',
          goalStart: 0,
          goalEnd: 4,
          teamKey: 'team-product',
          objectiveKey: 'obj-adoption',
        },
        {
          key: 'kr-mrr',
          name: 'Increase MRR to $220k',
          unit: 'currency',
          aggregation: 'snapshot',
          goalStart: 120000,
          goalEnd: 220000,
          teamKey: 'team-growth',
          objectiveKey: 'obj-revenue',
        },
        {
          key: 'kr-conversion',
          name: 'Lift self-serve conversion to 6%',
          unit: 'percent',
          aggregation: 'average',
          goalStart: 3.5,
          goalEnd: 6,
          teamKey: 'team-growth',
          objectiveKey: 'obj-revenue',
        },
        {
          key: 'kr-csat',
          name: 'Raise CSAT to 4.7',
          unit: 'count',
          aggregation: 'average',
          goalStart: 4.2,
          goalEnd: 4.7,
          teamKey: 'team-ops',
          objectiveKey: 'obj-service',
        },
      ],
    },
  },
  {
    id: 'department-focus',
    title: 'Department Focus',
    description: 'Spin up departmental OKRs with shared services support.',
    icon: 'building',
    summary: [
      '2 functional teams with complementary goals',
      '2 objectives aligned to pipeline and enablement',
      '3 outcome-based key results ready for tracking',
    ],
    seeded: {
      organizationName: 'Department Ops',
      teams: [
        { key: 'team-marketing', name: 'Pipeline Marketing', color: '#db2777' },
        { key: 'team-enablement', name: 'Customer Enablement', color: '#0ea5e9' },
      ],
      objectives: [
        { key: 'obj-pipeline', name: 'Scale qualified demand generation', teamKeys: ['team-marketing'] },
        { key: 'obj-onboarding', name: 'Accelerate customer onboarding value', teamKeys: ['team-enablement'] },
      ],
      keyResults: [
        {
          key: 'kr-sql',
          name: 'Deliver 180 SQLs per quarter',
          unit: 'count',
          aggregation: 'cumulative',
          goalStart: 0,
          goalEnd: 180,
          teamKey: 'team-marketing',
          objectiveKey: 'obj-pipeline',
        },
        {
          key: 'kr-pipeline',
          name: 'Grow sourced pipeline to $3.5M',
          unit: 'currency',
          aggregation: 'snapshot',
          goalStart: 1800000,
          goalEnd: 3500000,
          teamKey: 'team-marketing',
          objectiveKey: 'obj-pipeline',
        },
        {
          key: 'kr-time-to-value',
          name: 'Reduce onboarding time to 21 days',
          unit: 'count',
          aggregation: 'average',
          goalStart: 35,
          goalEnd: 21,
          teamKey: 'team-enablement',
          objectiveKey: 'obj-onboarding',
        },
      ],
    },
  },
]

export const getOrganizationTemplate = (id: string) =>
  ORGANIZATION_TEMPLATES.find(template => template.id === id)
