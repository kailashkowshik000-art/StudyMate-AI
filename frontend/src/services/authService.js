import api, { purgeLegacyTokens, setCsrfToken } from "./api";

const USER_KEY = "studymate_user";

export const authService = {
  getCurrentUser: () => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) return JSON.parse(stored);
    } catch (err) {
      console.warn("Could not read auth user", err);
    }
    return null;
  },

  isAuthenticated: () => {
    return !!authService.getCurrentUser();
  },

  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    purgeLegacyTokens(); // Ensure no tokens linger in localStorage

    if (res.data?.csrfToken) {
      setCsrfToken(res.data.csrfToken);
    }
    if (res.data?.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    }
    return res.data?.user;
  },

  register: async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    purgeLegacyTokens();

    if (res.data?.csrfToken) {
      setCsrfToken(res.data.csrfToken);
    }
    if (res.data?.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    }
    return res.data?.user;
  },

  fetchProfile: async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.data?.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        return res.data.user;
      }
    } catch (err) {
      console.warn("User session verification failed or expired");
      localStorage.removeItem(USER_KEY);
      return null;
    }
    return authService.getCurrentUser();
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.warn("Server logout notification failed:", err.message);
    } finally {
      purgeLegacyTokens();
      localStorage.removeItem(USER_KEY);
    }
    return true;
  },

  logoutAll: async () => {
    try {
      await api.post("/auth/logout-all");
    } catch (err) {
      console.warn("Server logout-all notification failed:", err.message);
    } finally {
      purgeLegacyTokens();
      localStorage.removeItem(USER_KEY);
    }
    return true;
  },

  getSessions: async () => {
    const res = await api.get("/auth/sessions");
    return res.data?.sessions || [];
  },

  revokeSession: async (sessionId) => {
    const res = await api.delete(`/auth/sessions/${sessionId}`);
    return res.data;
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    const res = await api.post("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    // Changing password revokes active sessions on the server
    purgeLegacyTokens();
    localStorage.removeItem(USER_KEY);
    return res;
  },

  forgotPassword: async (email) => {
    return await api.post("/auth/forgot-password", { email });
  },

  resetPassword: async (token, newPassword, confirmPassword) => {
    return await api.post("/auth/reset-password", {
      token,
      newPassword,
      confirmPassword,
    });
  },

  verifyEmail: async (token) => {
    return await api.post("/auth/verify-email", { token });
  },

  resendVerification: async (email) => {
    return await api.post("/auth/resend-verification", { email });
  },

  updateProfile: async (updatedData) => {
    const current = authService.getCurrentUser() || {};
    const updated = { ...current, ...updatedData };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    return updated;
  },
};

export default authService;
