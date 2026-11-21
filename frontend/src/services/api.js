/**
 * StudyMate AI API Client (Phase 8.2 Modernized)
 * Connects React frontend directly to Express backend using secure HTTP-only cookies,
 * automatic access token refresh rotation, CSRF defense, and credentials: "include".
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const LEGACY_TOKEN_KEY = "studymate_token";

let inMemoryCsrfToken = null;

export const setCsrfToken = (token) => {
  inMemoryCsrfToken = token;
};

export const getCsrfToken = () => {
  if (inMemoryCsrfToken) return inMemoryCsrfToken;
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
};

// Safe legacy token migration: never keep tokens in localStorage in Phase 8.2
export const purgeLegacyTokens = () => {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch (err) {
    // ignore
  }
};

// Concurrency queue for simultaneous refresh requests
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const notifySubscribers = (error) => {
  refreshSubscribers.forEach((cb) => cb(error));
  refreshSubscribers = [];
};

/**
 * Universal request wrapper with credentials: "include" and automated refresh
 */
async function request(endpoint, options = {}, isRetry = false) {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = {
    ...(options.headers || {}),
  };

  // Attach CSRF token on state-changing requests
  const method = (options.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    }
  }

  // If body is NOT FormData, set Content-Type to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    if (typeof options.body !== "string") {
      options.body = JSON.stringify(options.body);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Essential for HTTP-only cookies
    });

    const data = await response.json().catch(() => ({}));

    // If server provides a new CSRF token in response, save it
    if (data?.csrfToken || data?.data?.csrfToken) {
      setCsrfToken(data.csrfToken || data.data.csrfToken);
    }

    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        const isAuthEntrypoint =
          endpoint.includes("/auth/login") ||
          endpoint.includes("/auth/register") ||
          endpoint.includes("/auth/refresh") ||
          endpoint.includes("/auth/logout");

        // Try automatic refresh once for protected routes
        if (!isAuthEntrypoint && !isRetry) {
          if (!isRefreshing) {
            isRefreshing = true;

            try {
              const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
              });

              if (!refreshRes.ok) {
                throw new Error("Refresh failed");
              }

              const refreshData = await refreshRes.json().catch(() => ({}));
              if (refreshData?.data?.csrfToken) {
                setCsrfToken(refreshData.data.csrfToken);
              }

              isRefreshing = false;
              notifySubscribers(null);

              // Retry the original request
              return await request(endpoint, options, true);
            } catch (refreshErr) {
              isRefreshing = false;
              notifySubscribers(refreshErr);

              // Clear user session & broadcast unauthorized
              purgeLegacyTokens();
              try {
                localStorage.removeItem("studymate_user");
              } catch {}

              if (
                typeof window !== "undefined" &&
                !window.location.pathname.startsWith("/login")
              ) {
                window.dispatchEvent(
                  new CustomEvent("studymate:unauthorized", {
                    detail: { path: window.location.pathname },
                  })
                );
              }

              throw new Error("Session expired. Please sign in again.");
            }
          } else {
            // Another request is already refreshing; queue this request
            return new Promise((resolve, reject) => {
              subscribeTokenRefresh((err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(request(endpoint, options, true));
                }
              });
            });
          }
        }

        // If auth entrypoint failed or retry failed, notify app
        purgeLegacyTokens();
        try {
          localStorage.removeItem("studymate_user");
        } catch {}

        if (
          !isAuthEntrypoint &&
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login")
        ) {
          window.dispatchEvent(
            new CustomEvent("studymate:unauthorized", {
              detail: { path: window.location.pathname },
            })
          );
        }
      }

      // Determine human-readable error message from response data or status
      const errorMessage =
        data?.message ||
        data?.error ||
        (Array.isArray(data?.errors)
          ? data.errors.map((e) => (typeof e === "string" ? e : e.msg || e.message)).join(", ")
          : null) ||
        (response.status === 404
          ? "The requested resource was not found."
          : response.status === 403
          ? "Access forbidden. You do not have permission to perform this action."
          : response.status === 409
          ? "Conflict detected. The resource already exists."
          : response.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : response.status >= 500
          ? "An unexpected server error occurred. Please try again shortly."
          : `Request failed with status ${response.status}`);

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;

      if (response.status === 403) {
        error.isForbidden = true;
      } else if (response.status >= 500) {
        error.isServerError = true;
        // Sanitize any raw server traces or database messages
        if (data?.stack || (data?.message && (data.message.includes("Mongo") || data.message.includes("at ")))) {
          error.message = "An unexpected server error occurred. Please try again shortly.";
        }
      }

      throw error;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      error.isNetworkError = true;
      if (!error.message || error.message.includes("fetch") || error.name === "TypeError") {
        error.message =
          "Unable to connect to the StudyMate AI server. Please check your internet connection and try again.";
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("studymate:network-error", {
            detail: { message: error.message },
          })
        );
      }
    }
    throw error;
  }
}

export const api = {
  get: (endpoint, headers = {}) => request(endpoint, { method: "GET", headers }),
  post: (endpoint, body = {}, headers = {}) =>
    request(endpoint, { method: "POST", body, headers }),
  put: (endpoint, body = {}, headers = {}) =>
    request(endpoint, { method: "PUT", body, headers }),
  patch: (endpoint, body = {}, headers = {}) =>
    request(endpoint, { method: "PATCH", body, headers }),
  delete: (endpoint, headers = {}) =>
    request(endpoint, { method: "DELETE", headers }),
  upload: (endpoint, formData) =>
    request(endpoint, { method: "POST", body: formData }),
};

// Backward-compatible exports for existing imports
export const getToken = () => null; // Tokens now reside strictly in HTTP-only cookies
export const setToken = () => {};
export const removeToken = purgeLegacyTokens;

export default api;
