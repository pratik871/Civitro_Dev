// ---------------------------------------------------------------------------
// Advertising types — for the advertising / datamine services
// ---------------------------------------------------------------------------

/** Ad format for display. */
export type AdFormat = 'banner' | 'interstitial' | 'native' | 'sponsored_voice';

/** Ad campaign status. */
export type AdCampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

/** A single advertisement. */
export interface Ad {
  id: string;
  campaignId: string;
  format: AdFormat;
  title: string;
  body: string;
  imageUrl?: string;
  ctaUrl: string;
  ctaLabel: string;
  impressions: number;
  clicks: number;
  createdAt: string;
}

/** An advertising campaign containing one or more ads. */
export interface AdCampaign {
  id: string;
  advertiserId: string;
  name: string;
  status: AdCampaignStatus;
  /** Daily budget in INR (paisa). */
  dailyBudgetPaisa: number;
  /** Total budget in INR (paisa). */
  totalBudgetPaisa: number;
  /** Amount spent so far in paisa. */
  spentPaisa: number;
  targeting: TargetingCriteria;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Targeting criteria for an ad campaign. */
export interface TargetingCriteria {
  /** Target administrative boundary IDs. */
  boundaryIds?: string[];
  /** Target governance levels. */
  governanceLevels?: string[];
  /** Target age range. */
  ageRange?: { min: number; max: number };
  /** Target issue categories (show ads alongside related issues). */
  issueCategories?: string[];
  /** Target language codes. */
  languages?: string[];
  /** Target reputation tiers. */
  reputationTiers?: string[];
}
