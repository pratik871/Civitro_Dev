// ---------------------------------------------------------------------------
// CHI (Civic Health Index) types — 8-dimensional area health score
// ---------------------------------------------------------------------------

/**
 * The 8 dimensions of the Civic Health Index.
 * Each is scored 0-100 and contributes to an overall composite.
 */
export type CHIDimension =
  | 'infrastructure'
  | 'sanitation'
  | 'safety'
  | 'healthcare'
  | 'education'
  | 'environment'
  | 'governance'
  | 'economy';

/** A single dimension score within a CHI assessment. */
export interface CHIDimensionScore {
  dimension: CHIDimension;
  /** Score for this dimension, 0-100. */
  score: number;
  /** Trend direction compared to previous assessment period. */
  trend: 'improving' | 'stable' | 'declining';
  /** Change in score from previous period. */
  delta: number;
}

/**
 * The overall Civic Health Index score for an administrative boundary.
 * Computed from 8 dimensions weighted equally by default.
 */
export interface CHIScore {
  /** Administrative boundary this score applies to. */
  boundaryId: string;
  /** Overall composite score, 0-100. */
  overallScore: number;
  /** Breakdown by dimension. */
  dimensions: CHIDimensionScore[];
  /** National rank of this boundary by CHI score. */
  rank?: number;
  /** Total boundaries ranked. */
  totalRanked?: number;
  /** ISO 8601 date when this score was last computed. */
  computedAt: string;
  /** Assessment period start (ISO 8601). */
  periodStart: string;
  /** Assessment period end (ISO 8601). */
  periodEnd: string;
}
