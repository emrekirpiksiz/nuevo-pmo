"use client";

import { useEffect, useState, useCallback } from "react";
import { SessionUser, getToken, getUser, clearAuth } from "./auth";

export function useSession() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setToken(getToken());
    setUser(getUser());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("nuevo_pmo_auth_change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("nuevo_pmo_auth_change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  return {
    token,
    user,
    ready,
    isAuthenticated: !!token && !!user,
    logout: () => {
      clearAuth();
    },
  };
}
