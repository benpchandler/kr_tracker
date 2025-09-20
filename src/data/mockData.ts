import { Team, Pod, Quarter, KR, Initiative, KRComment, WeeklyActual, PodMember, Person, Organization, Objective } from '../types';
import { defaultFunctions } from './functions';

export const mockFunctions = defaultFunctions;

export const mockOrganizations: Organization[] = [
  {
    id: 'org-merchant',
    name: 'Merchant Operations',
    description: 'Core organization responsible for merchant and customer success',
    industry: 'Logistics',
    headquarters: 'San Francisco'
  }
];

export const mockTeams: Team[] = [
  {
    id: 'team-1',
    organizationId: 'org-merchant',
    name: 'Acquisition',
    description: 'Customer acquisition and onboarding strategies',
    color: '#3B82F6'
  },
  {
    id: 'team-2',
    organizationId: 'org-merchant',
    name: 'Growth',
    description: 'Revenue growth and market expansion',
    color: '#10B981'
  },
  {
    id: 'team-3',
    organizationId: 'org-merchant',
    name: 'Support',
    description: 'Customer support and workforce management',
    color: '#F59E0B'
  },
  {
    id: 'team-4',
    organizationId: 'org-merchant',
    name: 'Integrations',
    description: 'System integrations and operational excellence',
    color: '#8B5CF6'
  },
  {
    id: 'team-5',
    organizationId: 'org-merchant',
    name: 'Live Order Experience',
    description: 'Real-time order fulfillment and quality assurance',
    color: '#EF4444'
  }
];

export const mockObjectives: Objective[] = [
  {
    id: 'obj-1',
    organizationId: 'org-merchant',
    title: 'Deliver best-in-class merchant onboarding',
    description: 'Accelerate merchant adoption through seamless onboarding experiences.',
    owner: 'Sarah Chen',
    teamId: 'team-1',
    status: 'active',
    krIds: ['kr-1']
  },
  {
    id: 'obj-2',
    organizationId: 'org-merchant',
    title: 'Grow profitable order volume',
    description: 'Increase order value while maintaining customer satisfaction.',
    owner: 'Michael Brooks',
    teamId: 'team-2',
    status: 'active',
    krIds: ['kr-2']
  },
  {
    id: 'obj-3',
    organizationId: 'org-merchant',
    title: 'Deliver operational excellence in support and delivery',
    description: 'Improve reliability and responsiveness across support and delivery operations.',
    owner: 'Amanda Clark',
    teamId: 'team-3',
    status: 'active',
    krIds: ['kr-3', 'kr-4', 'kr-5']
  }
];

