// ---------------------------------------------------------------------------
// API endpoint path constants — one object per backend service domain.
// All paths are relative to each service's base URL (no port included).
// The API prefix is /api/v1 for all services.
// ---------------------------------------------------------------------------

const V1 = '/api/v1';

// ---- Identity service (port 8001) ----

export const AUTH = {
  REGISTER: `${V1}/auth/register`,
  VERIFY_OTP: `${V1}/auth/verify-otp`,
  REFRESH: `${V1}/auth/refresh`,
  ME: `${V1}/auth/me`,
  VERIFY_AADHAAR: `${V1}/auth/verify-aadhaar`,
} as const;

// ---- Issues service (port 8005) ----

export const ISSUES = {
  CREATE: `${V1}/issues`,
  GET_BY_ID: (id: string) => `${V1}/issues/${id}`,
  UPDATE_STATUS: (id: string) => `${V1}/issues/${id}/status`,
  GET_BY_BOUNDARY: (boundaryId: string) => `${V1}/issues/boundary/${boundaryId}`,
  UPVOTE: (id: string) => `${V1}/issues/${id}/upvote`,
  CONFIRM: (id: string) => `${V1}/issues/${id}/confirm`,
  NEARBY: `${V1}/issues/nearby`,
} as const;

// ---- Ledger service (port 8006) ----

export const LEDGER = {
  GET_TIMELINE: (issueId: string) => `${V1}/ledger/issue/${issueId}`,
  APPEND_ENTRY: `${V1}/ledger/entry`,
  GET_ENTRY: (id: string) => `${V1}/ledger/entry/${id}`,
} as const;

// ---- Registry service (port 8003) ----

export const REPRESENTATIVES = {
  GET_BY_ID: (id: string) => `${V1}/representatives/${id}`,
  GET_BY_BOUNDARY: (boundaryId: string) => `${V1}/representatives/boundary/${boundaryId}`,
  CLAIM: (id: string) => `${V1}/representatives/${id}/claim`,
  ADD_STAFF: (id: string) => `${V1}/representatives/${id}/staff`,
  GET_STAFF: (id: string) => `${V1}/representatives/${id}/staff`,
} as const;

// ---- Rating service (port 8007) ----

export const RATINGS = {
  GET_RATING: (repId: string) => `${V1}/ratings/representative/${repId}`,
  GET_HISTORY: (repId: string) => `${V1}/ratings/representative/${repId}/history`,
  SUBMIT_SURVEY: `${V1}/ratings/survey`,
  GET_RANKINGS: (boundaryId: string) => `${V1}/ratings/boundary/${boundaryId}/rankings`,
} as const;

// ---- Voices service (port 8004) ----

export const VOICES = {
  CREATE: `${V1}/voices`,
  FEED: `${V1}/voices/feed`,
  GET_BY_ID: (id: string) => `${V1}/voices/${id}`,
  LIKE: (id: string) => `${V1}/voices/${id}/like`,
  SHARE: (id: string) => `${V1}/voices/${id}/share`,
  BOOKMARK: (id: string) => `${V1}/voices/${id}/bookmark`,
  HASHTAG: (tag: string) => `${V1}/hashtags/${tag}`,
} as const;

// ---- Polls service (port 8013) ----

export const POLLS = {
  CREATE: `${V1}/polls`,
  GET_BY_ID: (id: string) => `${V1}/polls/${id}`,
  VOTE: (id: string) => `${V1}/polls/${id}/vote`,
  RESULTS: (id: string) => `${V1}/polls/${id}/results`,
  GET_BY_BOUNDARY: (boundaryId: string) => `${V1}/polls/boundary/${boundaryId}`,
  DELETE: (id: string) => `${V1}/polls/${id}`,
} as const;

// ---- Promises service (port 8010) ----

export const PROMISES = {
  LIST: `${V1}/promises`,
  GET_BY_ID: (id: string) => `${V1}/promises/${id}`,
  GET_BY_LEADER: (repId: string) => `${V1}/promises/representative/${repId}`,
  GET_BY_BOUNDARY: (boundaryId: string) => `${V1}/promises/boundary/${boundaryId}`,
} as const;

// ---- CHI service (port 8011) ----

export const CHI = {
  GET_SCORE: (boundaryId: string) => `${V1}/chi/${boundaryId}`,
  GET_HISTORY: (boundaryId: string) => `${V1}/chi/${boundaryId}/history`,
  GET_RANKINGS: `${V1}/chi/rankings`,
} as const;

