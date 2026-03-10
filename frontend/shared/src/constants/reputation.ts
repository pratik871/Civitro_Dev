import type { ReputationTier } from '../types';

export interface ReputationTierConfig {
  key: ReputationTier;
  label: string;
  /** Minimum credibility score for this tier. */
  minScore: number;
  /** Maximum credibility score for this tier (inclusive). */
  maxScore: number;
  /** Hex color for badges and indicators. */
  color: string;
  /** Icon name from Feather Icons or Lucide. */
  icon: string;
  description: string;
  /** Privileges unlocked at this tier. */
  privileges: string[];
}

/** Reputation tiers with score thresholds and display metadata. */
export const REPUTATION_TIERS: readonly ReputationTierConfig[] = [
  {
    key: 'new_citizen',
    label: 'New Citizen',
    minScore: 0,
    maxScore: 199,
    color: '#9CA3AF',
    icon: 'user',
    description: 'New to the platform — building trust through participation',
    privileges: [
      'Report issues',
      'Post voices',
      'Vote in polls',
    ],
  },
  {
    key: 'verified_reporter',
    label: 'Verified Reporter',
    minScore: 200,
    maxScore: 499,
    color: '#3B82F6',
    icon: 'check-circle',
    description: 'Reports verified as accurate, building a track record',
    privileges: [
      'All New Citizen privileges',
      'Verify other reports',
      'Priority issue escalation',
    ],
  },
  {
    key: 'community_validator',
    label: 'Community Validator',
    minScore: 500,
    maxScore: 749,
    color: '#8B5CF6',
    icon: 'shield-check',
    description: 'Trusted community member who validates reports and resolutions',
    privileges: [
      'All Verified Reporter privileges',
      'Validate issue resolutions',
      'Create community polls',
      'Moderate voice posts',
    ],
  },
  {
    key: 'thought_leader',
    label: 'Thought Leader',
    minScore: 750,
    maxScore: 899,
    color: '#F59E0B',
    icon: 'star',
    description: 'Influential citizen whose opinions carry weight',
    privileges: [
      'All Community Validator privileges',
      'Featured in trending voices',
      'Direct messaging to representatives',
      'Early access to new features',
    ],
  },
  {
    key: 'peoples_champion',
    label: "People's Champion",
    minScore: 900,
    maxScore: 1000,
    color: '#EF4444',
    icon: 'award',
    description: 'Top-tier citizen with exceptional civic engagement',
    privileges: [
      'All Thought Leader privileges',
      'Platform advisory board',
      'Verified badge on profile',
      'Priority support',
    ],
  },
] as const;

/** Lookup map from reputation tier key to config. */
export const REPUTATION_TIER_MAP: Record<ReputationTier, ReputationTierConfig> =
  REPUTATION_TIERS.reduce(
    (acc, tier) => {
      acc[tier.key] = tier;
      return acc;
    },
    {} as Record<ReputationTier, ReputationTierConfig>,
  );

/** Point values for various score events. */
export const SCORE_EVENTS = {
  /** Points earned for filing an issue report. */
  REPORT_FILED: 10,
  /** Points earned when your report is resolved. */
  REPORT_RESOLVED: 25,
  /** Points earned when your report is verified as accurate. */
  REPORT_ACCURATE: 15,
  /** Points lost when your report is found to be false. */
  REPORT_FALSE: -50,
  /** Points earned for completing a satisfaction survey. */
  SURVEY_COMPLETED: 5,
  /** Points earned when another user follows you. */
  FOLLOWER_GAINED: 2,
  /** Points earned when your voice post gets upvoted. */
  VOICE_UPVOTED: 3,
} as const;

/**
 * Determine the reputation tier for a given credibility score.
 * Mirrors the backend TierFromScore function.
 */
export function getTierFromScore(score: number): ReputationTier {
  if (score >= 900) return 'peoples_champion';
  if (score >= 750) return 'thought_leader';
  if (score >= 500) return 'community_validator';
  if (score >= 200) return 'verified_reporter';
  return 'new_citizen';
}
