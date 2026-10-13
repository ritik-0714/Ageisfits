import axios from "axios";

export const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use(cfg => { const t = localStorage.getItem("aegis_token"); if (t) cfg.headers.Authorization = `Bearer ${t}`; return cfg; });
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401 && localStorage.getItem("aegis_token")) { localStorage.removeItem("aegis_token"); window.dispatchEvent(new Event("aegis:logout")); }
  return Promise.reject(err);
});
export const errMsg = e => e?.response?.data?.error || e?.message || "Something went wrong";
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
