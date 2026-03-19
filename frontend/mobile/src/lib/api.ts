import { Platform } from 'react-native';
import { getAccessToken } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

// For tunnel mode: run `npx ngrok http 8080` and paste the URL here
// For LAN mode: set to your machine's LAN IP (e.g. '192.168.1.8')
const DEV_API_TUNNEL = 'https://spotty-kings-march.loca.lt';
const DEV_LAN_IP = '192.168.1.8';

const getBaseUrl = (): string => {
  if (__DEV__) {
    // If a tunnel URL is configured, always use it
    if (DEV_API_TUNNEL) {
      return DEV_API_TUNNEL;
    }

    const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
    const hostIp = debuggerHost?.split(':')[0] ?? 'localhost';

    // If using Expo tunnel, fall back to LAN IP
    const isTunnel = hostIp.includes('.') && !/^\d+\.\d+\.\d+\.\d+$/.test(hostIp) && hostIp !== 'localhost';
    if (isTunnel) {
      return `http://${DEV_LAN_IP}:8080`;
    }
    return `http://${hostIp}:8080`;
  }
  return 'https://api.civitro.in';
};

const BASE_URL = getBaseUrl();

/** Resolve a relative media path (e.g. /media/...) to a full URL. */
export function mediaUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown> | FormData;
  headers?: Record<string, string>;
  authenticated?: boolean;
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    authenticated = true,
  } = options;

  // Read language preference for Accept-Language header
  let lang = 'en';
  try {
    const stored = await AsyncStorage.getItem('@civitro_settings');
    if (stored) lang = JSON.parse(stored).language || 'en';
  } catch {}

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Accept-Language': lang,
    // Required for localtunnel to bypass the reminder page
    ...(DEV_API_TUNNEL ? { 'bypass-tunnel-reminder': 'true' } : {}),
    ...customHeaders,
  };

  if (authenticated) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(
      errorData?.message || `Request failed with status ${response.status}`,
      response.status,
      errorData,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: Record<string, unknown>, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: Record<string, unknown>, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: Record<string, unknown>, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, { method: 'POST', body: formData }),
};

export { ApiError };
export default api;
