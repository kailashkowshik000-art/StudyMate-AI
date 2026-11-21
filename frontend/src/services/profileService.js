import api from "./api.js";

export const profileService = {
  getProfile: async () => {
    const res = await api.get("/profile");
    return res.data;
  },

  updateProfile: async (profileData) => {
    const res = await api.put("/profile", profileData);
    return res.data;
  },
};

export default profileService;
