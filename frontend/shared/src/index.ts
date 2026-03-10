// ---------------------------------------------------------------------------
// @civitro/shared — barrel export
// ---------------------------------------------------------------------------

// Types
export * from './types';

// Constants
export * from './constants';

// API client & endpoint definitions
export { createApiClient, ApiClient } from './api';
export type { ApiClientConfig, ApiClientOptions } from './api';
export * from './api/endpoints';
export { createAuthApi } from './api/auth';
export { createIssuesApi } from './api/issues';
export { createLeadersApi } from './api/leaders';
export { createVoicesApi } from './api/voices';
export { createPollsApi } from './api/polls';
export { createPromisesApi } from './api/promises';
export { createNotificationsApi } from './api/notifications';
export { createMessagesApi } from './api/messages';
export { createSearchApi } from './api/search';
export type {
  SearchResult,
  SearchResponse,
  TrendingItem,
  AutocompleteResult,
} from './api/search';

// Utilities
export * from './utils';
