import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokens, User } from '../types/user';

const KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
  REFRESH_TOKEN: 'auth.refreshToken',
  EXPIRES_AT: 'auth.expiresAt',
  USER: 'auth.user',
} as const;

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.ACCESS_TOKEN, tokens.accessToken],
    [KEYS.REFRESH_TOKEN, tokens.refreshToken],
    [KEYS.EXPIRES_AT, String(tokens.expiresAt)],
  ]);
}

export async function getTokens(): Promise<AuthTokens | null> {
  const values = await AsyncStorage.multiGet([
    KEYS.ACCESS_TOKEN,
    KEYS.REFRESH_TOKEN,
    KEYS.EXPIRES_AT,
  ]);

  const accessToken = values[0][1];
  const refreshToken = values[1][1];
  const expiresAt = values[2][1];

  if (!accessToken || !refreshToken || !expiresAt) {
    return null;
  }

  return { accessToken, refreshToken, expiresAt: Number(expiresAt) };
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.ACCESS_TOKEN,
    KEYS.REFRESH_TOKEN,
    KEYS.EXPIRES_AT,
  ]);
}

export async function saveUser(user: User): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
}

export async function getUser(): Promise<User | null> {
  const userJson = await AsyncStorage.getItem(KEYS.USER);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.USER);
}

export async function clearAll(): Promise<void> {
  await clearTokens();
  await clearUser();
}

export async function isTokenExpired(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens) return true;
  return Date.now() > tokens.expiresAt;
}

// Track if a refresh is already in progress to avoid multiple simultaneous refreshes
let refreshPromise: Promise<string | null> | null = null;

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;

  // Token still valid — return it
  if (Date.now() < tokens.expiresAt) {
    return tokens.accessToken;
  }

  // Token expired — try to refresh
  if (!tokens.refreshToken) return null;

  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = refreshAccessToken(tokens.refreshToken);
  const result = await refreshPromise;
  refreshPromise = null;
  return result;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    // Determine base URL (same logic as api.ts)
    const baseUrl = __DEV__ ? 'https://api.civitro.com' : 'https://api.civitro.com';

    const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is also expired/invalid — user must re-login
      await clearAll();
      return null;
    }

    const data = await response.json();
    const newTokens: AuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };

    await saveTokens(newTokens);
    return newTokens.accessToken;
  } catch {
    // Network error during refresh — don't clear tokens, just return null
    return null;
  }
}
