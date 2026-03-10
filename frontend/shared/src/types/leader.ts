// ---------------------------------------------------------------------------
// Leader / representative types — mirrors backend registry + rating models
// ---------------------------------------------------------------------------

/** Administrative governance level. */
export type GovernanceLevel = 'ward' | 'assembly' | 'district' | 'state' | 'national';

/** An elected or appointed public representative. */
export interface Leader {
  id: string;
  name: string;
  party: string;
  /** Official position title (e.g. "Corporator", "MLA"). */
  position: string;
  level: GovernanceLevel;
  /** Administrative boundary this representative serves. */
  boundaryId: string;
  photoUrl?: string;
  /** Whether the representative has claimed their profile. */
  claimed: boolean;
  claimedByUserId?: string;
  verified: boolean;
  /** Composite accountability rating, 0-5. */
  rating: number;
  contactInfo?: Record<string, unknown>;
  staffAccounts?: StaffAccount[];
}

/** A staff member managing a representative's profile. */
export interface StaffAccount {
  id: string;
  repId: string;
  userId: string;
  role: string;
  permissions?: Record<string, unknown>;
}

/**
 * Computed accountability rating for a representative.
 * Weighted composite over a 90-day rolling window (min 20 samples).
 *
 * Formula weights:
 *  - Responsiveness:        25%
 *  - Resolution Speed:      25%
 *  - Citizen Satisfaction:  20%
 *  - Sentiment Analysis:    15%
 *  - CHI Improvement:       15%
 */
export interface LeaderRating {
  id: string;
  representativeId: string;
  /** Composite score, 0-5. */
  computedScore: number;
  responsivenessScore: number;
  resolutionSpeedScore: number;
  citizenSatisfactionScore: number;
  sentimentScore: number;
  chiImprovementScore: number;
  sampleCount: number;
  windowStart: string;
  windowEnd: string;
  computedAt: string;
}

/**
 * Component breakdown of a leader's rating.
 * Used for the visual radar/spider chart on leader profiles.
 */
export interface RatingComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
}

/** A citizen's satisfaction survey for a specific issue handled by a representative. */
export interface SatisfactionSurvey {
  id: string;
  userId: string;
  representativeId: string;
  issueId: string;
  /** Score from 1-5. */
  score: number;
  feedback: string;
  createdAt: string;
}

// ---- Request DTOs ----

export interface SubmitSurveyRequest {
  userId: string;
  representativeId: string;
  issueId: string;
  /** Score from 1-5. */
  score: number;
  feedback?: string;
}

export interface ClaimRequest {
  userId: string;
  verification: string;
}

export interface AddStaffRequest {
  userId: string;
  role: string;
  permissions?: Record<string, unknown>;
}
