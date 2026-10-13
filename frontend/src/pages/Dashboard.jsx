import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errMsg, localDate } from "../lib/api.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { VERDICT, BAND_TEXT, BAND_STYLE } from "../lib/constants.js";
import { Modal, Slider } from "../components/ui.jsx";
import { Heatmap, LineChart } from "../components/Charts.jsx";

const fmtRatio = r => (Number.isInteger(r) ? String(r) : String(+r.toFixed(2)));

function CheckInModal({ initial, onClose, onSaved }) {
  const [c, setC] = useState({ sleepHours: 7, soreness: 3, pain: 1, stiffness: 2, fatigue: 3, readinessScore: 70, ...initial }), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { const { data } = await api.post("/check-ins", { ...c, date: localDate() }); onSaved(data.state); onClose(); } catch (e) { setErr(errMsg(e)); setBusy(false); } };
  return (
    <Modal title="Daily Check-In" onClose={onClose}><div className="space-y-4">
      <Slider label="Sleep last night" value={c.sleepHours} set={v => setC({ ...c, sleepHours: v })} min={0} max={12} step={0.5} unit=" h" />
      <Slider label="Muscle soreness" value={c.soreness} set={v => setC({ ...c, soreness: v })} color="#f59e0b" />
      <Slider label="Pain" value={c.pain} set={v => setC({ ...c, pain: v })} color="#f43f5e" />
      <Slider label="Stiffness" value={c.stiffness} set={v => setC({ ...c, stiffness: v })} color="#0ea5e9" />
      <Slider label="Fatigue" value={c.fatigue} set={v => setC({ ...c, fatigue: v })} color="#a78bfa" />
      <Slider label="Readiness to train" value={c.readinessScore} set={v => setC({ ...c, readinessScore: v })} max={100} />
      {err && <p role="alert" className="text-sm text-rose">{err}</p>}
      <button className="btn-mint w-full" disabled={busy} onClick={save}>Save check-in &amp; recompute</button></div></Modal>
  );
}
function WorkloadModal({ onClose, onSaved }) {
  const [w, setW] = useState({ exerciseType: "Strength", durationMinutes: 45, rpe: 6 }), [err, setErr] = useState("");
  const save = async () => { try { await api.post("/acwr/log", w); onSaved(); onClose(); } catch (e) { setErr(errMsg(e)); } };
  return (
    <Modal title="Log ACWR Workload" onClose={onClose}><div className="space-y-4">
      <div><label className="label" htmlFor="wt">Session type</label><input id="wt" className="field" value={w.exerciseType} onChange={e => setW({ ...w, exerciseType: e.target.value })} placeholder="Strength, Run, Cycle…" /></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="label" htmlFor="wm">Duration (min)</label><input id="wm" type="number" min="1" className="field" value={w.durationMinutes} onChange={e => setW({ ...w, durationMinutes: +e.target.value })} /></div>
        <div><label className="label" htmlFor="wr">RPE (1-10)</label><input id="wr" type="number" min="1" max="10" className="field" value={w.rpe} onChange={e => setW({ ...w, rpe: +e.target.value })} /></div></div>
      <p className="tile px-3 py-2 font-mono text-xs text-mute">Session load = minutes × RPE = <b className="text-mint">{(w.durationMinutes || 0) * (w.rpe || 0)} AU</b></p>
      {err && <p role="alert" className="text-sm text-rose">{err}</p>}<button className="btn-teal w-full" onClick={save}>Add session</button></div></Modal>
  );
}

