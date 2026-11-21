import api from "./api";

export const documentService = {
  getDocuments: async () => {
    const res = await api.get("/documents");
    return res.data?.documents || [];
  },

  getDocumentById: async (id) => {
    const res = await api.get(`/documents/${id}`);
    return res.data?.document || null;
  },

  getDocumentStatus: async (id) => {
    const res = await api.get(`/documents/${id}/status`);
    return res.data || null;
  },

  uploadDocument: async (file, subject = "General Studies") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", subject);

    const res = await api.upload("/documents", formData);
    return res.data?.document;
  },

  deleteDocument: async (id) => {
    const res = await api.delete(`/documents/${id}`);
    return res.data;
  },

  reprocessDocument: async (id) => {
    const res = await api.post(`/documents/${id}/reprocess`);
    return res.data?.document;
  },

  retryDocument: async (id) => {
    const res = await api.post(`/documents/${id}/retry`);
    return res.data?.document;
  },

  getQueueHealth: async () => {
    const res = await api.get("/documents/queue/health");
    return res.data;
  },
};

export default documentService;