export const mockPods: Pod[] = [
  // Acquisition Team Pods
  {
    id: 'pod-1',
    name: 'Selection',
    teamId: 'team-1',
    description: 'Customer selection and targeting strategies',
    members: [
      { name: 'Sarah Chen', role: 'Product' },
      { name: 'Marcus Johnson', role: 'Analytics' },
      { name: 'Emma Wilson', role: 'S&O' }
    ] as PodMember[]
  },
  {
    id: 'pod-2',
    name: 'Onboarding',
    teamId: 'team-1',
    description: 'New customer onboarding and activation',
    members: [
      { name: 'Lisa Rodriguez', role: 'Product' },
      { name: 'Tom Anderson', role: 'Design' },
      { name: 'Jake Martinez', role: 'Engineering' }
    ] as PodMember[]
  },
  
  // Growth Team Pods
  {
    id: 'pod-3',
    name: 'Profitability',
    teamId: 'team-2',
    description: 'Revenue optimization and profitability analysis',
    members: [
      { name: 'Michael Brooks', role: 'Analytics' },
      { name: 'Diana Chang', role: 'Product' },
      { name: 'Robert Kim', role: 'S&O' }
    ] as PodMember[]
  },
  {
    id: 'pod-4',
    name: 'Menu',
    teamId: 'team-2',
    description: 'Menu management and optimization',
    members: [
      { name: 'Jessica Wu', role: 'Product' },
      { name: 'David Taylor', role: 'Design' },
      { name: 'Alex Foster', role: 'Engineering' }
    ] as PodMember[]
  },
  {
    id: 'pod-5',
    name: 'GTM',
    teamId: 'team-2',
    description: 'Go-to-market strategies and execution',
    members: [
      { name: 'Rachel Green', role: 'Product' },
      { name: 'Kevin Lee', role: 'Analytics' },
      { name: 'Sophie Davis', role: 'S&O' }
    ] as PodMember[]
  },
  
  // Support Team Pods
  {
    id: 'pod-6',
    name: 'Workforce Management',
    teamId: 'team-3',
    description: 'Support team optimization and management',
    members: [
      { name: 'Amanda Clark', role: 'S&O' },
      { name: 'Chris Miller', role: 'Analytics' },
      { name: 'Nicole Brown', role: 'Product' }
    ] as PodMember[]
  },
  {
    id: 'pod-7',
    name: 'MSR',
    teamId: 'team-3',
    description: 'Merchant and customer service relations',
    members: [
      { name: 'Ryan Thompson', role: 'Product' },
      { name: 'Maya Patel', role: 'S&O' },
      { name: 'Jordan Williams', role: 'Design' }
    ] as PodMember[]
  },
  
  // Integrations Team Pods
  {
    id: 'pod-8',
    name: 'S&O',
    teamId: 'team-4',
    description: 'Strategy and operations integration systems',
    members: [
      { name: 'Elena Rodriguez', role: 'S&O' },
      { name: 'James Wilson', role: 'Engineering' },
      { name: 'Priya Sharma', role: 'Analytics' }
    ] as PodMember[]
  },
  {
    id: 'pod-9',
    name: 'TAMS',
    teamId: 'team-4',
    description: 'Technology and merchant solutions',
    members: [
      { name: 'Carlos Mendez', role: 'Engineering' },
      { name: 'Zoe Chen', role: 'Product' },
      { name: 'Oliver Smith', role: 'S&O' }
    ] as PodMember[]
  },
  
  // Live Order Experience Team Pods
  {
    id: 'pod-10',
    name: 'Dasher Handoffs',
    teamId: 'team-5',
    description: 'Delivery handoff processes and optimization',
    members: [
      { name: 'Tyler Jackson', role: 'Product' },
      { name: 'Isabella Moore', role: 'Engineering' },
      { name: 'Nathan Cooper', role: 'S&O' }
    ] as PodMember[]
  },
  {
    id: 'pod-11',
    name: 'Quality',
    teamId: 'team-5',
    description: 'Order quality assurance and monitoring',
    members: [
      { name: 'Grace Liu', role: 'Analytics' },
      { name: 'Ethan Price', role: 'Product' },
      { name: 'Samantha Reed', role: 'Design' }
    ] as PodMember[]
  }
];

export const mockQuarters: Quarter[] = [
  {
    id: 'q4-2024',
    name: 'Q4 2024',
    startDate: '2024-10-01',
    endDate: '2024-12-31',
    year: 2024
  },
  {
    id: 'q1-2025',
    name: 'Q1 2025',
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    year: 2025
  }
];

