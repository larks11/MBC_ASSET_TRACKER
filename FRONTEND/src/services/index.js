import api from "./api.js";

const crudApi = (path) => ({
  list: (params, signal) => api.get(path, { params, signal }),
  get: (id) => api.get(`${path}/${id}`),
  create: (body) => api.post(path, body),
  update: (id, body) => api.put(`${path}/${id}`, body),
  remove: (id) => api.delete(`${path}/${id}`),
});

export const dashboardApi = { summary: (signal) => api.get("/dashboard", { signal }) };
export const metaApi = { get: () => api.get("/meta") };

export const assetApi = {
  ...crudApi("/assets"),
  history: (id) => api.get(`/assets/${id}/history`),
  exportHistory: (id) => api.get(`/assets/${id}/export/06F2`, { responseType: "blob" }),
  previewHistory: (id) => api.get(`/assets/${id}/export/06F2/preview`, { responseType: "text" }),
  nextId: (assetType) => api.get("/assets/next-id", { params: { assetType } }),
  bulk: (assets) => api.post("/assets/bulk", { assets }),
  stockLogs: (id) => api.get(`/assets/${id}/stock`),
  adjustStock: (id, body) => api.post(`/assets/${id}/stock`, body),
};

export const employeeApi = { ...crudApi("/employees"), assets: (id) => api.get(`/employees/${id}/assets`) };

export const transactionApi = {
  ...crudApi("/transactions"),
  complete: (id) => api.post(`/transactions/${id}/complete`),
  reject: (id, reason) => api.post(`/transactions/${id}/reject`, { reason }),
};

export const repairApi = crudApi("/repairs");
export const maintenanceApi = crudApi("/maintenance");
export const serviceRequestApi = crudApi("/service-requests");

// Reports: disposed / returned (naka-flatten nga items kada transaction)
export const reportApi = { flat: (name, params, signal) => api.get(`/reports/${name}`, { params, signal }) };
