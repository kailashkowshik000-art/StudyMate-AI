import api from "./api";
import { suggestedQuestions } from "../data/mockChat";

export const chatService = {
  getSuggestedQuestions: () => {
    return [...suggestedQuestions];
  },

  getSessions: async () => {
    const res = await api.get("/chat/sessions");
    return res.data?.sessions || [];
  },

  createSession: async (title = "Study Session", documentId = null) => {
    const res = await api.post("/chat/sessions", { title, documentId });
    return res.data?.session;
  },

  getSessionMessages: async (sessionId) => {
    const res = await api.get(`/chat/sessions/${sessionId}/messages`);
    return res.data?.messages || [];
  },

  sendMessage: async (sessionId, content, documentId = null) => {
    const res = await api.post(`/chat/sessions/${sessionId}/messages`, {
      content,
      documentId,
    });
    return res.data; // { userMessage, assistantMessage, sources }
  },

  deleteSession: async (sessionId) => {
    const res = await api.delete(`/chat/sessions/${sessionId}`);
    return res.data;
  },
};

export default chatService;