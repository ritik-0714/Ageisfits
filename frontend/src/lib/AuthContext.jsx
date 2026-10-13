import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!localStorage.getItem("aegis_token"));

  const logout = useCallback(() => { localStorage.removeItem("aegis_token"); setUser(null); }, []);
  const refresh = useCallback(async () => { const { data } = await api.get("/auth/me"); setUser(data.user); return data.user; }, []);

  useEffect(() => {
    window.addEventListener("aegis:logout", logout);
    if (localStorage.getItem("aegis_token")) refresh().catch(logout).finally(() => setReady(true));
    return () => window.removeEventListener("aegis:logout", logout);
  }, [logout, refresh]);

  const value = useMemo(() => ({
    user, ready, logout, refresh, setUser,
    async login(email, password) { const { data } = await api.post("/auth/login", { email, password }); localStorage.setItem("aegis_token", data.token); setUser(data.user); return data.user; },
    async register(name, email, password) { const { data } = await api.post("/auth/register", { name, email, password }); localStorage.setItem("aegis_token", data.token); setUser(data.user); return data; },
  }), [user, ready, logout, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
