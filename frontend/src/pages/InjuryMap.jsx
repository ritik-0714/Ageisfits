import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, RefreshCw, Info } from "lucide-react";
import SkeletonModel from "../components/SkeletonModel.jsx";
import { Hero } from "../components/ui.jsx";
import { api, errMsg, localDate } from "../lib/api.js";
import { ANATOMY, REGION_LABEL, canonicalId, searchRegions } from "../lib/anatomy.js";
import { VERDICT } from "../lib/constants.js";

const SLIDERS = [["pain", "Pain", "#f43f5e"], ["soreness", "Soreness", "#f59e0b"], ["stiffness", "Stiffness", "#0ea5e9"], ["tenderness", "Tenderness", "#10b981"]];
const OPTS = {
  onset: [["today", "Today"], ["yesterday", "Yesterday"], ["this_week", "This week"], ["over_a_week", "Over a week"], ["chronic", "Chronic"]],
  trigger: [["workout", "Workout"], ["daily_activity", "Daily activity"], ["rest", "At rest"], ["sleep", "After sleep"], ["unknown", "Unknown"]],
  trend: [["same", "Same"], ["improving", "Improving"], ["worsening", "Worsening"]],
  activityImpact: [["none", "None"], ["mild", "Mild"], ["moderate", "Moderate"], ["severe", "Severe"]],
};
const BLANK = { pain: 0, soreness: 0, stiffness: 0, tenderness: 0, onset: "today", trigger: "workout", trend: "same", activityImpact: "none", notes: "" };
const previewAction = s => (s >= 8 ? "RECOVERY" : s >= 6 ? "POSTPONE" : s >= 4 ? "MODIFY" : "TRAIN");
const previewImpact = s => (s >= 7 ? "HIGH" : s >= 3 ? "MODERATE" : "MINIMAL");
const IMPACT_UI = { HIGH: ["HIGH TRAINING IMPACT", "badge-bad"], MODERATE: ["MODERATE TRAINING IMPACT", "badge-warn"], NONE: ["NO SIGNIFICANT OVERLAP", "badge-ok"], UNKNOWN: ["NOT MAPPED", "tag"] };
const Toggle = ({ on, onClick, children }) => <button onClick={onClick} aria-pressed={on} className={`rounded-lg border px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-wider transition ${on ? "border-emerald/50 bg-emerald/15 text-mint" : "border-line bg-tile text-mute"}`}>{children}</button>;
const Sel = ({ label, v, set, opts }) => <label className="block"><span className="mono-label">{label}</span><select className="field mt-1.5 !py-2 text-xs" value={v} onChange={e => set(e.target.value)}>{opts.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>;
const Panel = ({ title, badge, children }) => <section className="card p-6"><div className="flex items-center justify-between border-b border-line pb-3"><h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.12em]">{title}</h2>{badge}</div><div className="mt-4">{children}</div></section>;

