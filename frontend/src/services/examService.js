import api from "./api.js";

export const examService = {
  getExams: async () => {
    const res = await api.get("/exams");
    return res.data;
  },

  getExamById: async (id) => {
    const res = await api.get(`/exams/${id}`);
    return res.data;
  },

  generateExam: async ({ documentId, subject, difficulty, timeLimit, count }) => {
    const res = await api.post("/exams/generate", {
      documentId,
      subject,
      difficulty,
      timeLimit,
      count,
    });
    return res.data;
  },

  submitExam: async (id, answers) => {
    const res = await api.post(`/exams/${id}/submit`, { answers });
    return res.data;
  },
};

export default examService;
