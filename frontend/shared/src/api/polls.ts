// ---------------------------------------------------------------------------
// Polls API functions — polls service (port 8013)
// ---------------------------------------------------------------------------

import type { ApiClient } from './index';
import type {
  Poll,
  CreatePollRequest,
  CastVoteRequest,
} from '../types';
import { POLLS } from './endpoints';

/** Create poll API functions bound to the given client. */
export function createPollsApi(client: ApiClient) {
  return {
    /** Create a new democratic poll. */
    create(data: CreatePollRequest): Promise<Poll> {
      return client.post<Poll>(POLLS.CREATE, data);
    },

    /** Get a poll by ID. */
    getById(id: string): Promise<Poll> {
      return client.get<Poll>(POLLS.GET_BY_ID(id));
    },

    /**
     * Cast a vote on a poll.
     * One person, one vote is enforced server-side.
     */
    vote(pollId: string, data: CastVoteRequest): Promise<{ message: string }> {
      return client.post<{ message: string }>(POLLS.VOTE(pollId), data);
    },

    /** Get poll results with vote counts and percentages. */
    getResults(pollId: string): Promise<Poll> {
      return client.get<Poll>(POLLS.RESULTS(pollId));
    },

    /** List all polls within an administrative boundary. */
    getByBoundary(boundaryId: string): Promise<{ boundaryId: string; polls: Poll[] }> {
      return client.get<{ boundaryId: string; polls: Poll[] }>(POLLS.GET_BY_BOUNDARY(boundaryId));
    },

    /** Delete a poll (admin only). */
    deletePoll(id: string): Promise<{ message: string }> {
      return client.delete<{ message: string }>(POLLS.DELETE(id));
    },
  };
}
