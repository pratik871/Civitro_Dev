// ---------------------------------------------------------------------------
// Leaders API functions — registry (port 8003) + rating (port 8007) services
// ---------------------------------------------------------------------------

import type { ApiClient } from './index';
import type {
  Leader,
  StaffAccount,
  LeaderRating,
  SubmitSurveyRequest,
  SatisfactionSurvey,
  ClaimRequest,
  AddStaffRequest,
} from '../types';
import { REPRESENTATIVES, RATINGS } from './endpoints';

/** Create leader API functions bound to the given client(s). */
export function createLeadersApi(
  registryClient: ApiClient,
  ratingClient?: ApiClient,
) {
  const rating = ratingClient ?? registryClient;

  return {
    // ---- Registry endpoints ----

    /** Get a representative by ID. */
    getById(id: string): Promise<{ representative: Leader }> {
      return registryClient.get<{ representative: Leader }>(REPRESENTATIVES.GET_BY_ID(id));
    },

    /** List representatives serving a given administrative boundary. */
    getByBoundary(boundaryId: string): Promise<{ representatives: Leader[] }> {
      return registryClient.get<{ representatives: Leader[] }>(REPRESENTATIVES.GET_BY_BOUNDARY(boundaryId));
    },

    /** Claim a representative profile (requires verification). */
    claim(repId: string, data: ClaimRequest): Promise<{ message: string; claimed: boolean }> {
      return registryClient.post<{ message: string; claimed: boolean }>(REPRESENTATIVES.CLAIM(repId), data);
    },

    /** Add a staff member to a representative's team. */
    addStaff(repId: string, data: AddStaffRequest): Promise<StaffAccount> {
      return registryClient.post<StaffAccount>(REPRESENTATIVES.ADD_STAFF(repId), data);
    },

    /** List staff accounts for a representative. */
    getStaff(repId: string): Promise<{ staff: StaffAccount[] }> {
      return registryClient.get<{ staff: StaffAccount[] }>(REPRESENTATIVES.GET_STAFF(repId));
    },

    // ---- Rating endpoints ----

    /** Get the current composite accountability rating for a representative. */
    getRating(repId: string): Promise<LeaderRating> {
      return rating.get<LeaderRating>(RATINGS.GET_RATING(repId));
    },

    /** Get the historical rating snapshots for a representative. */
    getRatingHistory(repId: string): Promise<{ representativeId: string; ratings: LeaderRating[] }> {
      return rating.get<{ representativeId: string; ratings: LeaderRating[] }>(RATINGS.GET_HISTORY(repId));
    },

    /** Submit a citizen satisfaction survey for a specific issue. */
    submitSurvey(data: SubmitSurveyRequest): Promise<SatisfactionSurvey> {
      return rating.post<SatisfactionSurvey>(RATINGS.SUBMIT_SURVEY, data);
    },

    /** Get representatives ranked by composite score within a boundary. */
    getRankings(boundaryId: string): Promise<{ boundaryId: string; rankings: LeaderRating[] }> {
      return rating.get<{ boundaryId: string; rankings: LeaderRating[] }>(RATINGS.GET_RANKINGS(boundaryId));
    },
  };
}
