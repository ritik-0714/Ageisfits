import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { errMsg } from "../lib/api.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { Brand } from "../components/Logo.jsx";

const COPY = {
  login: ["Login to AegisFit", "Enter your registered email and password to access your Performance Engine.", "SIGN IN TO DASHBOARD"],
  register: ["Create your AegisFit account", "Register to build your adaptive training, nutrition and recovery engine.", "CREATE ACCOUNT"],
};

export default function AuthPage({ mode }) {
  const { user, ready, login, register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  // Already signed in -> go straight to the app (no verification step).
  if (ready && user) return <Navigate to="/dashboard" replace />;

  const submit = async e => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(f.email, f.password);
        nav("/dashboard");
      } else {
        await register(f.name, f.email, f.password);
        nav("/plan");
      }
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  const [title, sub, cta] = COPY[mode];

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-3.5">
          <Link to="/login"><Brand size={44} /></Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link to="/login">Login</Link>
            <Link to="/register" className="rounded-full bg-emerald px-5 py-2 text-[13px] font-bold text-white hover:brightness-110">Get Started</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-md justify-center px-5 pb-10 pt-[9vh]">
        <form onSubmit={submit} className="w-full rounded-3xl border border-line bg-card p-8 shadow-card">
          <Brand size={60} center big />
          <h1 className="mt-6 text-center text-xl font-bold">{title}</h1>
          <p className="mx-auto mt-2 max-w-xs text-center text-[13px] leading-relaxed text-mute">{sub}</p>

          <div className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <label className="label" htmlFor="n">Full Name</label>
                <input id="n" className="field" value={f.name} onChange={set("name")} required autoComplete="name" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="e">Email Address</label>
              <input id="e" type="email" className="field" placeholder="athlete@aegisfit.io" value={f.email} onChange={set("email")} required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="p">Password</label>
              <input id="p" type="password" minLength={mode === "register" ? 8 : undefined} className="field"
                placeholder={mode === "register" ? "Minimum 8 characters" : ""} value={f.password} onChange={set("password")} required
                autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </div>
            {err && <p role="alert" className="text-sm text-rose">{err}</p>}
            <button className="btn-emerald w-full tracking-wide" disabled={busy}>{busy ? "PLEASE WAIT…" : cta}</button>
          </div>

          <div className="mt-6 border-t border-line pt-5 text-center text-[13px] text-mute">
            {mode === "login"
              ? <>New to AegisFit? <Link className="font-semibold text-mint" to="/register">Create an account</Link></>
              : <>Already registered? <Link className="font-semibold text-mint" to="/login">Sign in</Link></>}
          </div>
        </form>
      </div>
    </div>
  );
}
