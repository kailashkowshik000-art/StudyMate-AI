import api from "./api";

export const quizService = {
  createQuiz: async ({ documentId = null, topic = "General Knowledge", difficulty = "easy", numQuestions = 5 }) => {
    const res = await api.post("/quizzes", {
      documentId,
      topic,
      difficulty,
      numQuestions,
    });
    return res.data?.quiz;
  },

  // Alias for backward compatibility
  generateQuiz: async (params) => {
    return quizService.createQuiz(params);
  },

  getQuizzes: async () => {
    const res = await api.get("/quizzes");
    return res.data?.quizzes || [];
  },

  getQuizById: async (id) => {
    const res = await api.get(`/quizzes/${id}`);
    return res.data?.quiz;
  },

  submitQuiz: async (arg1, arg2) => {
    let quizId, answers;
    if (typeof arg1 === "object" && arg1 !== null) {
      quizId = arg1.quizId;
      answers = arg1.answers;
    } else {
      quizId = arg1;
      answers = arg2;
    }

    const res = await api.post(`/quizzes/${quizId}/submit`, { answers });
    return res.data;
  },
};

export default quizService;