export default function Dashboard() {
  const { user } = useAuth(), nav = useNavigate();
  const [d, setD] = useState(null), [ov, setOv] = useState(null), [logs, setLogs] = useState([]), [err, setErr] = useState(""), [modal, setModal] = useState(null);
  const load = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([api.get("/performance/dashboard", { params: { date: localDate() } }), api.get("/performance/overview"), api.get("/acwr/logs")]);
      setD(a.data); setOv(b.data); setLogs(c.data.logs);
    } catch (e) { setErr(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const seed = async () => { try { await api.post("/acwr/seed-demo"); await load(); } catch (e) { setErr(errMsg(e)); } };
  const unseed = async () => { try { await api.delete("/acwr/seed-demo"); await load(); } catch (e) { setErr(errMsg(e)); } };

  if (!d) return <div className="font-mono text-sm text-mute">{err || "Loading your performance engine…"}</div>;
  const a = d.acwr, hasDemo = logs.some(l => l.isDemo), v = VERDICT[d.recommendation], p = d.performance, rd = d.readiness, rc = d.recovery;
  const recColor = rc.status === "Well Rested" ? "text-mint" : rc.status === "Partially Recovered" ? "text-amber" : rc.status === "Under-recovered" ? "text-rose" : "text-mute";

  return (
    <>
      <section className="card p-7 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2"><span className="pill"><span className="dot" />Connected Athlete Engine</span><span className="pill-dark">Connected Devices: <b className="text-mint">{d.devicesConnected}</b></span></div>
            <h1 className="mt-4 text-[32px] font-extrabold leading-tight tracking-tight">Hello, <span className="text-mint">{user?.name}</span> <span aria-hidden>👋</span></h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">Integrated sports-performance engine continuously collecting and adapting to your training, ACWR workload ratio, wearable metrics, and recovery logs.</p>
          </div>
          <div className="flex flex-wrap gap-2.5"><Link to="/plan" className="btn-mint">Diet Plan</Link><button className="btn-teal" onClick={() => setModal("workload")}>Log ACWR Workload</button><button className="btn-dark" onClick={() => setModal("checkin")}>Start Check-In</button></div>
        </div>
      </section>
      {err && <p role="alert" className="text-sm text-rose">{err}</p>}

      <section className="card flex flex-wrap items-center justify-between gap-4 border-emerald/20 p-5">
        {d.dietPlan ? <>
          <div><div className="flex flex-wrap items-center gap-2.5"><span className="pill !py-0.5 !text-[10px]">Active Diet Plan</span><b className="text-[13px]">{d.dietPlan.goal}</b><span className="text-xs text-mute">• {d.dietPlan.diet}</span></div>
            <div className="mt-2 text-sm font-semibold">Target Intake: <span className="text-mint">{d.dietPlan.kcal} kcal</span> | <span className="text-mint">{d.dietPlan.protein}g Protein</span></div></div>
          <div className="flex gap-2"><Link to="/plan" className="btn-mint">View Diet Plan</Link><Link to="/plan?edit=1" className="btn-dark">Edit</Link></div></>
          : <><div><span className="pill !py-0.5 !text-[10px]">No diet plan yet</span><p className="mt-2 text-sm text-mute">Generate a personalised calorie, macro and meal plan from your body profile.</p></div><Link to="/plan?edit=1" className="btn-mint">Create Diet Plan</Link></>}
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="card flex flex-col p-5">
          <div className="flex items-start justify-between gap-2"><h2 className="whitespace-nowrap text-[14px] font-bold">ACWR Workload Ratio</h2><span className="badge-ok !px-1.5 !text-[9px]">AegisFit</span></div>
          <div className="mt-3 flex items-center gap-3"><span className="text-[40px] font-extrabold leading-none">{fmtRatio(a.ratio)}</span><span className={`whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[9.5px] ${BAND_STYLE[a.riskBand]}`}>{BAND_TEXT[a.riskBand]}</span></div>
          <div className="mt-3 flex justify-between whitespace-nowrap font-mono text-[9px] text-mute"><span>Acute (7d Load): {Math.round(a.acuteTotal)} AU</span><span>Chronic (28d): {Math.round(a.chronicTotal)} AU</span></div>
          <div className="mt-2 h-2 rounded-full bg-[#141c28]"><div className="h-full rounded-full bg-mint" style={{ width: `${Math.min(100, a.ratio * 75)}%` }} /></div>
          <div className="mt-auto pt-4">{hasDemo ? <button className="tile w-full py-2 font-mono text-[11px] text-mute hover:text-paper" onClick={unseed}>Remove Demo Baseline Data</button>
            : <button className="tile w-full py-2 font-mono text-[11px] hover:text-mint" onClick={seed}>Seed 28-Day Baseline Demo</button>}</div>
        </article>
        <article className="card flex flex-col p-5">
          <div className="flex items-start justify-between"><div><div className="mono-label">Today's State</div><h2 className="whitespace-nowrap text-[14px] font-bold">Readiness Index</h2></div><span className="badge-ok !px-1.5 !text-[9px]">AegisFit</span></div>
          <div className="mt-3 flex items-baseline gap-2"><span className="text-[40px] font-extrabold leading-none">{rd.score ?? "–"}</span><span className="font-mono text-xs text-mute">/ 100</span></div>
          <p className="mt-2 text-xs text-mute">{rd.label}</p>
          <div className="mt-2"><span className={`${v.badge}`}>Decision: {d.recommendation}</span></div>
          <div className="mt-auto pt-4"><button className="btn-outline w-full" onClick={() => setModal("checkin")}>{d.checkIn ? "Update Daily Log" : "Start Daily Log"}</button></div>
        </article>
        <article className="card flex flex-col p-5">
          <div className="flex items-start justify-between"><div><div className="mono-label">Sleep &amp; Fatigue</div><h2 className="whitespace-nowrap text-[14px] font-bold">Recovery Status</h2></div><span className="rounded-full border border-line bg-[#111823] px-2.5 py-0.5 font-mono text-[10px] text-mute">{d.devicesConnected > 0 ? "Integrated" : "Unintegrated"}</span></div>
          <div className={`mt-3 text-[26px] font-extrabold leading-tight ${recColor}`}>{rc.status}</div>
          <p className="mt-2 text-xs text-mute">Sleep: {rc.sleepHours != null ? `${rc.sleepHours}h (${rc.sleepLabel})` : "not logged"}</p>
          <p className="mt-auto pt-6 font-mono text-[11px] text-mute">Reported Soreness: <b className="text-paper">{rc.soreness != null ? `${rc.soreness}/10` : "–"}</b></p>
        </article>
        <article className="card flex flex-col p-5">
          <div className="flex items-start justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose">Reported Discomfort</div><h2 className="whitespace-nowrap text-[14px] font-bold">Anatomy Profile</h2></div><Link to="/injury-map" className="font-mono text-[10px] text-mint">Assessment →</Link></div>
          <div className="mt-3 flex items-baseline gap-2"><span className="text-[40px] font-extrabold leading-none">{d.reportedAreas}</span><span className="text-xs text-mute">reported areas</span></div>
          {d.dominant ? <p className="mt-2 text-xs text-mute">Dominant: <b className="text-mint">{d.dominant.name} — {d.dominant.value}/10</b></p> : <p className="mt-2 text-xs text-mute">No active discomfort reported.</p>}
          <p className="mt-1 text-xs text-mute">Training Impact: <b className={d.impactLabel === "High" ? "text-rose" : "text-amber"}>{d.impactLabel}</b></p>
          <div className="mt-auto pt-4"><button className="tile w-full py-2 font-mono text-[11px] hover:text-mint" onClick={() => nav("/injury-map")}>View Assessment →</button></div>
        </article>
      </section>

      <section className="card p-7">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-extrabold">Athlete Performance Score</h2>
          <span className="font-mono text-[11px] text-mute">{p.ready ? `Based on ${p.sessions28d} sessions in the last 28 days` : "Building your performance baseline (Requires 3+ logged sessions)"}</span></div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="tile p-4"><div className="mono-label">Overall Score</div><div className={`mt-2 whitespace-nowrap font-extrabold ${p.ready ? "text-[28px]" : "text-[22px] leading-[42px]"}`}>{p.ready ? <>{p.overall}<span className="ml-2 text-base font-semibold text-mint">{p.label}</span></> : p.label}</div></div>
          <div className="tile p-4"><div className="mono-label">Consistency (28-day)</div><div className="mt-2 font-mono text-[28px] font-bold text-mint">{p.consistency}%</div></div>
          <div className="tile p-4"><div className="mono-label">Movement Quality</div><div className="mt-2 font-mono text-[28px] font-bold text-violet">{p.movementQuality != null ? `${p.movementQuality}%` : "—"}</div></div>
          <div className="tile p-4"><div className="mono-label">Strength Progress</div><div className="mt-2 font-mono text-[28px] font-bold text-sky">{p.strengthProgress >= 0 ? "+" : ""}{p.strengthProgress}%</div></div>
        </div>
      </section>

      {ov && <section className="card p-7">
        <div className="mono-label">Recovery analytics</div><h2 className="mb-5 text-xl font-extrabold">Readiness &amp; Load Trends</h2>
        <div className="grid gap-8 lg:grid-cols-2">
          <div><h3 className="mb-1 text-sm font-bold">Training load heatmap</h3><p className="mb-3 font-mono text-[10.5px] text-mute">Last 28 days, oldest first. Darker = heavier day (minutes × RPE).</p><Heatmap data={ov.heatmap} /></div>
          <div><h3 className="mb-1 text-sm font-bold">ACWR trend</h3><p className="mb-3 font-mono text-[10.5px] text-mute">Green band = optimal 0.8–1.3.</p><LineChart label="ACWR trend" min={0} max={2} bands={[{ from: 0.8, to: 1.3, color: "#34d399" }, { from: 1.5, to: 2, color: "#f43f5e" }]} points={ov.acwrTrend.map(x => ({ x: x.date.slice(5), y: x.ratio }))} /></div>
          <div><h3 className="mb-3 text-sm font-bold">Readiness trend</h3><LineChart label="Readiness trend" min={0} max={100} color="#f5b23d" points={ov.readinessTrend.map(x => ({ x: x.date.slice(5), y: x.readiness }))} /></div>
          <div><h3 className="mb-3 text-sm font-bold">Weekly consistency</h3><div className="flex items-end gap-3">{ov.weekly.map(w => <div key={w.weekEndingOn} className="flex-1 text-center"><div className="mx-auto w-full max-w-[56px] rounded-t bg-mint/70" style={{ height: `${Math.max(4, w.sessions * 18)}px` }} /><div className="mt-1 font-mono text-[10px] text-mute">{w.weekEndingOn.slice(5)}</div><div className="text-sm font-semibold">{w.sessions}</div></div>)}</div></div>
        </div>
        <h3 className="mb-2 mt-7 text-sm font-bold">Decision history</h3>
        {ov.decisionHistory.length === 0 ? <p className="font-mono text-xs text-mute">Complete daily check-ins to build a history.</p>
          : <div className="divide-y divide-line">{ov.decisionHistory.map(h => <div key={h.date} className="flex items-center justify-between py-2 text-sm"><span className="font-mono text-xs text-mute">{h.date}</span><span className={VERDICT[h.recommendation]?.badge}>{h.recommendation}</span><span className="hidden font-mono text-[10.5px] text-mute sm:block">{h.rule}</span></div>)}</div>}
      </section>}

      {modal === "checkin" && <CheckInModal initial={d.checkIn} onClose={() => setModal(null)} onSaved={load} />}
      {modal === "workload" && <WorkloadModal onClose={() => setModal(null)} onSaved={load} />}
    </>
  );
}
