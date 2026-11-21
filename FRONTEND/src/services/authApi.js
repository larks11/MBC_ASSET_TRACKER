import api from "./api.js";

export const authApi = {
  register: (body) => api.post("/auth/register", body),
  login: (body) => api.post("/auth/login", body),
  me: () => api.get("/auth/me"),
  changePassword: (body) => api.post("/auth/change-password", body),
};