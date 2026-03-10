import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { User, AuthTokens } from '../types/user';

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

  const handleLogin = useCallback(
    async (phone: string, otp: string) => {
      setLoading(true);
      try {
        // In production, this would call the API
        // For now, simulate a successful login with mock data
        const mockUser: User = {
          id: 'user-001',
          name: 'Priya Sharma',
          email: 'priya@example.com',
          phone,
          civicScore: 72,
          ward: 'Ward 15 - Koramangala',
          constituency: 'Bangalore South',
          district: 'Bangalore Urban',
          state: 'Karnataka',
          issuesReported: 14,
          issuesResolved: 9,
          voicesCreated: 7,
          pollsVoted: 12,
          createdAt: '2024-06-15T10:30:00Z',
        };

        const mockTokens: AuthTokens = {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        };

        login(mockUser, mockTokens);
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

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    initialize,
    login: handleLogin,
    logout: handleLogout,
    updateUser,
  };
}
