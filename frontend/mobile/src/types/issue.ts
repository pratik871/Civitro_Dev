export type IssueCategory =
  | 'pothole'
  | 'garbage'
  | 'streetlight'
  | 'water_supply'
  | 'road_damage'
  | 'construction'
  | 'drainage'
  | 'traffic'
  | 'healthcare'
  | 'education'
  | 'public_safety'
  | 'other';

export type IssueStatus =
  | 'reported'
  | 'acknowledged'
  | 'assigned'
  | 'work_started'
  | 'completed'
  | 'citizen_verified';

export interface IssueLedgerEntry {
  status: IssueStatus;
  timestamp: string;
  description: string;
  updatedBy?: string;
  attachmentUrl?: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  photoUrl?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  latitude: number;
  longitude: number;
  address: string;
  ward: string;
  constituency: string;
  department: string;
  reportedBy: string;
  reportedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  upvotes: number;
  commentCount: number;
  hasUpvoted: boolean;
  ledger: IssueLedgerEntry[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface IssueComment {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  content: string;
  createdAt: string;
}

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  pothole: 'Pothole',
  garbage: 'Garbage',
  streetlight: 'Streetlight',
  water_supply: 'Water Supply',
  road_damage: 'Road Damage',
  construction: 'Construction',
  drainage: 'Drainage',
  traffic: 'Traffic',
  healthcare: 'Healthcare',
  education: 'Education',
  public_safety: 'Public Safety',
  other: 'Other',
};

export const ISSUE_CATEGORY_ICONS: Record<IssueCategory, string> = {
  pothole: 'alert-circle',
  garbage: 'trash-2',
  streetlight: 'zap',
  water_supply: 'droplet',
  road_damage: 'alert-triangle',
  construction: 'hard-hat',
  drainage: 'cloud-rain',
  traffic: 'navigation',
  healthcare: 'heart',
  education: 'book-open',
  public_safety: 'shield',
  other: 'more-horizontal',
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  work_started: 'Work Started',
  completed: 'Completed',
  citizen_verified: 'Citizen Verified',
};
