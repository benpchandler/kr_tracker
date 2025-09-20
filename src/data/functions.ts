import { OrgFunction } from '../types';

// Default function directory entries used to seed state and provide fallbacks
export const defaultFunctions: OrgFunction[] = [
  {
    id: 'Product',
    name: 'Product',
    description: 'Product management and strategy',
    color: '#EF4444',
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'Engineering',
    name: 'Engineering',
    description: 'Software engineering and platform development',
    color: '#3B82F6',
    createdAt: '2024-01-01T00:00:01.000Z'
  },
  {
    id: 'Design',
    name: 'Design',
    description: 'Product design and research',
    color: '#F59E0B',
    createdAt: '2024-01-01T00:00:02.000Z'
  },
  {
    id: 'Analytics',
    name: 'Analytics',
    description: 'Insights and decision science',
    color: '#8B5CF6',
    createdAt: '2024-01-01T00:00:03.000Z'
  },
  {
    id: 'S&O',
    name: 'Strategy & Operations',
    description: 'Strategy and operations excellence',
    color: '#10B981',
    createdAt: '2024-01-01T00:00:04.000Z'
  }
];
