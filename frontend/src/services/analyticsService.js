import api from "./api.js";

export const analyticsService = {
  getAnalytics: async () => {
    const res = await api.get("/analytics");
    return res.data;
  },

  getRecommendations: async () => {
    const res = await api.get("/analytics/recommendations");
    return res.data;
  },

  getActivities: async (limit = 20) => {
    const res = await api.get(`/analytics/activities?limit=${limit}`);
    return res.data;
  },

  logActivity: async (activity) => {
    const res = await api.post("/analytics/log", activity);
    return res.data;
  },
};

export default analyticsService;
