// ---------------------------------------------------------------------------
// API client factory
// ---------------------------------------------------------------------------

import type { ApiResponse, ApiError } from '../types';

/** Configuration for creating an API client. */
export interface ApiClientConfig {
  /** Base URL of the target service (e.g. "http://localhost:8001"). */
  baseUrl: string;
  /** Optional function that returns the current auth token. */
  getToken?: () => string | null | Promise<string | null>;
  /** Optional request timeout in milliseconds (default: 15000). */
  timeout?: number;
  /** Optional custom headers merged into every request. */
  headers?: Record<string, string>;
}

/**
 * Lightweight, fetch-based API client.
 *
 * Works identically in React Native (built-in fetch) and Next.js
 * (Node 18+ native fetch or polyfilled). No external dependencies.
 */
export class ApiClient {
  private baseUrl: string;
  private getToken: (() => string | null | Promise<string | null>) | undefined;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig) {
    // Strip trailing slash
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.getToken = config.getToken;
    this.timeout = config.timeout ?? 15_000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.headers,
    };
  }

  // ---- Core request method ----

  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
      /** Override timeout for this request. */
      timeout?: number;
    },
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;

    // Append query params
    if (options?.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    // Build headers
    const headers: Record<string, string> = { ...this.defaultHeaders, ...options?.headers };
    if (this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutMs = options?.timeout ?? this.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorBody: ApiError;
        try {
          errorBody = await response.json() as ApiError;
        } catch {
          errorBody = {
            code: 'unknown',
            message: response.statusText || 'Request failed',
            status: response.status,
          };
        }
        throw errorBody;
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw ApiError as-is
      if (error && typeof error === 'object' && 'code' in error && 'status' in error) {
        throw error;
      }

      // Timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError: ApiError = {
          code: 'timeout',
          message: `Request timed out after ${timeoutMs}ms`,
          status: 408,
        };
        throw timeoutError;
      }

      // Network or other error
      const networkError: ApiError = {
        code: 'network_error',
        message: error instanceof Error ? error.message : 'Network request failed',
        status: 0,
      };
      throw networkError;
    }
  }

  // ---- Convenience methods ----

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, { params });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

/**
 * Factory function to create a configured API client.
 *
 * @example
 * ```ts
 * const identityApi = createApiClient({
 *   baseUrl: 'http://localhost:8001',
 *   getToken: () => authStore.getState().token,
 * });
 * ```
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export { type ApiClientConfig as ApiClientOptions };