export default function InjuryMap() {
  const [data, setData] = useState(null), [hist, setHist] = useState([]), [sel, setSel] = useState("knee_l"), [form, setForm] = useState(BLANK), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const [layers, setLayers] = useState({ skeleton: true, muscles: true, joints: true, pain: true }), [view, setView] = useState({ name: "front", nonce: 0 }), [debug, setDebug] = useState(false), [hover, setHover] = useState(null), [q, setQ] = useState("");

  const load = useCallback(async () => {
    try { const [a, h] = await Promise.all([api.get("/injury", { params: { date: localDate() } }), api.get("/injury/history")]); setData(a.data); setHist(h.data.history); } catch (e) { setErr(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const current = data?.activeInjuries.find(i => i.region === sel);
  useEffect(() => { setForm(current ? { ...BLANK, ...(current.metrics || {}), onset: current.onset || "today", trigger: current.trigger || "workout", trend: current.trend || "same", activityImpact: current.activityImpact || "none", notes: current.notes || "" } : BLANK); setMsg(""); }, [sel, data]);   // eslint-disable-line
  const sev = useMemo(() => Object.fromEntries((data?.activeInjuries || []).map(i => [i.region, i.severity])), [data]);

  const save = async () => { setErr(""); setMsg(""); try { await api.post("/discomfort", { bodyRegion: sel, ...form }, { params: { date: localDate() } }); setMsg("Assessment saved."); await load(); } catch (e) { setErr(errMsg(e)); } };
  const resolve = async () => { setErr(""); try { await api.post(`/discomfort/${sel}/resolve`, null, { params: { date: localDate() } }); await load(); } catch (e) { setErr(errMsg(e)); } };
  const clearAll = async () => { setErr(""); try { await api.post("/discomfort/clear", null, { params: { date: localDate() } }); await load(); setMsg("All regions cleared."); } catch (e) { setErr(errMsg(e)); } };

  const slideMax = Math.max(form.pain, form.soreness, form.stiffness, form.tenderness), dom = SLIDERS.map(([k, l]) => [l, form[k]]).sort((a, b) => b[1] - a[1])[0];
  const act = previewAction(slideMax), impact = previewImpact(slideMax), results = q ? searchRegions(q) : [];
  const crumbs = ANATOMY[sel].crumbs;

  if (!data) return <div className="font-mono text-sm text-mute">{err || "Loading assessment…"}</div>;
  const v = VERDICT[data.recommendation];
  return (
    <>
      <Hero pill="3D Injury & Anatomical Map" title="Musculoskeletal Assessment & Adaptive Training Engine"
        sub="Report anatomical discomfort, compute exercise loading impact, generate deterministic workout modifications, and track longitudinal recovery outcomes."
        right={<button className="btn-dark font-mono !text-xs" onClick={clearAll}><RefreshCw size={14} className="text-sky" />Clear &amp; Start Fresh Assessment</button>} />
      {err && <p role="alert" className="text-sm text-rose">{err}</p>}

      <section className="card relative p-5"><div className="relative"><Search size={17} className="absolute left-4 top-3.5 text-mute" />
        <input className="field !rounded-2xl !py-3 !pl-11" placeholder="Search canonical anatomical structure (e.g. left_knee, shoulder, patella, lumbar)..." value={q} onChange={e => setQ(e.target.value)} aria-label="Search anatomy" />
        {results.length > 0 && <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-line bg-card shadow-card">{results.map(k => <li key={k}><button className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-tile" onClick={() => { setSel(k); setQ(""); }}><span>{REGION_LABEL[k]}</span><span className="font-mono text-[10.5px] text-mute">{canonicalId(k)}</span></button></li>)}</ul>}</div></section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="mono-label">Canonical Anatomy ID: {canonicalId(sel).toUpperCase()}</div><div className="mt-1 text-[15px] font-extrabold text-mint">{REGION_LABEL[sel]}</div></div>
            <div className="rounded-lg border border-line bg-tile px-3 py-1.5 font-mono text-[10.5px] text-paper/90">{crumbs.join(" → ")}</div></div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-[#060a10]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 p-3">
              <div className="flex flex-wrap items-center gap-2"><span className="mono-label">Anatomy:</span>
                {[["skeleton", "Skeleton"], ["muscles", "Muscles"], ["joints", "Joints"], ["pain", "Pain Map"]].map(([k, t]) => <Toggle key={k} on={layers[k]} onClick={() => setLayers(l => ({ ...l, [k]: !l[k] }))}>{t}</Toggle>)}</div>
              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-tile p-1">
                {["front", "back", "left", "right"].map(n => <button key={n} onClick={() => setView({ name: n, nonce: Date.now() })} className={`rounded-lg px-2.5 py-1 text-[11px] capitalize ${view.name === n ? "bg-emerald/15 text-mint" : "text-paper/90 hover:text-mint"}`}>{n}</button>)}
                <button onClick={() => setView({ name: "reset", nonce: Date.now() })} className="rounded-lg bg-emerald/15 px-2.5 py-1 text-[11px] font-semibold text-mint">Reset View</button>
                <button onClick={() => setDebug(d => !d)} className={`rounded-lg px-2.5 py-1 text-[11px] ${debug ? "bg-amber/15 text-amber" : "text-mute"}`}>Debug</button></div></div>
            <SkeletonModel layers={layers} selected={sel} severities={sev} onPick={setSel} view={view} debug={debug} hover={hover} onHover={setHover} />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-[17px] font-extrabold leading-tight"><span className={`dot ${slideMax >= 7 ? "!bg-rose" : slideMax >= 3 ? "!bg-amber" : ""}`} />Reported Discomfort Profile</h2><div className="mt-1 font-mono text-[11px] text-mute">Anatomical Target: <b className="text-mint">{REGION_LABEL[sel]}</b></div></div>
            <div className="flex items-center gap-2"><span className="rounded-lg border border-line bg-tile px-2.5 py-1 font-mono text-[10px] leading-tight">IMPACT:<br />{impact}</span><span className={VERDICT[act].badge}>{act}</span></div></div>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber/30 bg-amber/5 px-3.5 py-2.5 text-[11.5px] text-amber/90"><Info size={15} className="mt-0.5 shrink-0 text-sky" />Based on your self-reported symptoms. This is not a medical diagnosis.</div>
          <div className="tile mt-4 grid grid-cols-2 gap-x-6 gap-y-5 p-4">
            {SLIDERS.map(([k, l, c]) => <div key={k}><div className="mb-2 flex justify-between text-[13px] font-bold"><span>{l}</span><span className="font-mono text-mint">{form[k]} / 10</span></div>
              <input type="range" aria-label={l} className="range" style={{ "--c": c }} min="0" max="10" value={form[k]} onChange={e => setForm({ ...form, [k]: +e.target.value })} />
              <div className="mt-1 flex justify-between font-mono text-[9px] text-mute"><span>0 (None)</span><span>10 (Severe)</span></div></div>)}
          </div>
          <div className="tile mt-3 flex items-center justify-between px-4 py-3"><span className="mono-label !text-paper/80">Dominant Symptom</span><b className="font-mono text-sm text-mint">{dom[1] > 0 ? `${dom[0]} — ${dom[1]}/10` : "None — 0/10"}</b></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Sel label="Onset" v={form.onset} set={x => setForm({ ...form, onset: x })} opts={OPTS.onset} /><Sel label="Trigger" v={form.trigger} set={x => setForm({ ...form, trigger: x })} opts={OPTS.trigger} />
            <Sel label="Trend" v={form.trend} set={x => setForm({ ...form, trend: x })} opts={OPTS.trend} /><Sel label="Activity Impact" v={form.activityImpact} set={x => setForm({ ...form, activityImpact: x })} opts={OPTS.activityImpact} /></div>
          <input className="field mt-3" placeholder="Notes (what triggers it?)" maxLength={500} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} aria-label="Notes" />
          {msg && <p className="mt-3 text-sm text-mint" role="status">{msg}</p>}
          <div className="mt-4 flex gap-2.5"><button className="btn-mint flex-1" onClick={save}>Save Assessment</button>{current && <button className="btn-dark" onClick={resolve}>Mark Resolved</button>}</div>
        </div>
      </section>

      {!data.todayWorkout ? (
        <div className="card p-6 text-sm text-mute">No training plan yet, so exercise impact can't be analysed. <Link to="/plan?edit=1" className="font-semibold text-mint">Generate your plan</Link> to see today's decision, modifications and impact analysis.</div>
      ) : (
        <>
          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Today's Training Decision Engine" badge={<span className="badge-ok">Session Active</span>}>
              <div className={`rounded-xl border ${v.ring} ${v.bg} p-4`}><div className="flex items-center justify-between gap-3"><span className="mono-label !text-mint">Training Action</span><span className={`rounded-full border px-4 py-1.5 font-mono text-[13px] font-bold ${v.ring} ${v.text}`}>ACTION: {data.recommendation}</span></div>
                <p className="mt-3 text-[13px] leading-relaxed">{data.reason}</p><p className="mt-2 font-mono text-[10px] text-mute">Rule {data.rule}</p></div>
              <div className="mt-3 grid grid-cols-2 gap-3"><div className="tile p-3.5"><div className="mono-label">Affected Exercises</div><div className="mt-2 font-mono text-xl font-bold text-amber">{data.counts.affected}</div></div><div className="tile p-3.5"><div className="mono-label">Unaffected Exercises</div><div className="mt-2 font-mono text-xl font-bold text-mint">{data.counts.unaffected}</div></div></div>
            </Panel>
            <Panel title="Today's Training Changes (Workout Modifications)">
              <p className="text-[13px]">{data.counts.modified} exercises modified based on reported discomfort; {data.counts.unchanged} exercises remain unchanged.</p>
              <ul className="mt-3 max-h-[250px] space-y-2.5 overflow-y-auto pr-1">{data.modifications.map(m => (
                <li key={m.name} className="tile flex items-center justify-between gap-3 px-4 py-3"><div><div className="text-sm font-bold">{m.name}</div><div className="font-mono text-[10.5px] text-mute">{m.status === "MODIFIED" ? `${m.before} → ${m.after} (${m.note})` : `${m.before} (Unchanged)`}</div></div>
                  <span className={m.status === "MODIFIED" ? "badge-warn" : "badge-ok"}>{m.status}</span></li>))}</ul>
            </Panel>
          </section>
          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Planned Exercise Impact Analysis Engine">
              <ul className="space-y-2.5">{data.impact.map(i => { const [t, cls] = IMPACT_UI[i.level] || IMPACT_UI.UNKNOWN;
                return <li key={i.name} className="tile flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><div className="text-sm font-bold">{i.name}</div>
                  <div className="text-[11px] text-mute">{i.level === "NONE" ? "No anatomical loading overlap with active reported discomfort." : `Anatomical overlap with reported ${[...new Set(i.regions.map(r => REGION_LABEL[r]))].join(", ")} (${i.severity}/10 intensity).`}</div>
                  {i.alternatives.length > 0 && <div className="mt-1 text-[11px] text-sky">Swap for: {i.alternatives.join(", ")}</div>}</div><span className={`${cls} shrink-0 text-center`}>{t}</span></li>; })}</ul>
            </Panel>
            <Panel title="Recovery Context & Load Metrics">
              <div className="tile p-4"><div className="flex items-center justify-between text-[13px] text-mute"><span>Readiness Score</span><b className="font-mono text-lg text-mint">{data.checkIn?.readinessScore != null ? `${data.checkIn.readinessScore}/100` : "Not logged"}</b></div>
                <div className="mt-2 flex items-center justify-between text-xs text-mute"><span>ACWR Ratio: <b className="text-paper">{+data.acwr.ratio.toFixed(2)}</b></span><span>Sleep: <b className="text-paper">{data.checkIn?.sleepHours != null ? `${data.checkIn.sleepHours}h` : "Not available"}</b></span></div></div>
              <div className="tile mt-3 p-4"><div className="text-sm font-bold">Load Context Phrasing</div><p className="mt-1.5 text-[12px] leading-relaxed text-mute">Training load and readiness metrics provide contextual signals to monitor workload tolerance alongside reported physical discomfort.</p></div>
              {data.recurrence?.filter(r => r.recurring).map(r => <p key={r.region} className="mt-3 font-mono text-[11px] text-amber">{REGION_LABEL[r.region]} has flared up {r.episodes} times in 90 days. Consider seeing a physio.</p>)}
            </Panel>
          </section>
        </>
      )}

      <section className="card p-6"><h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.12em]">Assessment History</h2>
        {hist.length === 0 ? <p className="mt-3 font-mono text-xs text-mute">No reports yet.</p> : <div className="mt-3 divide-y divide-line">{hist.slice(0, 12).map(h => (
          <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><span>{h.label} <span className="font-mono text-[11px] text-mute">· {h.status}</span></span><span className="font-mono text-[11px] text-mute">{h.severity}/10 · {new Date(h.at).toLocaleDateString()}{h.notes && ` · ${h.notes}`}</span></div>))}</div>}</section>
    </>
  );
}
