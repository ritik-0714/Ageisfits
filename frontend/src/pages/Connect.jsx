import { useCallback, useEffect, useState } from "react";
import { Compass, Globe2, MapPin, Search, Filter, Plus, ChevronDown, ShieldCheck, Navigation, CalendarDays, Users } from "lucide-react";
import { api, errMsg } from "../lib/api.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { Modal } from "../components/ui.jsx";

const EMOJI = { All: "⚡", Running: "🏃", Strength: "💪", Cycling: "🚴", Swimming: "🏊", Football: "⚽", Basketball: "🏀", Badminton: "🏸", Tennis: "🎾", Yoga: "🧘", Boxing: "🥊", Cricket: "🏏", Hiking: "🥾" };
const LEVELS = [["all", "All Skill Levels"], ["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]];
const RADII = [5, 10, 15, 25, 50];

export default function Connect() {
  const { user } = useAuth();
  const [meta, setMeta] = useState({ cities: [], states: [], sports: [] }), [state, setState] = useState("Gujarat"), [city, setCity] = useState(user?.profile?.city || "Vadodara"), [sport, setSport] = useState("All");
  const [level, setLevel] = useState("all"), [type, setType] = useState("all"), [radius, setRadius] = useState(15), [q, setQ] = useState(""), [res, setRes] = useState({ communities: [], counts: { all: 0, clubs: 0, events: 0, hub: 0 } });
  const [err, setErr] = useState(""), [create, setCreate] = useState(false), [f, setF] = useState({ name: "", sport: "Running", kind: "club", description: "", schedule: "" });

  useEffect(() => { api.get("/community/meta").then(r => { setMeta(r.data); const c = r.data.cities.find(x => x.name === (user?.profile?.city || "Vadodara")); if (c) { setState(c.state); setCity(c.name); } }); }, [user]);
  const cities = meta.cities.filter(c => c.state === state);
  const load = useCallback(() => api.get("/community", { params: { city, sport, level, type, radius, q } }).then(r => { setRes(r.data); setErr(""); }).catch(e => setErr(errMsg(e))), [city, sport, level, type, radius, q]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const act = async (c, what) => { try { await api.post(`/community/${c.id}/${what}`); load(); } catch (e) { setErr(errMsg(e)); } };
  const make = async () => { try { await api.post("/community", { ...f, city }); setCreate(false); setF({ ...f, name: "", description: "", schedule: "" }); load(); } catch (e) { setErr(errMsg(e)); } };
  const c = res.counts, seg = (k, label) => <button key={k} onClick={() => setType(k)} className={`rounded-lg px-3 py-1.5 text-[12.5px] transition ${type === k ? "bg-[#1b2433] font-semibold text-paper" : "text-mute hover:text-paper"}`}>{label}</button>;

  return (
    <>
      <section className="card relative overflow-hidden p-8" style={{ backgroundImage: "radial-gradient(600px 220px at 25% 0%, rgba(40,70,120,.28), transparent 70%)" }}>
        <div className="flex flex-wrap items-center justify-between gap-5"><div className="max-w-2xl">
          <span className="pill"><Compass size={13} />AegisFit Connect</span>
          <h1 className="mt-4 text-[36px] font-extrabold leading-[1.08] tracking-tight">Train local. Compete together.<br /><span className="text-mint">Represent your community.</span></h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-mute">Connect with verified sports clubs, local training groups, and competitive tournaments across all supported athletic disciplines.</p></div>
          <button className="btn-mint !px-6 !py-3" onClick={() => setCreate(true)}><Plus size={16} />Create Community / Club</button></div>
      </section>
      {err && <p role="alert" className="text-sm text-rose">{err}</p>}

      <section>
        <div className="mb-3 flex items-center justify-between"><span className="mono-label !text-paper/80">Filter by sports activity ({meta.sports.length})</span><span className="font-mono text-[11px] text-mute">Active Sport: <b className="text-mint">{sport === "All" ? "All Activities" : sport}</b></span></div>
        <div className="flex gap-2.5 overflow-x-auto pb-3">{["All", ...meta.sports].map(s => <button key={s} onClick={() => setSport(s)} className={`chip ${sport === s ? "chip-on" : ""}`} aria-pressed={sport === s}><span aria-hidden>{EMOJI[s]}</span>{s === "All" ? "All Activities" : s}</button>)}</div>
      </section>

      <section className="card flex flex-wrap items-center gap-3 p-4">
        <div className="tile flex flex-wrap items-center gap-3 px-4 py-2.5"><span className="flex items-center gap-1.5 font-mono text-[11px] text-mint"><MapPin size={14} />Target Location:</span>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs text-mute"><Globe2 size={13} />State:<select className="bg-transparent font-bold text-paper focus:outline-none" value={state} onChange={e => { setState(e.target.value); const n = meta.cities.find(x => x.state === e.target.value); if (n) setCity(n.name); }}>{meta.states.map(s => <option key={s} className="bg-card">{s}</option>)}</select><ChevronDown size={12} /></label>
          <label className="flex items-center gap-2 rounded-lg border border-emerald/40 bg-card px-2.5 py-1.5 text-xs text-mute"><MapPin size={13} className="text-mint" />City:<select className="bg-transparent font-bold text-mint focus:outline-none" value={city} onChange={e => setCity(e.target.value)}>{cities.map(x => <option key={x.name} className="bg-card">{x.name}</option>)}</select><ChevronDown size={12} className="text-mint" /></label></div>
        <label className="tile flex w-[190px] flex-none items-center gap-2 px-3 py-2.5"><Search size={15} className="text-mute" /><input className="w-full bg-transparent text-xs focus:outline-none" placeholder="Search clubs, tournaments, tags…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search clubs" /></label>
        <label className="tile flex items-center gap-2 px-3 py-2.5 text-xs font-bold"><Filter size={14} className="text-mint" /><select className="bg-transparent focus:outline-none" value={level} onChange={e => setLevel(e.target.value)}>{LEVELS.map(([k, t]) => <option key={k} value={k} className="bg-card">{t}</option>)}</select></label>
        <div className="tile flex items-center p-1">{seg("all", "All")}{seg("club", `Clubs (${c.clubs})`)}{seg("event", `Events (${c.events})`)}{seg("hub", "My Hub")}</div>
      </section>

      <section className="card p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-mint"><Navigation size={13} />Local Radar</div>
          <h2 className="mt-1.5 text-[26px] font-extrabold tracking-tight">Nearby Sports &amp; Fitness Explorer</h2><p className="mt-1 text-sm text-mute">Discover athletic clubs, group training, &amp; upcoming tournaments near your location.</p></div>
          <div className="flex items-center gap-1 rounded-xl border border-line bg-tile p-1.5"><span className="flex items-center gap-1.5 px-2 font-mono text-[11px] text-mute"><MapPin size={12} className="text-mint" />Radius:</span>{RADII.map(r => <button key={r} onClick={() => setRadius(r)} className={`rounded-lg px-3 py-1.5 font-mono text-xs ${radius === r ? "bg-emerald text-white" : "text-mute hover:text-paper"}`}>{r} km</button>)}</div></div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <div className="flex flex-wrap gap-2.5">{[["all", `All Local Items (${c.all})`, null], ["club", `Communities (${c.clubs})`, Users], ["event", `Events & Matches (${c.events})`, CalendarDays]].map(([k, t, I]) => <button key={k} onClick={() => setType(k)} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition ${type === k ? "border-line bg-[#1b2433] font-semibold" : "border-line bg-tile text-paper/90 hover:border-mute/50"}`}>{I && <I size={14} className={k === "event" ? "text-sky" : "text-mint"} />}{t}</button>)}</div>
          <div className="flex items-center gap-2 rounded-lg border border-line bg-tile px-3 py-2 text-xs text-mute"><ShieldCheck size={14} className="text-mint" />Public athletic grounds &amp; verified venues only. Home addresses protected.</div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {res.communities.map(x => (
            <article key={x.id} className="rounded-2xl border border-line bg-tile p-5">
              <div className="flex items-center justify-between"><span className="rounded-md bg-[#1b2433] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wider">{x.level === "all" ? "General" : x.level}</span><span className="rounded-md border border-emerald/40 bg-emerald/10 px-2 py-1 font-mono text-[11px] text-mint">{x.distanceKm} km away</span></div>
              <h3 className="mt-4 text-[15px] font-extrabold leading-snug">{x.name}</h3>
              <div className="mt-2.5 flex flex-wrap gap-2"><span className={x.kind === "event" ? "badge-warn" : x.badge === "partner" ? "badge-ok" : "rounded-md border border-sky/40 bg-sky/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky"}>{x.kind === "event" ? "✓ Event" : x.badge === "partner" ? "✓ Demo Partner" : "✓ Community Group"}</span>{x.isSample && <span className="tag">Sample listing</span>}</div>
              <div className="mt-3 space-y-1 text-xs text-mute"><div>{EMOJI[x.sport]} {x.sport}{x.startsAt ? ` · ${new Date(x.startsAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : x.schedule ? ` · ${x.schedule}` : ""}</div><div className="flex items-center gap-1.5"><MapPin size={11} />{x.venue || x.city}</div><div className="flex items-center gap-1.5"><Users size={11} />{x.memberCount} members joined</div></div>
              <div className="mt-4">{x.joined ? <button className="btn-dark w-full !py-2" onClick={() => act(x, "leave")}>Leave</button> : <button className="btn-mint w-full !py-2" onClick={() => act(x, "join")}>{x.kind === "event" ? "Register" : "Join"}</button>}</div>
            </article>))}
        </div>
        {res.communities.length === 0 && <p className="mt-6 font-mono text-xs text-mute">Nothing found within {radius} km for these filters. Try a larger radius.</p>}
        <p className="mt-5 font-mono text-[10.5px] text-mute">Listings are demo data seeded for 22 cities. Organisers add real clubs with “Create Community / Club”.</p>
      </section>

      {create && <Modal title="Create Community / Club" onClose={() => setCreate(false)}><div className="space-y-3">
        <input className="field" placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} aria-label="Name" />
        <div className="grid grid-cols-2 gap-3"><select className="field" value={f.sport} onChange={e => setF({ ...f, sport: e.target.value })} aria-label="Sport">{meta.sports.map(s => <option key={s}>{s}</option>)}</select><select className="field" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })} aria-label="Type"><option value="club">Club / group</option><option value="event">Event</option></select></div>
        <input className="field" placeholder="Schedule (e.g. Sat 7:00 AM)" value={f.schedule} onChange={e => setF({ ...f, schedule: e.target.value })} aria-label="Schedule" />
        <input className="field" placeholder="Description" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} aria-label="Description" />
        <button className="btn-mint w-full" disabled={!f.name} onClick={make}>Create in {city}</button></div></Modal>}
    </>
  );
}
