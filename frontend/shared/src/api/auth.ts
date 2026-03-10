// ---------------------------------------------------------------------------
// Auth API functions — identity service (port 8001)
// ---------------------------------------------------------------------------

import type { ApiClient } from './index';
import type {
  RegisterRequest,
  RegisterResponse,
  VerifyOTPRequest,
  AuthTokenResponse,
  RefreshRequest,
  VerifyAadhaarRequest,
  UserProfile,
} from '../types';
import { AUTH } from './endpoints';

/** Create auth API functions bound to the given client. */
export function createAuthApi(client: ApiClient) {
  return {
    /**
     * Register a new user with phone number.
     * An OTP will be sent to the provided phone number.
     */
    register(data: RegisterRequest): Promise<RegisterResponse> {
      return client.post<RegisterResponse>(AUTH.REGISTER, data);
    },

    /**
     * Verify OTP sent during registration or login.
     * Returns access and refresh tokens on success.
     */
    verifyOTP(data: VerifyOTPRequest): Promise<AuthTokenResponse> {
      return client.post<AuthTokenResponse>(AUTH.VERIFY_OTP, data);
    },

    /**
     * Refresh an expired access token using a valid refresh token.
     */
    refreshToken(data: RefreshRequest): Promise<AuthTokenResponse> {
      return client.post<AuthTokenResponse>(AUTH.REFRESH, data);
    },

    /**
     * Get the authenticated user's profile.
     * Requires a valid access token (set via getToken in ApiClient config).
     */
    getProfile(): Promise<UserProfile> {
      return client.get<UserProfile>(AUTH.ME);
    },

    /**
     * Verify Aadhaar identity for enhanced trust level.
     * Upgrades verification level from 'phone' to 'aadhaar'.
     */
    verifyAadhaar(data: VerifyAadhaarRequest): Promise<{ message: string }> {
      return client.post<{ message: string }>(AUTH.VERIFY_AADHAAR, data);
    },
  };
}
