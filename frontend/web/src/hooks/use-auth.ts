"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Hook to access auth state and protect routes.
 * If `requireAuth` is true, redirects to /login when unauthenticated.
 */
export function useAuth(requireAuth = false) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login, logout, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, requireAuth, isAuthenticated, router]);

  return { user, isAuthenticated, isLoading, login, logout };
}