export const mockPeople: Person[] = [
  // Leadership / Managers
  {
    id: 'person-1',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    functionId: 'Product',
    teamId: 'team-1',
    podId: 'pod-1',
    joinDate: '2023-01-15',
    active: true
  },
  {
    id: 'person-2',
    name: 'Michael Brooks',
    email: 'michael.brooks@company.com',
    functionId: 'Analytics',
    managerId: 'person-1',
    teamId: 'team-2',
    podId: 'pod-3',
    joinDate: '2023-02-20',
    active: true
  },
  {
    id: 'person-3',
    name: 'Amanda Clark',
    email: 'amanda.clark@company.com',
    functionId: 'S&O',
    teamId: 'team-3',
    podId: 'pod-6',
    joinDate: '2023-03-10',
    active: true
  },
  {
    id: 'person-4',
    name: 'Elena Rodriguez',
    email: 'elena.rodriguez@company.com',
    functionId: 'S&O',
    teamId: 'team-4',
    podId: 'pod-8',
    joinDate: '2023-01-05',
    active: true
  },
  {
    id: 'person-5',
    name: 'Tyler Jackson',
    email: 'tyler.jackson@company.com',
    functionId: 'Product',
    managerId: 'person-1',
    teamId: 'team-5',
    podId: 'pod-10',
    joinDate: '2023-04-12',
    active: true
  },
  // Team Members
  {
    id: 'person-6',
    name: 'Lisa Rodriguez',
    email: 'lisa.rodriguez@company.com',
    functionId: 'Product',
    managerId: 'person-1',
    teamId: 'team-1',
    podId: 'pod-2',
    joinDate: '2023-05-20',
    active: true
  },
  {
    id: 'person-7',
    name: 'Marcus Johnson',
    email: 'marcus.johnson@company.com',
    functionId: 'Analytics',
    managerId: 'person-2',
    teamId: 'team-1',
    podId: 'pod-1',
    joinDate: '2023-06-15',
    active: true
  },
  {
    id: 'person-8',
    name: 'Emma Wilson',
    email: 'emma.wilson@company.com',
    functionId: 'S&O',
    managerId: 'person-3',
    teamId: 'team-1',
    podId: 'pod-1',
    joinDate: '2023-07-10',
    active: true
  },
  {
    id: 'person-9',
    name: 'Tom Anderson',
    email: 'tom.anderson@company.com',
    functionId: 'Design',
    teamId: 'team-1',
    podId: 'pod-2',
    joinDate: '2023-08-05',
    active: true
  },
  {
    id: 'person-10',
    name: 'Jake Martinez',
    email: 'jake.martinez@company.com',
    functionId: 'Engineering',
    teamId: 'team-1',
    podId: 'pod-2',
    joinDate: '2023-09-01',
    active: true
  },
  {
    id: 'person-11',
    name: 'Diana Chang',
    email: 'diana.chang@company.com',
    functionId: 'Product',
    managerId: 'person-2',
    teamId: 'team-2',
    podId: 'pod-3',
    joinDate: '2023-03-25',
    active: true
  },
  {
    id: 'person-12',
    name: 'Robert Kim',
    email: 'robert.kim@company.com',
    functionId: 'S&O',
    managerId: 'person-3',
    teamId: 'team-2',
    podId: 'pod-3',
    joinDate: '2023-04-18',
    active: true
  },
  {
    id: 'person-13',
    name: 'Jessica Wu',
    email: 'jessica.wu@company.com',
    functionId: 'Product',
    managerId: 'person-1',
    teamId: 'team-2',
    podId: 'pod-4',
    joinDate: '2023-05-12',
    active: true
  },
  {
    id: 'person-14',
    name: 'David Taylor',
    email: 'david.taylor@company.com',
    functionId: 'Design',
    teamId: 'team-2',
    podId: 'pod-4',
    joinDate: '2023-06-20',
    active: true
  },
  {
    id: 'person-15',
    name: 'Alex Foster',
    email: 'alex.foster@company.com',
    functionId: 'Engineering',
    teamId: 'team-2',
    podId: 'pod-4',
    joinDate: '2023-07-15',
    active: true
  },
  {
    id: 'person-16',
    name: 'Rachel Green',
    email: 'rachel.green@company.com',
    functionId: 'Product',
    managerId: 'person-1',
    teamId: 'team-2',
    podId: 'pod-5',
    joinDate: '2023-08-10',
    active: true
  },
  {
    id: 'person-17',
    name: 'Kevin Lee',
    email: 'kevin.lee@company.com',
    functionId: 'Analytics',
    managerId: 'person-2',
    teamId: 'team-2',
    podId: 'pod-5',
    joinDate: '2023-09-05',
    active: true
  },
  {
    id: 'person-18',
    name: 'Sophie Davis',
    email: 'sophie.davis@company.com',
    functionId: 'S&O',
    managerId: 'person-3',
    teamId: 'team-2',
    podId: 'pod-5',
    joinDate: '2023-10-01',
    active: true
  },
  {
    id: 'person-19',
    name: 'Chris Miller',
    email: 'chris.miller@company.com',
    functionId: 'Analytics',
    managerId: 'person-2',
    teamId: 'team-3',
    podId: 'pod-6',
    joinDate: '2023-04-25',
    active: true
  },
  {
    id: 'person-20',
    name: 'Nicole Brown',
    email: 'nicole.brown@company.com',
    functionId: 'Product',
    managerId: 'person-1',
    teamId: 'team-3',
    podId: 'pod-6',
    joinDate: '2023-05-30',
    active: true
  },
  {
    id: 'person-21',
    name: 'Ryan Thompson',
    email: 'ryan.thompson@company.com',
    functionId: 'Product',
    managerId: 'person-1',
    teamId: 'team-3',
    podId: 'pod-7',
    joinDate: '2023-06-12',
    active: true
  },
  {
    id: 'person-22',
    name: 'Maya Patel',
    email: 'maya.patel@company.com',
    functionId: 'S&O',
    managerId: 'person-3',
    teamId: 'team-3',
    podId: 'pod-7',
    joinDate: '2023-07-08',
    active: true
  },
  {
    id: 'person-23',
    name: 'Jordan Williams',
    email: 'jordan.williams@company.com',
    functionId: 'Design',
    teamId: 'team-3',
    podId: 'pod-7',
    joinDate: '2023-08-15',
    active: true
  },
  {
    id: 'person-24',
    name: 'James Wilson',
    email: 'james.wilson@company.com',
    functionId: 'Engineering',
    teamId: 'team-4',
    podId: 'pod-8',
    joinDate: '2023-03-20',
    active: true
  },
  {
    id: 'person-25',
    name: 'Priya Sharma',
    email: 'priya.sharma@company.com',
    functionId: 'Analytics',
    managerId: 'person-2',
    teamId: 'team-4',
    podId: 'pod-8',
    joinDate: '2023-04-28',
    active: true
  },
  {
    id: 'person-26',
    name: 'Carlos Mendez',
    email: 'carlos.mendez@company.com',
    functionId: 'Engineering',
    teamId: 'team-4',
    podId: 'pod-9',
    joinDate: '2023-05-15',
    active: true
  },
  {
    id: 'person-27',
    name: 'Zoe Chen',
    email: 'zoe.chen@company.com',
    functionId: 'Product',
    managerId: 'person-1',
    teamId: 'team-4',
    podId: 'pod-9',
    joinDate: '2023-06-08',
    active: true
  },
  {
    id: 'person-28',
    name: 'Oliver Smith',
    email: 'oliver.smith@company.com',
    functionId: 'S&O',
    managerId: 'person-4',
    teamId: 'team-4',
    podId: 'pod-9',
    joinDate: '2023-07-20',
    active: true
  },
  {
    id: 'person-29',
    name: 'Isabella Moore',
    email: 'isabella.moore@company.com',
    functionId: 'Engineering',
    teamId: 'team-5',
    podId: 'pod-10',
    joinDate: '2023-05-25',
    active: true
  },
  {
    id: 'person-30',
    name: 'Nathan Cooper',
    email: 'nathan.cooper@company.com',
    functionId: 'S&O',
    managerId: 'person-4',
    teamId: 'team-5',
    podId: 'pod-10',
    joinDate: '2023-06-30',
    active: true
  },
  {
    id: 'person-31',
    name: 'Grace Liu',
    email: 'grace.liu@company.com',
    functionId: 'Analytics',
    managerId: 'person-2',
    teamId: 'team-5',
    podId: 'pod-11',
    joinDate: '2023-07-12',
    active: true
  },
  {
    id: 'person-32',
    name: 'Ethan Price',
    email: 'ethan.price@company.com',
    functionId: 'Product',
    managerId: 'person-5',
    teamId: 'team-5',
    podId: 'pod-11',
    joinDate: '2023-08-20',
    active: true
  },
  {
    id: 'person-33',
    name: 'Samantha Reed',
    email: 'samantha.reed@company.com',
    functionId: 'Design',
    teamId: 'team-5',
    podId: 'pod-11',
    joinDate: '2023-09-15',
    active: true
  }
];

