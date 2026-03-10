// ---------------------------------------------------------------------------
// User & identity types — mirrors backend identity + reputation models
// ---------------------------------------------------------------------------

/** How far the user has been verified on the platform. */
export type VerificationLevel = 'phone' | 'aadhaar' | 'full';

/**
 * Reputation tier derived from the user's credibility score.
 *
 * Thresholds (credibility score):
 *  - new_citizen:           0 - 199
 *  - verified_reporter:   200 - 499
 *  - community_validator: 500 - 749
 *  - thought_leader:      750 - 899
 *  - peoples_champion:    900+
 */
export type ReputationTier =
  | 'new_citizen'
  | 'verified_reporter'
  | 'community_validator'
  | 'thought_leader'
  | 'peoples_champion';

/** A registered platform user. */
export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  verificationLevel: VerificationLevel;
  deviceFingerprint?: string;
  wardId: string;
  /** Overall credibility score, 0-1000. */
  civicScore: number;
  reputationTier: ReputationTier;
  /** BCP-47 language code (e.g. "hi", "ta"). */
  language: string;
  createdAt: string;
  updatedAt: string;
}

/** Public-facing user profile (excludes sensitive fields). */
export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  verificationLevel: VerificationLevel;
  createdAt: string;
}

/**
 * Full civic score breakdown for a user.
 * Mirrors the backend reputation CivicScore model.
 */
export interface CivicScore {
  userId: string;
  /** Overall credibility score, 0-1000. */
  credibilityScore: number;
  /** Influence score, 0-100. */
  influenceScore: number;
  tier: ReputationTier;
  reportsFiled: number;
  reportsResolved: number;
  /** Percentage of reports that were accurate, 0-1. */
  accuracyRate: number;
  followersCount: number;
  updatedAt: string;
}

/** A single point-earning (or losing) event that modifies a citizen's score. */
export interface ScoreEvent {
  id: string;
  userId: string;
  eventType: string;
  points: number;
  reason: string;
  createdAt: string;
}

// ---- Auth request/response DTOs ----

export interface RegisterRequest {
  phone: string;
  name: string;
  deviceFingerprint?: string;
}

export interface RegisterResponse {
  userId: string;
  message: string;
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface VerifyAadhaarRequest {
  aadhaarNumber: string;
  otp: string;
}
