import api from "./api.js";

export const adminApi = {
  stats: () => api.get("/admin/stats"),
  users: (params) => api.get("/admin/users", { params }),
  approve: (id) => api.patch(`/admin/users/${id}/approve`),
  reject: (id) => api.patch(`/admin/users/${id}/reject`),
  remove: (id) => api.delete(`/admin/users/${id}`),
};