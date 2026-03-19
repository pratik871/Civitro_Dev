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

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;
  if (Date.now() > tokens.expiresAt) return null;
  return tokens.accessToken;
}
