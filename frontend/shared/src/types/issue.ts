// ---------------------------------------------------------------------------
// Issue types — mirrors backend issues + ledger models
// ---------------------------------------------------------------------------

/**
 * Issue category.
 * Matches the 12 backend IssueCategory constants.
 */
export type IssueCategory =
  | 'roads'
  | 'water'
  | 'sanitation'
  | 'electricity'
  | 'street_lights'
  | 'garbage'
  | 'drainage'
  | 'public_safety'
  | 'parks'
  | 'transport'
  | 'healthcare'
  | 'other';

/**
 * Issue lifecycle status.
 * Each transition creates an immutable ledger entry.
 */
export type IssueStatus =
  | 'reported'
  | 'acknowledged'
  | 'assigned'
  | 'work_started'
  | 'completed'
  | 'citizen_verified'
  | 'resolved';

/** Issue severity level, optionally assigned at report time. */
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

/** A civic issue reported by a citizen. ID follows CIV-2026-XXXXX format. */
export interface Issue {
  /** Unique issue identifier (CIV-2026-XXXXX format). */
  id: string;
  userId: string;
  text: string;
  photoUrls: string[];
  gpsLat: number;
  gpsLng: number;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  assignedTo?: string;
  /** Administrative boundary the issue falls under. */
  boundaryId?: string;
  upvotesCount: number;
  createdAt: string;
  updatedAt: string;
}

/** An immutable, append-only record of an action taken on an issue. */
export interface LedgerEntry {
  id: string;
  issueId: string;
  /** Status the issue transitioned to with this entry. */
  status: string;
  changedByUserId: string;
  changedByRole: string;
  detail: string;
  evidenceUrls: string[];
  timestamp: string;
}

/** The full, ordered history of ledger entries for a single issue. */
export interface IssueTimeline {
  issueId: string;
  entries: LedgerEntry[];
}

/** Citizen confirmation of issue resolution. */
export interface IssueConfirmation {
  issueId: string;
  userId: string;
  confirmed: boolean;
}

// ---- Request DTOs ----

export interface CreateIssueRequest {
  text: string;
  photoUrls?: string[];
  gpsLat: number;
  gpsLng: number;
  category: IssueCategory;
  severity?: IssueSeverity;
}

export interface UpdateStatusRequest {
  status: IssueStatus;
  assignedTo?: string;
}

export interface ConfirmIssueRequest {
  confirmed: boolean;
}

export interface NearbyQuery {
  lat: number;
  lng: number;
  /** Radius in kilometers (default 5). */
  radius?: number;
}
