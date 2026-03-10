export type IssueCategory =
  | "pothole"
  | "garbage"
  | "streetlight"
  | "water_supply"
  | "road_damage"
  | "construction"
  | "drainage"
  | "traffic"
  | "healthcare"
  | "education"
  | "public_safety"
  | "other";

export type IssueStatus =
  | "reported"
  | "acknowledged"
  | "assigned"
  | "work_started"
  | "completed"
  | "citizen_verified";

export type IssuePriority = "low" | "medium" | "high" | "critical";

export interface IssueLocation {
  lat: number;
  lng: number;
  address: string;
  ward?: string;
  pincode?: string;
}

export interface LedgerEntry {
  step: IssueStatus;
  label: string;
  timestamp: string;
  actor?: string;
  actorRole?: string;
  note?: string;
  evidence?: string[];
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  priority: IssuePriority;
  location: IssueLocation;
  images: string[];
  reportedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    department?: string;
  };
  upvotes: number;
  commentCount: number;
  ledger: LedgerEntry[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  pothole: "Pothole",
  garbage: "Garbage",
  streetlight: "Streetlight",
  water_supply: "Water Supply",
  road_damage: "Road Damage",
  construction: "Construction",
  drainage: "Drainage",
  traffic: "Traffic",
  healthcare: "Healthcare",
  education: "Education",
  public_safety: "Public Safety",
  other: "Other",
};

export const LEDGER_STEP_LABELS: Record<IssueStatus, string> = {
  reported: "Reported",
  acknowledged: "Acknowledged",
  assigned: "Assigned",
  work_started: "Work Started",
  completed: "Completed",
  citizen_verified: "Citizen Verified",
};

export const LEDGER_STEPS: IssueStatus[] = [
  "reported",
  "acknowledged",
  "assigned",
  "work_started",
  "completed",
  "citizen_verified",
];
