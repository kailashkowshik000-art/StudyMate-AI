import api from "./api.js";

export const flashcardService = {
  getFlashcards: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.documentId) query.append("documentId", params.documentId);
    if (params.topic) query.append("topic", params.topic);
    if (params.dueOnly) query.append("dueOnly", "true");

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await api.get(`/flashcards${qs}`);
    return res.data;
  },

  createFlashcard: async (cardData) => {
    const res = await api.post("/flashcards", cardData);
    return res.data;
  },

  generateFlashcards: async ({ documentId, count = 5, topic = "" }) => {
    const res = await api.post("/flashcards/generate", {
      documentId,
      count,
      topic,
    });
    return res.data;
  },

  reviewFlashcard: async (id, quality) => {
    const res = await api.post(`/flashcards/${id}/review`, { quality });
    return res.data;
  },

  deleteFlashcard: async (id) => {
    const res = await api.delete(`/flashcards/${id}`);
    return res.data;
  },
};

export default flashcardService;
