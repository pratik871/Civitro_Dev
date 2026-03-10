"use client";

import { create } from "zustand";
import type { User } from "@/types";
import { clearAuth, getAccessToken, getStoredUser, setStoredUser, setTokens } from "@/lib/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, tokens: { accessToken: string; refreshToken: string; expiresAt: number }) => void;
  logout: () => void;
  setUser: (user: User) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user, tokens) => {
    setTokens(tokens);
    setStoredUser(user);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    clearAuth();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setUser: (user) => {
    setStoredUser(user);
    set({ user });
  },

  hydrate: () => {
    const token = getAccessToken();
    const user = getStoredUser();
    set({
      user: token ? user : null,
      isAuthenticated: !!token,
      isLoading: false,
    });
  },
}));
