// ---------------------------------------------------------------------------
// Issues API functions — issues service (port 8005) + ledger service (port 8006)
// ---------------------------------------------------------------------------

import type { ApiClient } from './index';
import type {
  Issue,
  CreateIssueRequest,
  UpdateStatusRequest,
  ConfirmIssueRequest,
  IssueTimeline,
  LedgerEntry,
} from '../types';
import { ISSUES, LEDGER } from './endpoints';

/** Response wrapper for a single issue. */
interface IssueResponse {
  issue: Issue;
}

/** Response wrapper for a list of issues. */
interface IssueListResponse {
  issues: Issue[];
  count: number;
}

/** Create issue API functions bound to the given client(s). */
export function createIssuesApi(
  issuesClient: ApiClient,
  ledgerClient?: ApiClient,
) {
  const ledger = ledgerClient ?? issuesClient;

  return {
    /** Report a new civic issue with photo and GPS evidence. */
    create(data: CreateIssueRequest): Promise<IssueResponse> {
      return issuesClient.post<IssueResponse>(ISSUES.CREATE, data);
    },

    /** Get a single issue by ID. */
    getById(id: string): Promise<IssueResponse> {
      return issuesClient.get<IssueResponse>(ISSUES.GET_BY_ID(id));
    },

    /** List issues within an administrative boundary. */
    getByBoundary(boundaryId: string): Promise<IssueListResponse> {
      return issuesClient.get<IssueListResponse>(ISSUES.GET_BY_BOUNDARY(boundaryId));
    },

    /** Update the status of an issue (e.g. acknowledged, assigned). */
    updateStatus(id: string, data: UpdateStatusRequest): Promise<{ message: string }> {
      return issuesClient.put<{ message: string }>(ISSUES.UPDATE_STATUS(id), data);
    },

    /** Upvote an issue to increase its visibility and priority. */
    upvote(id: string): Promise<{ message: string }> {
      return issuesClient.post<{ message: string }>(ISSUES.UPVOTE(id));
    },

    /** Confirm or deny that an issue has been resolved. */
    confirm(id: string, data: ConfirmIssueRequest): Promise<{ message: string }> {
      return issuesClient.post<{ message: string }>(ISSUES.CONFIRM(id), data);
    },

    /** Search for issues near a GPS coordinate. */
    getNearby(params: {
      lat: number;
      lng: number;
      radius?: number;
    }): Promise<IssueListResponse> {
      return issuesClient.get<IssueListResponse>(ISSUES.NEARBY, {
        lat: params.lat,
        lng: params.lng,
        radius: params.radius,
      });
    },

    // ---- Ledger endpoints ----

    /** Get the full chronological timeline (ledger) for an issue. */
    getTimeline(issueId: string): Promise<IssueTimeline> {
      return ledger.get<IssueTimeline>(LEDGER.GET_TIMELINE(issueId));
    },

    /** Get a single ledger entry by ID. */
    getLedgerEntry(id: string): Promise<LedgerEntry> {
      return ledger.get<LedgerEntry>(LEDGER.GET_ENTRY(id));
    },
  };
}
