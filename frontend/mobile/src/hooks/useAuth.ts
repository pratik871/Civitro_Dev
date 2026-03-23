import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { saveTokens } from '../lib/auth';
import api from '../lib/api';
import type { User, AuthTokens } from '../types/user';

/** Normalize Indian phone numbers to E.164 format (+91XXXXXXXXXX). */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  if (phone.startsWith('+')) return phone;
  return '+' + digits;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: string;
}

interface RegisterResponse {
  user_id: string;
  message: string;
}

interface ProfileResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
  verification_level?: string;
  avatar_url?: string;
  civic_score?: number;
  reputation_tier?: string;
  preferred_language?: string;
  boundary_id?: string;
  boundary_name?: string;
  lat?: number;
  lng?: number;
  created_at: string;
}

function profileToUser(profile: ProfileResponse): User {
  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    verificationLevel: profile.verification_level,
    avatarUrl: profile.avatar_url,
    civicScore: profile.civic_score,
    reputationTier: profile.reputation_tier,
    createdAt: profile.created_at,
  };
}

/** Request GPS permission and send location to backend. Non-blocking. */
async function requestAndSendLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    // Use last known position first (instant), fall back to fresh GPS
    let loc = await Location.getLastKnownPositionAsync();
    if (!loc) {
      loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
        timeInterval: 5000,
      });
    }

    await api.put('/api/v1/auth/location', {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    });
  } catch {
    // Non-critical — user can update location later
  }
}

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    initialize,
    login,
    logout,
    updateUser,
    setLoading,
  } = useAuthStore();

  const handleSendOTP = useCallback(
    async (phone: string, name?: string) => {
      const normalized = normalizePhone(phone);
      setLoading(true);
      try {
        const response = await api.post<RegisterResponse>(
          '/api/v1/auth/register',
          { phone: normalized, name: name || normalized },
          { authenticated: false },
        );
        return { success: true, userId: response.user_id };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send OTP',
        };
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  const handleLogin = useCallback(
    async (phone: string, otp: string) => {
      const normalized = normalizePhone(phone);
      setLoading(true);
      try {
        // Verify OTP and get tokens
        const authResponse = await api.post<AuthResponse>(
          '/api/v1/auth/verify-otp',
          { phone: normalized, otp },
          { authenticated: false },
        );

        const tokens: AuthTokens = {
          accessToken: authResponse.access_token,
          refreshToken: authResponse.refresh_token,
          expiresAt: Date.now() + authResponse.expires_in * 1000,
        };

        // Save tokens first so the next request can use them
        await saveTokens(tokens);

        // Fetch user profile
        const profile = await api.get<ProfileResponse>(
          '/api/v1/auth/me',
          { authenticated: true },
        );

        const user = profileToUser(profile);

        // Persist user + tokens in store
        login(user, tokens);

        // Request GPS location and send to backend (fire-and-forget)
        requestAndSendLocation();

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Login failed',
        };
      } finally {
        setLoading(false);
      }
    },
    [login, setLoading],
  );

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const profile = await api.get<ProfileResponse>(
        '/api/v1/auth/me',
        { authenticated: true },
      );
      updateUser(profileToUser(profile));
      // Sync language from backend if it differs from local
      if (profile.preferred_language) {
        const currentLang = useSettingsStore.getState().language;
        if (currentLang !== profile.preferred_language) {
          useSettingsStore.getState().setLanguage(profile.preferred_language);
        }
      }
    } catch {
      // Silently fail — stale data is acceptable
    }
  }, [isAuthenticated, updateUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    initialize,
    sendOTP: handleSendOTP,
    login: handleLogin,
    logout: handleLogout,
    updateUser,
    refreshProfile,
  };
}
