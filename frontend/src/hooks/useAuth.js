import { useState, useEffect, useCallback } from "react";
import { authService } from "../services/authService";

/**
 * Custom hook providing reactive authentication state and modern session methods
 */
export function useAuth() {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(
    authService.isAuthenticated()
  );

  const syncAuth = useCallback(async () => {
    const verifiedUser = await authService.fetchProfile();
    setUser(verifiedUser);
    setIsAuthenticated(!!verifiedUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Verify session on initial load via HTTP-only cookie
    syncAuth();

    const handleStorageChange = (e) => {
      if (e.key === "studymate_user") {
        setUser(authService.getCurrentUser());
        setIsAuthenticated(authService.isAuthenticated());
      }
    };

    const handleUnauthorized = () => {
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("studymate:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("studymate:unauthorized", handleUnauthorized);
    };
  }, [syncAuth]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const loggedIn = await authService.login(email, password);
      setUser(loggedIn);
      setIsAuthenticated(!!loggedIn);
      return loggedIn;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const registered = await authService.register(name, email, password);
      setUser(registered);
      setIsAuthenticated(!!registered);
      return registered;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const logoutAll = async () => {
    setLoading(true);
    try {
      await authService.logoutAll();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    logoutAll,
    refreshUser: syncAuth,
  };
}

export default useAuth;
