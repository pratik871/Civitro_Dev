// ---------------------------------------------------------------------------
// Voices API functions — voices service (port 8004)
// ---------------------------------------------------------------------------

import type { ApiClient } from './index';
import type {
  Voice,
  CreateVoiceRequest,
  FeedResponse,
  HashtagResponse,
} from '../types';
import { VOICES } from './endpoints';

/** Create voice API functions bound to the given client. */
export function createVoicesApi(client: ApiClient) {
  return {
    /** Create a new voice post (max 500 characters). */
    create(data: CreateVoiceRequest): Promise<{ voice: Voice }> {
      return client.post<{ voice: Voice }>(VOICES.CREATE, data);
    },

    /** Get the paginated voice feed, optionally filtered by boundary. */
    getFeed(params?: {
      boundaryId?: string;
      cursor?: string;
      limit?: number;
    }): Promise<FeedResponse> {
      return client.get<FeedResponse>(VOICES.FEED, {
        boundary_id: params?.boundaryId,
        cursor: params?.cursor,
        limit: params?.limit,
      });
    },

    /** Get a single voice post by ID. */
    getById(id: string): Promise<{ voice: Voice }> {
      return client.get<{ voice: Voice }>(VOICES.GET_BY_ID(id));
    },

    /** Toggle a like on a voice post. Returns the new liked state. */
    like(id: string): Promise<{ liked: boolean }> {
      return client.post<{ liked: boolean }>(VOICES.LIKE(id));
    },

    /** Share a voice post. */
    share(id: string): Promise<{ shared: boolean }> {
      return client.post<{ shared: boolean }>(VOICES.SHARE(id));
    },

    /** Toggle bookmark on a voice post. */
    bookmark(id: string): Promise<{ bookmarked: boolean }> {
      return client.post<{ bookmarked: boolean }>(VOICES.BOOKMARK(id));
    },

    /** Get voices matching a specific hashtag. */
    getByHashtag(tag: string): Promise<HashtagResponse> {
      return client.get<HashtagResponse>(VOICES.HASHTAG(tag));
    },
  };
}
