import api from "./api.js";

export const studyPlanService = {
  getStudyPlans: async () => {
    const res = await api.get("/study-plans");
    return res.data;
  },

  createStudyPlan: async (planData) => {
    const res = await api.post("/study-plans", planData);
    return res.data;
  },

  generateStudyPlan: async (options = {}) => {
    const res = await api.post("/study-plans/generate", options);
    return res.data;
  },

  toggleTaskCompleted: async (planId, taskId, completed) => {
    const res = await api.patch(`/study-plans/${planId}/tasks/${taskId}`, {
      completed,
    });
    return res.data;
  },

  deleteStudyPlan: async (planId) => {
    const res = await api.delete(`/study-plans/${planId}`);
    return res.data;
  },
};

export default studyPlanService;
