export type GovernanceLevel =
  | 'ward_councillor'
  | 'mla'
  | 'mayor'
  | 'mp'
  | 'cm'
  | 'pm';

export const GOVERNANCE_LEVEL_LABELS: Record<GovernanceLevel, string> = {
  ward_councillor: 'Ward Councillor',
  mla: 'MLA',
  mayor: 'Mayor',
  mp: 'Member of Parliament',
  cm: 'Chief Minister',
  pm: 'Prime Minister',
};

export interface RatingBreakdown {
  responsiveness: number;
  transparency: number;
  deliveryOnPromises: number;
  accessibility: number;
  overallImpact: number;
}

export interface Promise {
  id: string;
  leaderId: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'fulfilled' | 'broken';
  progress: number;
  deadline?: string;
  createdAt: string;
}

export interface Leader {
  id: string;
  name: string;
  party: string;
  partyAbbr: string;
  avatarUrl?: string;
  governanceLevel: GovernanceLevel;
  constituency: string;
  ward?: string;
  overallRating: number;
  ratingBreakdown: RatingBreakdown;
  totalRatings: number;
  responseRate: number;
  chiScore: number;
  promisesFulfilled: number;
  promisesTotal: number;
  issuesResolved: number;
  issuesTotal: number;
  recentActivity: LeaderActivity[];
}

export interface LeaderActivity {
  id: string;
  type: 'issue_resolved' | 'promise_update' | 'public_statement' | 'meeting';
  title: string;
  description: string;
  timestamp: string;
}
