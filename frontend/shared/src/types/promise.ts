// ---------------------------------------------------------------------------
// Promise tracking types — for tracking elected representatives' promises
// ---------------------------------------------------------------------------

/** Lifecycle status of a political promise. */
export type PromiseStatus =
  | 'made'
  | 'in_progress'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'broken'
  | 'expired';

/** A promise made by an elected representative. */
export interface Promise {
  id: string;
  representativeId: string;
  title: string;
  description: string;
  category: string;
  status: PromiseStatus;
  /** Date the promise was made (ISO 8601). */
  madeAt: string;
  /** Expected deadline for fulfillment (ISO 8601). */
  deadline?: string;
  /** When the promise was fulfilled (ISO 8601), if applicable. */
  fulfilledAt?: string;
  /** Evidence URLs supporting the promise status. */
  evidenceUrls: string[];
  milestones: PromiseMilestone[];
  /** Percentage of completion, 0-100. */
  progress: number;
  /** Administrative boundary the promise applies to. */
  boundaryId: string;
  createdAt: string;
  updatedAt: string;
}

/** A milestone within a promise, tracking incremental progress. */
export interface PromiseMilestone {
  id: string;
  promiseId: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  evidenceUrl?: string;
  /** Order within the promise's milestone list. */
  sortOrder: number;
}