// ---- Reputation service (port 8012) ----

export const REPUTATION = {
  GET_SCORE: (userId: string) => `${V1}/reputation/${userId}`,
  GET_HISTORY: (userId: string) => `${V1}/reputation/${userId}/history`,
  LEADERBOARD: (boundaryId: string) => `${V1}/reputation/leaderboard/${boundaryId}`,
} as const;

// ---- Notifications service (port 8017) ----

export const NOTIFICATIONS = {
  LIST: (userId: string) => `${V1}/notifications/users/${userId}`,
  MARK_READ: (id: string) => `${V1}/notifications/${id}/read`,
  MARK_ALL_READ: (userId: string) => `${V1}/notifications/users/${userId}/read-all`,
  GET_PREFS: (userId: string) => `${V1}/notifications/users/${userId}/prefs`,
  UPDATE_PREFS: (userId: string) => `${V1}/notifications/users/${userId}/prefs`,
  UNREAD_COUNT: (userId: string) => `${V1}/notifications/users/${userId}/unread-count`,
} as const;

// ---- Messaging service (port 8014) ----

export const MESSAGES = {
  SEND: `${V1}/messages`,
  GET_MESSAGES: (conversationId: string) => `${V1}/messages/${conversationId}`,
  LIST_CONVERSATIONS: `${V1}/conversations`,
  CREATE_CONVERSATION: `${V1}/conversations`,
  WEBSOCKET: '/ws/messages',
} as const;

// ---- Search service (port 8015) ----

export const SEARCH = {
  SEARCH: `${V1}/search`,
  TRENDING: `${V1}/search/trending`,
  AUTOCOMPLETE: `${V1}/search/autocomplete`,
  TRENDING_HASHTAGS: `${V1}/search/hashtags/trending`,
} as const;

// ---- Party / organizations service (port 8019) ----

export const ORGS = {
  CREATE: `${V1}/orgs`,
  GET_BY_ID: (id: string) => `${V1}/orgs/${id}`,
  ADD_MEMBER: (id: string) => `${V1}/orgs/${id}/members`,
  GET_MEMBERS: (id: string) => `${V1}/orgs/${id}/members`,
  REMOVE_MEMBER: (orgId: string, userId: string) => `${V1}/orgs/${orgId}/members/${userId}`,
  UPDATE_MEMBER_ROLE: (orgId: string, userId: string) => `${V1}/orgs/${orgId}/members/${userId}/role`,
  SEND_BROADCAST: (id: string) => `${V1}/orgs/${id}/broadcast`,
  GET_BROADCASTS: (id: string) => `${V1}/orgs/${id}/broadcasts`,
  ANALYTICS: (id: string) => `${V1}/orgs/${id}/analytics`,
} as const;

// ---- Advertising service (port 8020) ----

export const ADS = {
  LIST_CAMPAIGNS: `${V1}/ads/campaigns`,
  CREATE_CAMPAIGN: `${V1}/ads/campaigns`,
  GET_CAMPAIGN: (id: string) => `${V1}/ads/campaigns/${id}`,
  UPDATE_CAMPAIGN: (id: string) => `${V1}/ads/campaigns/${id}`,
  GET_AD: (id: string) => `${V1}/ads/${id}`,
  SERVE: `${V1}/ads/serve`,
  CLICK: (id: string) => `${V1}/ads/${id}/click`,
} as const;

// ---------------------------------------------------------------------------
// Service base URLs (for local development without API gateway)
// ---------------------------------------------------------------------------

/** Default localhost ports for each backend service. */
export const SERVICE_PORTS = {
  identity: 8001,
  geospatial: 8002,
  registry: 8003,
  voices: 8004,
  issues: 8005,
  ledger: 8006,
  rating: 8007,
  classification: 8008,
  sentiment: 8009,
  promises: 8010,
  chi: 8011,
  reputation: 8012,
  polls: 8013,
  messaging: 8014,
  search: 8015,
  datamine: 8016,
  notifications: 8017,
  admin: 8018,
  party: 8019,
  advertising: 8020,
} as const;

/** Build a local dev base URL for a given service. */
export function localServiceUrl(service: keyof typeof SERVICE_PORTS): string {
  return `http://localhost:${SERVICE_PORTS[service]}`;
}
