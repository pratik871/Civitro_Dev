// ---------------------------------------------------------------------------
// Promises API functions — promises service (port 8010)
// ---------------------------------------------------------------------------

import type { ApiClient } from './index';
import type { Promise as CivicPromise } from '../types';
import { PROMISES } from './endpoints';

/** Create promise-tracking API functions bound to the given client. */
export function createPromisesApi(client: ApiClient) {
  return {
    /** List all promises, optionally paginated. */
    list(params?: {
      cursor?: string;
      limit?: number;
      status?: string;
    }): Promise<{ promises: CivicPromise[]; nextCursor?: string }> {
      return client.get<{ promises: CivicPromise[]; nextCursor?: string }>(PROMISES.LIST, {
        cursor: params?.cursor,
        limit: params?.limit,
        status: params?.status,
      });
    },

    /** Get a single promise by ID. */
    getById(id: string): Promise<CivicPromise> {
      return client.get<CivicPromise>(PROMISES.GET_BY_ID(id));
    },

    /** Get all promises made by a specific representative. */
    getByLeader(repId: string): Promise<{ representativeId: string; promises: CivicPromise[] }> {
      return client.get<{ representativeId: string; promises: CivicPromise[] }>(PROMISES.GET_BY_LEADER(repId));
    },

    /** Get all promises within an administrative boundary. */
    getByBoundary(boundaryId: string): Promise<{ boundaryId: string; promises: CivicPromise[] }> {
      return client.get<{ boundaryId: string; promises: CivicPromise[] }>(PROMISES.GET_BY_BOUNDARY(boundaryId));
    },
  };
}
