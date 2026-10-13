import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Footprints, Heart, Smartphone, Watch, Zap } from "lucide-react";
import { api, errMsg } from "../lib/api.js";
import { Hero, Modal } from "../components/ui.jsx";

const ICON = { run: [Footprints, "text-orange-400"], heart: [Heart, "text-rose"], phone: [Smartphone, "text-violet"], watch: [Watch, "text-sky"], bolt: [Zap, "text-flare"] };
const ENV = { strava: ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "https://www.strava.com/settings/api"], fitbit: ["FITBIT_CLIENT_ID", "FITBIT_CLIENT_SECRET", "https://dev.fitbit.com/apps"], garmin: ["GARMIN_CLIENT_ID", "GARMIN_CLIENT_SECRET", "https://developer.garmin.com/gc-developer-program/"] };

export default function Devices() {
  const [list, setList] = useState([]), [msg, setMsg] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(""), [modal, setModal] = useState(null), [pair, setPair] = useState(null);
  const [qs] = useSearchParams();
  const load = useCallback(() => api.get("/integrations").then(r => setList(r.data.providers)).catch(e => setErr(errMsg(e))), []);
  useEffect(() => { load(); if (qs.get("connected")) setMsg(`Connected ${qs.get("connected")}. Press Sync Now to import activities.`); if (qs.get("error")) setErr(`Connection failed: ${qs.get("error")}`); }, [load, qs]);

  const act = async (p, fn) => { setBusy(p.provider); setErr(""); setMsg(""); try { await fn(); await load(); } catch (e) { setErr(errMsg(e)); } finally { setBusy(""); } };
  const connect = p => act(p, async () => { const { data } = await api.post(`/integrations/${p.provider}/connect`); if (data.url) window.location.href = data.url; else setMsg(data.message); });
  const sync = p => act(p, async () => { const { data } = await api.post(`/integrations/${p.provider}/sync`); setMsg(`${p.label}: imported ${data.imported} new, skipped ${data.skipped} already-synced.`); });
  const disconnect = p => act(p, async () => { await api.delete(`/integrations/${p.provider}`); setMsg(`${p.label} disconnected. Your logged sessions are kept.`); });
  const openInfo = async p => { setModal({ type: "info", p }); setPair(null); };
  const makeCode = p => act(p, async () => { const { data } = await api.post(`/integrations/${p.provider}/pair`); setPair(data); });

  const state = p => p.kind === "device" ? "native" : p.connected ? "connected" : p.configured ? "ready" : "config";
  return (
    <>
      <Hero pill="Connected Athlete Ecosystem" title="Wearable & Health Provider Settings" sub="Connect your devices and health platforms to feed your continuous Performance Engine. Zero fake metrics, full data transparency." />
      {msg && <p className="text-sm text-mint" role="status">{msg}</p>}{err && <p role="alert" className="text-sm text-rose">{err}</p>}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map(p => { const s = state(p), [Icon, col] = ICON[p.icon] || ICON.bolt, b = busy === p.provider;
          return (
            <article key={p.provider} className="card flex min-h-[290px] flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line bg-tile"><Icon size={22} className={col} /></div>
                  <div><h2 className="text-[15px] font-bold leading-tight">{p.label}</h2><div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-mint">{p.category}</div></div></div>
                <span className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[10.5px] font-semibold ${s === "native" ? "border-violet/40 bg-violet/10 text-violet" : s === "config" ? "border-amber/40 bg-amber/10 text-amber" : s === "connected" ? "border-emerald/40 bg-emerald/10 text-mint" : "border-line bg-[#111823] text-mute"}`}>
                  {s === "native" ? "Native Mobile Required" : s === "config" ? "Requires Config" : s === "connected" ? "Connected" : "Not Connected"}</span></div>
              <div className="mt-4 flex flex-wrap gap-1.5">{p.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
              <div className="tile mt-4 px-4 py-3.5 font-mono text-[11px] leading-relaxed text-mute">
                {s === "ready" && "Ready to connect"}
                {s === "config" && "Requires backend API credentials (CLIENT_ID & CLIENT_SECRET)"}
                {s === "native" && "Requires AegisFit native mobile application wrapper (iOS/Android)"}
                {s === "connected" && (p.metrics ? `${p.metrics.steps?.toLocaleString()} steps · ${Math.round(p.metrics.calories || 0)} kcal${p.metrics.avgHeartRate ? ` · ${Math.round(p.metrics.avgHeartRate)} bpm` : ""}` : `Connected${p.syncedCount ? ` · ${p.syncedCount} activities imported` : ""}`)}
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
                <span className="font-mono text-[10.5px] text-mute">{p.lastSyncedAt ? `Last sync ${new Date(p.lastSyncedAt).toLocaleString()}` : "No data synced"}</span>
                <div className="flex gap-2">
                  {s === "ready" && <button className="btn-emerald !px-5 !py-2" disabled={b} onClick={() => connect(p)}>Connect</button>}
                  {s === "config" && <button className="btn-dark !py-2 !text-amber" onClick={() => setModal({ type: "config", p })}>Setup Guide</button>}
                  {s === "native" && <button className="btn-violet" onClick={() => openInfo(p)}>App Info</button>}
                  {s === "connected" && p.kind === "oauth" && <><button className="btn-emerald !py-2" disabled={b} onClick={() => sync(p)}>{b ? "Syncing…" : "Sync Now"}</button><button className="btn-dark !py-2" onClick={() => disconnect(p)}>Disconnect</button></>}
                </div></div>
            </article>); })}
      </section>

      {modal?.type === "config" && <Modal title={`${modal.p.label} setup`} onClose={() => setModal(null)}>
        <ol className="list-decimal space-y-2.5 pl-5 text-sm text-mute"><li>Create a developer app at <a className="text-mint underline" href={ENV[modal.p.provider][2]} target="_blank" rel="noreferrer">{ENV[modal.p.provider][2]}</a>.</li>
          <li>Set the redirect URL to <code className="rounded bg-tile px-1.5 py-0.5 font-mono text-xs text-paper">http://localhost:5000/api/integrations/{modal.p.provider}/callback</code></li>
          <li>Add <code className="font-mono text-xs text-paper">{ENV[modal.p.provider][0]}</code> and <code className="font-mono text-xs text-paper">{ENV[modal.p.provider][1]}</code> to <code className="font-mono text-xs text-paper">backend/.env</code> and restart the backend.</li></ol>
        {modal.p.provider === "garmin" && <p className="mt-3 text-xs text-amber">Garmin's activity API is partner-gated; approval from Garmin is required.</p>}</Modal>}
      {modal?.type === "info" && <Modal title={`${modal.p.label} - native companion`} onClose={() => setModal(null)}>
        <p className="text-sm leading-relaxed text-mute">{modal.p.provider === "health_connect" ? "Android Health Connect data can only be read by an app installed on the phone. The AegisFit companion (the android/ folder in the project) reads steps, calories and heart rate and pushes them to your account using a one-time pairing code." : "Apple HealthKit can only be read by a native iOS app. An AegisFit iOS companion would push data with the same pairing code flow; it is not part of this build."}</p>
        {modal.p.provider === "health_connect" && <div className="mt-4">{pair ? <div className="rounded-xl bg-emerald/10 p-4 text-center"><div className="font-mono text-3xl font-extrabold tracking-[0.35em] text-mint">{pair.code}</div><div className="mt-1 font-mono text-[10.5px] text-mute">Enter in the companion app · valid 10 minutes</div></div>
          : <button className="btn-mint w-full" onClick={() => makeCode(modal.p)}>Generate pairing code</button>}</div>}</Modal>}
    </>
  );
}
