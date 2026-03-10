// ---------------------------------------------------------------------------
// Poll / democracy types — mirrors backend polls model
// ---------------------------------------------------------------------------

/** The kind of poll. */
export type PollType =
  | 'constituency'
  | 'budget'
  | 'satisfaction'
  | 'exit'
  | 'custom';

/** Derived status of a poll based on its time window and active flag. */
export type PollStatus = 'upcoming' | 'active' | 'closed';

/** A democratic poll or vote. */
export interface Poll {
  id: string;
  createdBy: string;
  boundaryId: string;
  type: PollType;
  question: string;
  options: PollOption[];
  totalVotes: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  /** Visibility scope, e.g. "public", "boundary". */
  visibility: string;
}

/** A single selectable option in a poll. */
export interface PollOption {
  id: string;
  pollId: string;
  label: string;
  votesCount: number;
  /** Percentage of total votes for this option, 0-100. */
  percentage: number;
}

/**
 * Records a single user's vote on a poll.
 * One person, one vote — enforced by unique constraint on (pollId, userId).
 */
export interface PollVote {
  pollId: string;
  userId: string;
  optionId: string;
  votedAt: string;
}

// ---- Request DTOs ----

export interface CreatePollRequest {
  createdBy: string;
  boundaryId: string;
  type: PollType;
  question: string;
  /** At least 2 option labels. */
  options: string[];
  startsAt: string;
  endsAt: string;
  visibility?: string;
}

export interface CastVoteRequest {
  userId: string;
  optionId: string;
}
