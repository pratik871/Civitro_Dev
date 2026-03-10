// ---------------------------------------------------------------------------
// Generic API response wrappers
// ---------------------------------------------------------------------------

/** Standard envelope returned by every API endpoint. */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** Cursor-based paginated response used by list endpoints. */
export interface PaginatedResponse<T> {
  data: T[];
  /** Opaque cursor; pass as `cursor` query-param to fetch the next page. */
  nextCursor?: string;
  total: number;
}

/** Page-based paginated response used by some list endpoints (orgs, broadcasts). */
export interface PagePaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  totalCount: number;
}

/** Structured error returned by the API on non-2xx responses. */
export interface ApiError {
  /** Machine-readable error code, e.g. "bad_request", "not_found". */
  code: string;
  /** Human-readable error description. */
  message: string;
  /** HTTP status code. */
  status: number;
  /** Optional field-level validation errors. */
  details?: Record<string, string>;
}
