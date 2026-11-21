import api, { API_BASE_URL, getCsrfToken, purgeLegacyTokens } from "./api";

export const accountService = {
  getSecurityOverview: async () => {
    const res = await api.get("/account/security-overview");
    return res.data;
  },

  exportData: async () => {
    const url = `${API_BASE_URL}/account/export`;
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers["X-CSRF-Token"] = csrf;

    const response = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to download data export archive");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `studymate-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return true;
  },

  deleteAccount: async (password, confirmationText = "DELETE MY ACCOUNT") => {
    const res = await api.post("/account/delete", {
      password,
      confirmationText,
    });
    purgeLegacyTokens();
    try {
      localStorage.removeItem("studymate_user");
    } catch {}
    return res;
  },
};

export default accountService;