export const mockComments: KRComment[] = [
  {
    id: 'comment-1',
    krId: 'kr-1',
    author: 'Lisa Rodriguez',
    content: 'Onboarding improvements are showing great results. We might exceed our target.',
    type: 'above-plan',
    timestamp: '2024-11-15T10:30:00Z'
  },
  {
    id: 'comment-2',
    krId: 'kr-2',
    author: 'Michael Brooks',
    content: 'Menu optimization taking longer than expected. May need to adjust timeline.',
    type: 'below-plan',
    timestamp: '2024-11-14T15:45:00Z'
  }
];

export const mockWeeklyActuals: WeeklyActual[] = [
  // KR-1 (Customer Acquisition) weekly data
  {
    id: 'weekly-1',
    krId: 'kr-1',
    weekOf: '2024-10-28',
    actual: '18000',
    variance: 1500,
    forecastVariance: -3000,
    notes: 'Strong week after onboarding improvements launch',
    enteredBy: 'Lisa Rodriguez',
    enteredAt: '2024-11-01T09:00:00Z'
  },
  {
    id: 'weekly-2',
    krId: 'kr-1',
    weekOf: '2024-11-04',
    actual: '20000',
    variance: 2000,
    forecastVariance: -2000,
    notes: 'Continued growth from new selection criteria',
    enteredBy: 'Lisa Rodriguez',
    enteredAt: '2024-11-08T09:00:00Z'
  },
  {
    id: 'weekly-3',
    krId: 'kr-1',
    weekOf: '2024-11-11',
    actual: '21500',
    variance: 2500,
    forecastVariance: -1500,
    notes: 'On track to hit forecast target',
    enteredBy: 'Lisa Rodriguez',
    enteredAt: '2024-11-15T09:00:00Z'
  },
  
  // KR-2 (Average Order Value) weekly data
  {
    id: 'weekly-4',
    krId: 'kr-2',
    weekOf: '2024-10-28',
    actual: '30',
    variance: -1,
    forecastVariance: 2,
    notes: 'Menu changes showing gradual improvement',
    enteredBy: 'Michael Brooks',
    enteredAt: '2024-11-01T14:00:00Z'
  },
  {
    id: 'weekly-5',
    krId: 'kr-2',
    weekOf: '2024-11-04',
    actual: '31',
    variance: 0,
    forecastVariance: 1,
    notes: 'Profitability strategies gaining traction',
    enteredBy: 'Michael Brooks',
    enteredAt: '2024-11-08T14:00:00Z'
  },
  {
    id: 'weekly-6',
    krId: 'kr-2',
    weekOf: '2024-11-11',
    actual: '32',
    variance: 1,
    forecastVariance: 0,
    notes: 'Good progress with menu optimization',
    enteredBy: 'Michael Brooks',
    enteredAt: '2024-11-15T14:00:00Z'
  },

  // KR-3 (Support Resolution Time) weekly data
  {
    id: 'weekly-7',
    krId: 'kr-3',
    weekOf: '2024-10-21',
    actual: '4.5',
    variance: -0.5,
    forecastVariance: 1.5,
    notes: 'Workforce management improvements starting to show',
    enteredBy: 'Amanda Clark',
    enteredAt: '2024-10-25T11:00:00Z'
  },
  {
    id: 'weekly-8',
    krId: 'kr-3',
    weekOf: '2024-11-04',
    actual: '3.5',
    variance: 0.5,
    forecastVariance: 0.5,
    notes: 'MSR process improvements showing results',
    enteredBy: 'Amanda Clark',
    enteredAt: '2024-11-08T11:00:00Z'
  }
];

