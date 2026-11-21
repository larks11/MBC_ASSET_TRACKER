import axios from "axios";

const TOKEN_KEY = "iams.token";
export const LOGOUT_REASON_KEY = "iams.logout.reason";

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t) => {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
};
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

// Ilakip ang JWT sa matag request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Ang response mismo ang ibalik (dili na response.data), ug ang error naay klaro nga message.
api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    if (axios.isCancel(err)) return Promise.reject(err);

    // blob / text nga error: basahon aron makuha ang tinuod nga message gikan sa backend
    let data = err.response?.data;
    try {
      if (data instanceof Blob) data = JSON.parse(await data.text());
      else if (typeof data === "string") data = JSON.parse(data);
    } catch {
      /* dili JSON */
    }

    // Expired/invalid token: i-logout ang user. Ang login/register mismo dili apil.
    const url = err.config?.url || "";
    const isAuthForm = /\/auth\/(login|register)/.test(url);
    if (err.response?.status === 401 && getToken() && !isAuthForm) {
      clearToken();
      // I-save ang rason aron makita sa login page (dili na hilom nga ma-logout)
      try {
        const method = (err.config?.method || "get").toUpperCase();
        sessionStorage.setItem(
          LOGOUT_REASON_KEY,
          `${data?.message || "Your session ended."} [${method} ${url}]`
        );
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event("auth:logout"));
    }

    const e = new Error(data?.message || err.message || "Request failed");
    e.status = err.response?.status;
    e.details = data?.errors;
    return Promise.reject(e);
  }
);

export default api;