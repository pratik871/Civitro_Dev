import { create } from 'zustand';
import type { User, AuthTokens } from '../types/user';
import { saveTokens, clearAll, saveUser, getUser, getTokens } from '../lib/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: () => {
    const user = getUser();
    const tokens = getTokens();
    set({
      user,
      isAuthenticated: !!user && !!tokens,
      isInitialized: true,
    });
  },

  login: (user: User, tokens: AuthTokens) => {
    saveTokens(tokens);
    saveUser(user);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    clearAll();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (updates: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      saveUser(updatedUser);
      set({ user: updatedUser });
    }
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },
}));
