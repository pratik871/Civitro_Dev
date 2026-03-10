// ---------------------------------------------------------------------------
// Search API functions — search service (port 8015)
// ---------------------------------------------------------------------------

import type { ApiClient } from './index';
import { SEARCH } from './endpoints';

/** A single search result item. */
export interface SearchResult {
  type: string;
  id: string;
  title: string;
  snippet: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/** Paginated search response. */
export interface SearchResponse {
  query: string;
  type: string;
  results: SearchResult[];
  page: number;
  limit: number;
  total: number;
}

/** A trending keyword or topic. */
export interface TrendingItem {
  keyword: string;
  type: string;
  velocity: number;
  engagementScore: number;
  recencyScore: number;
  combinedScore: number;
}

/** An autocomplete suggestion. */
export interface AutocompleteResult {
  text: string;
  type: string;
}

/** Create search API functions bound to the given client. */
export function createSearchApi(client: ApiClient) {
  return {
    /**
     * Full-text search across issues, voices, leaders, promises, and hashtags.
     * @param q - Search query string
     * @param params - Optional filters and pagination
     */
    search(
      q: string,
      params?: {
        type?: 'all' | 'voices' | 'issues' | 'leaders' | 'hashtags' | 'promises';
        boundary?: string;
        page?: number;
        limit?: number;
      },
    ): Promise<SearchResponse> {
      return client.get<SearchResponse>(SEARCH.SEARCH, {
        q,
        type: params?.type,
        boundary: params?.boundary,
        page: params?.page,
        limit: params?.limit,
      });
    },

    /** Get trending topics and keywords. */
    getTrending(params?: {
      type?: string;
      limit?: number;
    }): Promise<{ trending: TrendingItem[] }> {
      return client.get<{ trending: TrendingItem[] }>(SEARCH.TRENDING, {
        type: params?.type,
        limit: params?.limit,
      });
    },

    /** Get autocomplete suggestions for a partial query. */
    autocomplete(q: string, limit?: number): Promise<{ suggestions: AutocompleteResult[] }> {
      return client.get<{ suggestions: AutocompleteResult[] }>(SEARCH.AUTOCOMPLETE, {
        q,
        limit,
      });
    },

    /** Get currently trending hashtags. */
    getTrendingHashtags(limit?: number): Promise<{ trendingHashtags: TrendingItem[] }> {
      return client.get<{ trendingHashtags: TrendingItem[] }>(SEARCH.TRENDING_HASHTAGS, {
        limit,
      });
    },
  };
}