export const mockKRs: KR[] = [
  {
    id: 'kr-1',
    organizationId: 'org-merchant',
    title: 'Improve Customer Acquisition Rate',
    description: 'Increase new customer sign-ups through optimized selection and onboarding',
    objectiveId: 'obj-1',
    teamId: 'team-1',
    podId: 'pod-2',
    owner: 'Lisa Rodriguez',
    quarterId: 'q4-2024',
    
    target: '25000',
    unit: 'customers',
    baseline: '15000',
    
    current: '21500',
    progress: 75,
    forecast: '24000',
    
    status: 'on-track',
    deadline: '2024-12-31',
    
    sqlQuery: 'SELECT COUNT(*) FROM customers WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
    autoUpdateEnabled: true,
    lastUpdated: '2024-11-15T08:00:00Z',
    
    weeklyActuals: mockWeeklyActuals.filter(w => w.krId === 'kr-1'),
    comments: [mockComments[0]],
    linkedInitiativeIds: ['init-1']
  },
  {
    id: 'kr-2',
    organizationId: 'org-merchant',
    title: 'Increase Average Order Value',
    description: 'Optimize menu placement and profitability strategies',
    objectiveId: 'obj-2',
    teamId: 'team-2',
    podId: 'pod-3',
    owner: 'Michael Brooks',
    quarterId: 'q4-2024',
    
    target: '35',
    unit: '$',
    baseline: '28',
    
    current: '32',
    progress: 60,
    forecast: '34',
    
    status: 'on-track',
    deadline: '2024-12-31',
    
    sqlQuery: 'SELECT AVG(order_total) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
    autoUpdateEnabled: true,
    lastUpdated: '2024-11-14T16:00:00Z',
    
    weeklyActuals: mockWeeklyActuals.filter(w => w.krId === 'kr-2'),
    comments: [mockComments[1]],
    linkedInitiativeIds: ['init-2']
  },
  {
    id: 'kr-3',
    organizationId: 'org-merchant',
    title: 'Reduce Support Ticket Resolution Time',
    description: 'Improve workforce management and MSR processes',
    objectiveId: 'obj-3',
    teamId: 'team-3',
    podId: 'pod-6',
    owner: 'Amanda Clark',
    quarterId: 'q4-2024',
    
    target: '2',
    unit: 'hours',
    baseline: '6',
    
    current: '3.5',
    progress: 65,
    forecast: '2.5',
    
    status: 'on-track',
    deadline: '2024-12-31',
    
    sqlQuery: 'SELECT AVG(resolution_time_hours) FROM support_tickets WHERE resolved_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
    autoUpdateEnabled: true,
    lastUpdated: '2024-11-10T12:00:00Z',
    
    weeklyActuals: mockWeeklyActuals.filter(w => w.krId === 'kr-3'),
    comments: [],
    linkedInitiativeIds: ['init-3']
  },
  {
    id: 'kr-4',
    organizationId: 'org-merchant',
    title: 'Improve System Integration Uptime',
    description: 'Enhance TAMS and S&O system reliability',
    objectiveId: 'obj-3',
    teamId: 'team-4',
    podId: 'pod-8',
    owner: 'Elena Rodriguez',
    quarterId: 'q4-2024',
    
    target: '99.9',
    unit: '%',
    baseline: '97.5',
    
    current: '99.2',
    progress: 85,
    forecast: '99.7',
    
    status: 'on-track',
    deadline: '2024-12-31',
    
    sqlQuery: 'SELECT (uptime_seconds / total_seconds) * 100 FROM system_metrics WHERE date >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
    autoUpdateEnabled: true,
    lastUpdated: '2024-11-12T14:00:00Z',
    
    weeklyActuals: [],
    comments: [],
    linkedInitiativeIds: ['init-4']
  },
  {
    id: 'kr-5',
    organizationId: 'org-merchant',
    title: 'Reduce Delivery Handoff Time',
    description: 'Optimize dasher handoff processes and order quality',
    objectiveId: 'obj-3',
    teamId: 'team-5',
    podId: 'pod-10',
    owner: 'Tyler Jackson',
    quarterId: 'q4-2024',
    
    target: '90',
    unit: 'seconds',
    baseline: '180',
    
    current: '120',
    progress: 70,
    forecast: '100',
    
    status: 'on-track',
    deadline: '2024-12-31',
    
    sqlQuery: 'SELECT AVG(handoff_time_seconds) FROM delivery_handoffs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
    autoUpdateEnabled: true,
    lastUpdated: '2024-11-13T10:00:00Z',
    
    weeklyActuals: [],
    comments: [],
    linkedInitiativeIds: ['init-5']
  }
];

