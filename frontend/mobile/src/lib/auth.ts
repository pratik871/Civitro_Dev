import { MMKV } from 'react-native-mmkv';
import type { AuthTokens, User } from '../types/user';

const storage = new MMKV({ id: 'civitro-auth' });

const KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
  REFRESH_TOKEN: 'auth.refreshToken',
  EXPIRES_AT: 'auth.expiresAt',
  USER: 'auth.user',
} as const;

export function saveTokens(tokens: AuthTokens): void {
  storage.set(KEYS.ACCESS_TOKEN, tokens.accessToken);
  storage.set(KEYS.REFRESH_TOKEN, tokens.refreshToken);
  storage.set(KEYS.EXPIRES_AT, tokens.expiresAt);
}

export function getTokens(): AuthTokens | null {
  const accessToken = storage.getString(KEYS.ACCESS_TOKEN);
  const refreshToken = storage.getString(KEYS.REFRESH_TOKEN);
  const expiresAt = storage.getNumber(KEYS.EXPIRES_AT);

  if (!accessToken || !refreshToken || expiresAt === undefined) {
    return null;
  }

  return { accessToken, refreshToken, expiresAt };
}

export function clearTokens(): void {
  storage.delete(KEYS.ACCESS_TOKEN);
  storage.delete(KEYS.REFRESH_TOKEN);
  storage.delete(KEYS.EXPIRES_AT);
}

export function saveUser(user: User): void {
  storage.set(KEYS.USER, JSON.stringify(user));
}

export function getUser(): User | null {
  const userJson = storage.getString(KEYS.USER);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

export function clearUser(): void {
  storage.delete(KEYS.USER);
}

export function clearAll(): void {
  clearTokens();
  clearUser();
}

export function isTokenExpired(): boolean {
  const tokens = getTokens();
  if (!tokens) return true;
  return Date.now() > tokens.expiresAt;
}
