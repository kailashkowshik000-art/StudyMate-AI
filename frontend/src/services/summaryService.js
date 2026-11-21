import api from "./api";

export const summaryService = {
  generateSummary: async (documentId, forceRefresh = false, summaryMode = "detailed") => {
    const res = await api.post("/summaries", { documentId, forceRefresh, summaryMode });
    return res.data?.summary;
  },

  getSummary: async (documentId) => {
    try {
      const res = await api.get(`/summaries/${documentId}`);
      return res.data?.summary || null;
    } catch (err) {
      if (err.status === 404 || err.response?.status === 404) return null;
      throw err;
    }
  },

  exportSummaryUrl: (documentId, format = "markdown") => {
    return `${api.API_BASE_URL || "/api"}/summaries/${documentId}/export?format=${format}`;
  },

  exportSummary: async (documentId, format = "markdown") => {
    const res = await api.get(`/summaries/${documentId}/export?format=${format}`, {
      responseType: format === "json" ? "json" : "blob",
    });
    return res.data;
  },

  getQualityAudit: async (documentId) => {
    try {
      const res = await api.get(`/summaries/${documentId}/quality`);
      return res.data?.qualityAudit || res.data?.data?.qualityAudit || null;
    } catch (err) {
      if (err.status === 404 || err.response?.status === 404) return null;
      throw err;
    }
  },

  improveSummary: async (documentId, improvementPayload) => {
    const payload = typeof improvementPayload === "string" ? { improvementId: improvementPayload } : improvementPayload;
    const res = await api.post(`/summaries/${documentId}/improve`, payload);
    return res.data?.data || res.data;
  },
};

export default summaryService;