export const mockInitiatives: Initiative[] = [
  {
    id: 'init-1',
    title: 'Customer Onboarding Flow Redesign',
    description: 'Redesign the customer acquisition funnel to improve conversion rates',
    teamId: 'team-1',
    podId: 'pod-2',
    owner: 'Lisa Rodriguez',
    contributors: ['Tom Anderson', 'Jake Martinez', 'Emma Wilson'],
    priority: 'high',
    status: 'in-progress',
    deadline: '2024-12-15',
    progress: 65,
    milestones: [
      {
        id: 'milestone-1',
        title: 'User Journey Analysis',
        description: 'Analyze current onboarding drop-off points',
        dueDate: '2024-10-15',
        completed: true,
        completedDate: '2024-10-12'
      },
      {
        id: 'milestone-2',
        title: 'New Flow Prototyping',
        description: 'Create and test new onboarding prototypes',
        dueDate: '2024-11-15',
        completed: true,
        completedDate: '2024-11-10'
      },
      {
        id: 'milestone-3',
        title: 'Implementation & Testing',
        description: 'Deploy new onboarding flow and A/B test',
        dueDate: '2024-12-10',
        completed: false
      }
    ],
    linkedKRIds: ['kr-1'],
    tags: ['Onboarding', 'UX', 'Conversion'],
    budget: 75000,
    resources: ['Design System', 'A/B Testing Platform']
  },
  {
    id: 'init-2',
    title: 'Menu Optimization Algorithm',
    description: 'Develop ML-driven menu optimization to increase average order value',
    teamId: 'team-2',
    podId: 'pod-4',
    owner: 'Jessica Wu',
    contributors: ['David Taylor', 'Alex Foster', 'Kevin Lee'],
    priority: 'high',
    status: 'in-progress',
    deadline: '2024-12-31',
    progress: 40,
    milestones: [
      {
        id: 'milestone-4',
        title: 'Data Analysis Complete',
        description: 'Analyze menu performance and customer behavior',
        dueDate: '2024-10-30',
        completed: true,
        completedDate: '2024-10-25'
      },
      {
        id: 'milestone-5',
        title: 'Algorithm Development',
        description: 'Build and train menu optimization models',
        dueDate: '2024-11-30',
        completed: false
      },
      {
        id: 'milestone-6',
        title: 'Pilot Testing',
        description: 'Test algorithm with select merchants',
        dueDate: '2024-12-20',
        completed: false
      }
    ],
    linkedKRIds: ['kr-2'],
    tags: ['Machine Learning', 'Menu', 'Revenue'],
    budget: 120000
  },
  {
    id: 'init-3',
    title: 'Support Automation Platform',
    description: 'Build automated support routing and resolution system',
    teamId: 'team-3',
    podId: 'pod-6',
    owner: 'Amanda Clark',
    contributors: ['Chris Miller', 'Nicole Brown', 'Maya Patel'],
    priority: 'medium',
    status: 'planning',
    deadline: '2025-01-31',
    progress: 20,
    milestones: [
      {
        id: 'milestone-7',
        title: 'Requirements Gathering',
        description: 'Define automation requirements and workflows',
        dueDate: '2024-11-15',
        completed: true,
        completedDate: '2024-11-10'
      },
      {
        id: 'milestone-8',
        title: 'Platform Design',
        description: 'Design automation platform architecture',
        dueDate: '2024-12-15',
        completed: false
      }
    ],
    linkedKRIds: ['kr-3'],
    tags: ['Automation', 'Support', 'AI'],
    budget: 90000
  },
  {
    id: 'init-4',
    title: 'Integration Reliability Upgrade',
    description: 'Upgrade TAMS and S&O systems for improved reliability and performance',
    teamId: 'team-4',
    podId: 'pod-9',
    owner: 'Carlos Mendez',
    contributors: ['Zoe Chen', 'Oliver Smith', 'James Wilson'],
    priority: 'high',
    status: 'in-progress',
    deadline: '2024-12-20',
    progress: 55,
    milestones: [
      {
        id: 'milestone-9',
        title: 'System Audit',
        description: 'Identify reliability bottlenecks',
        dueDate: '2024-10-20',
        completed: true,
        completedDate: '2024-10-18'
      },
      {
        id: 'milestone-10',
        title: 'Infrastructure Upgrade',
        description: 'Upgrade core integration infrastructure',
        dueDate: '2024-11-30',
        completed: false
      }
    ],
    linkedKRIds: ['kr-4'],
    tags: ['Infrastructure', 'Reliability', 'Integrations'],
    budget: 150000
  },
  {
    id: 'init-5',
    title: 'Delivery Quality Monitoring System',
    description: 'Real-time monitoring and optimization of delivery handoffs and quality',
    teamId: 'team-5',
    podId: 'pod-11',
    owner: 'Grace Liu',
    contributors: ['Ethan Price', 'Samantha Reed', 'Isabella Moore'],
    priority: 'medium',
    status: 'in-progress',
    deadline: '2024-12-31',
    progress: 30,
    milestones: [
      {
        id: 'milestone-11',
        title: 'Monitoring Framework',
        description: 'Build real-time quality monitoring framework',
        dueDate: '2024-11-30',
        completed: false
      },
      {
        id: 'milestone-12',
        title: 'Handoff Optimization',
        description: 'Implement automated handoff optimization',
        dueDate: '2024-12-20',
        completed: false
      }
    ],
    linkedKRIds: ['kr-5'],
    tags: ['Quality', 'Monitoring', 'Delivery'],
    budget: 80000
  }
];
