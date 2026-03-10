import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Issue } from '../types/issue';

// Mock data for development
const MOCK_ISSUES: Issue[] = [
  {
    id: 'issue-001',
    title: 'Large pothole near 4th Block Junction',
    description: 'A dangerous pothole has formed at the main junction near 4th Block, Koramangala. Multiple vehicles have been damaged. Needs urgent repair.',
    category: 'pothole',
    status: 'assigned',
    priority: 'high',
    photoUrl: undefined,
    latitude: 12.9352,
    longitude: 77.6245,
    address: '4th Block Junction, Koramangala, Bangalore',
    ward: 'Ward 15 - Koramangala',
    constituency: 'Bangalore South',
    department: 'BBMP Roads Division',
    reportedBy: 'user-001',
    reportedByName: 'Priya Sharma',
    assignedTo: 'official-003',
    assignedToName: 'Ramesh Kumar, AE Roads',
    upvotes: 47,
    commentCount: 12,
    hasUpvoted: false,
    ledger: [
      { status: 'reported', timestamp: '2025-11-28T09:15:00Z', description: 'Issue reported by citizen' },
      { status: 'acknowledged', timestamp: '2025-11-28T14:30:00Z', description: 'Acknowledged by BBMP Control Room' },
      { status: 'assigned', timestamp: '2025-11-29T10:00:00Z', description: 'Assigned to AE Ramesh Kumar, Roads Division' },
    ],
    createdAt: '2025-11-28T09:15:00Z',
    updatedAt: '2025-11-29T10:00:00Z',
  },
  {
    id: 'issue-002',
    title: 'Garbage not collected for 5 days',
    description: 'Garbage collection has stopped in our area for the past 5 days. The bins are overflowing and the smell is unbearable.',
    category: 'garbage',
    status: 'work_started',
    priority: 'high',
    photoUrl: undefined,
    latitude: 12.9380,
    longitude: 77.6260,
    address: '6th Cross, 5th Block, Koramangala',
    ward: 'Ward 15 - Koramangala',
    constituency: 'Bangalore South',
    department: 'BBMP Solid Waste Management',
    reportedBy: 'user-002',
    reportedByName: 'Arjun Patel',
    assignedTo: 'official-005',
    assignedToName: 'SWM Team Lead',
    upvotes: 89,
    commentCount: 23,
    hasUpvoted: true,
    ledger: [
      { status: 'reported', timestamp: '2025-11-25T07:00:00Z', description: 'Issue reported by citizen' },
      { status: 'acknowledged', timestamp: '2025-11-25T09:00:00Z', description: 'Acknowledged by SWM Division' },
      { status: 'assigned', timestamp: '2025-11-25T11:00:00Z', description: 'Assigned to SWM Team' },
      { status: 'work_started', timestamp: '2025-11-27T08:00:00Z', description: 'Cleanup crew dispatched' },
    ],
    createdAt: '2025-11-25T07:00:00Z',
    updatedAt: '2025-11-27T08:00:00Z',
  },
  {
    id: 'issue-003',
    title: 'Broken streetlight on 80ft Road',
    description: 'The streetlight at the corner of 80ft Road and 3rd Cross has been out for 2 weeks. Very dark and unsafe at night.',
    category: 'streetlight',
    status: 'completed',
    priority: 'medium',
    photoUrl: undefined,
    latitude: 12.9310,
    longitude: 77.6210,
    address: '80ft Road, Koramangala',
    ward: 'Ward 15 - Koramangala',
    constituency: 'Bangalore South',
    department: 'BESCOM',
    reportedBy: 'user-003',
    reportedByName: 'Meera Krishnan',
    assignedTo: 'official-008',
    assignedToName: 'BESCOM Maintenance',
    upvotes: 31,
    commentCount: 8,
    hasUpvoted: false,
    ledger: [
      { status: 'reported', timestamp: '2025-11-15T18:30:00Z', description: 'Issue reported by citizen' },
      { status: 'acknowledged', timestamp: '2025-11-16T10:00:00Z', description: 'Acknowledged by BESCOM' },
      { status: 'assigned', timestamp: '2025-11-17T09:00:00Z', description: 'Assigned to maintenance team' },
      { status: 'work_started', timestamp: '2025-11-20T14:00:00Z', description: 'Maintenance crew on site' },
      { status: 'completed', timestamp: '2025-11-20T16:30:00Z', description: 'Streetlight replaced and working' },
    ],
    createdAt: '2025-11-15T18:30:00Z',
    updatedAt: '2025-11-20T16:30:00Z',
    resolvedAt: '2025-11-20T16:30:00Z',
  },
  {
    id: 'issue-004',
    title: 'Water supply disruption in 3rd Block',
    description: 'No water supply since yesterday morning. This is affecting hundreds of residents in 3rd Block.',
    category: 'water_supply',
    status: 'acknowledged',
    priority: 'critical',
    photoUrl: undefined,
    latitude: 12.9340,
    longitude: 77.6230,
    address: '3rd Block Main Road, Koramangala',
    ward: 'Ward 15 - Koramangala',
    constituency: 'Bangalore South',
    department: 'BWSSB',
    reportedBy: 'user-004',
    reportedByName: 'Vikram Singh',
    upvotes: 156,
    commentCount: 45,
    hasUpvoted: true,
    ledger: [
      { status: 'reported', timestamp: '2025-11-30T06:00:00Z', description: 'Issue reported by citizen' },
      { status: 'acknowledged', timestamp: '2025-11-30T08:30:00Z', description: 'Acknowledged by BWSSB' },
    ],
    createdAt: '2025-11-30T06:00:00Z',
    updatedAt: '2025-11-30T08:30:00Z',
  },
  {
    id: 'issue-005',
    title: 'Drainage overflow during rains',
    description: 'The storm drain near the park overflows every time it rains, flooding the entire street. Needs proper drainage work.',
    category: 'drainage',
    status: 'reported',
    priority: 'medium',
    photoUrl: undefined,
    latitude: 12.9365,
    longitude: 77.6255,
    address: 'Near Koramangala Park, 1st Block',
    ward: 'Ward 15 - Koramangala',
    constituency: 'Bangalore South',
    department: 'BBMP Storm Water Drain',
    reportedBy: 'user-005',
    reportedByName: 'Ananya Reddy',
    upvotes: 23,
    commentCount: 6,
    hasUpvoted: false,
    ledger: [
      { status: 'reported', timestamp: '2025-11-30T15:00:00Z', description: 'Issue reported by citizen' },
    ],
    createdAt: '2025-11-30T15:00:00Z',
    updatedAt: '2025-11-30T15:00:00Z',
  },
];

export function useIssues() {
  return useQuery({
    queryKey: ['issues'],
    queryFn: async (): Promise<Issue[]> => {
      // In production: return api.get<Issue[]>('/api/v1/issues');
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return MOCK_ISSUES;
    },
    staleTime: 30_000,
  });
}

export function useIssue(issueId: string) {
  return useQuery({
    queryKey: ['issues', issueId],
    queryFn: async (): Promise<Issue> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const issue = MOCK_ISSUES.find(i => i.id === issueId);
      if (!issue) throw new Error('Issue not found');
      return issue;
    },
    staleTime: 30_000,
  });
}

export function useUpvoteIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issueId: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return { issueId, success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });
}
