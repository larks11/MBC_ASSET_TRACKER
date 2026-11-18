import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

// Ang response mismo ang ibalik (dili na response.data), ug ang error naay klaro nga message.
api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    if (axios.isCancel(err)) return Promise.reject(err);
    // Kung blob ang response (file download), basahon ang tinuod nga error message
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch {
        /* dili JSON, ignore */
      }
    }
    const e = new Error(err.response?.data?.message || err.message || "Request failed");
    e.status = err.response?.status;
    e.details = err.response?.data?.errors;
    return Promise.reject(e);
  }
);

export default api;
