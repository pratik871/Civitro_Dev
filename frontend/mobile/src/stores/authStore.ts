import { create } from 'zustand';
import type { User, AuthTokens } from '../types/user';
import { saveTokens, clearAll, saveUser, getUser, getTokens } from '../lib/auth';

interface PendingDeepLink {
  screen: string;
  params: Record<string, string>;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  pendingDeepLink: PendingDeepLink | null;

  // Actions
  initialize: () => Promise<void>;
  login: (user: User, tokens: AuthTokens) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setPendingDeepLink: (link: PendingDeepLink | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  pendingDeepLink: null,

  initialize: async () => {
    try {
      const user = await getUser();
      const tokens = await getTokens();

      if (user && tokens) {
        // Token exists — even if access token expired, refresh will handle it
        // on first API call. Mark as authenticated.
        set({
          user,
          isAuthenticated: true,
          isInitialized: true,
        });
      } else {
        // No user or tokens — not authenticated
        set({ isInitialized: true });
      }
    } catch (e) {
      console.warn('Auth init failed:', e);
      set({ isInitialized: true });
    }
  },

  login: async (user: User, tokens: AuthTokens) => {
    await saveTokens(tokens);
    await saveUser(user);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await clearAll();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: async (updates: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      await saveUser(updatedUser);
      set({ user: updatedUser });
    }
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setPendingDeepLink: (link: PendingDeepLink | null) => {
    set({ pendingDeepLink: link });
  },
}));
