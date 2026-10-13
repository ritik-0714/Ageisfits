import { useCallback, useEffect, useState } from "react";
import { ShoppingBag, RefreshCw, Lightbulb, ExternalLink, Search } from "lucide-react";
import { api, errMsg } from "../lib/api.js";
import { Modal } from "../components/ui.jsx";

const inr = n => `₹${Number(n).toLocaleString("en-IN")}`;
const RCOL = { Amazon: "text-amber border-amber/30 bg-amber/10", Flipkart: "text-sky border-sky/30 bg-sky/10", Decathlon: "text-teal border-teal/40 bg-teal/10", Myntra: "text-rose border-rose/30 bg-rose/10" };
const short = a => a.split(" ")[0].toUpperCase();

export default function Store() {
  const [meta, setMeta] = useState({ activities: [], categories: [], skills: [], total: 0 }), [activity, setActivity] = useState("Gym & Weightlifting"), [category, setCategory] = useState("All"), [budget, setBudget] = useState(5000), [skill, setSkill] = useState("All Levels"), [q, setQ] = useState("");
  const [applied, setApplied] = useState({ activity: "Gym & Weightlifting", category: "All", budget: 5000, skill: "All Levels" });
  const [res, setRes] = useState({ total: 0, items: [] }), [live, setLive] = useState({ prices: {}, live: false, checkedAt: new Date().toISOString() }), [cart, setCart] = useState([]), [showCart, setShowCart] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [note, setNote] = useState("");

  useEffect(() => { api.get("/shop/meta").then(r => setMeta(r.data)); api.get("/cart").then(r => setCart(r.data.items)).catch(() => {}); }, []);
  const load = useCallback(() => api.get("/shop/products", { params: { activity: applied.activity, category: applied.category, maxPrice: applied.budget, skill: applied.skill, q } }).then(r => setRes(r.data)).catch(e => setErr(errMsg(e))), [applied, q]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const apply = () => setApplied({ activity, category, budget, skill });
  const refresh = async () => {
    setBusy(true); setErr(""); setNote("");
    try { const { data } = await api.post("/shop/live-prices", { ids: res.items.slice(0, 6).map(i => i.id) }); setLive(l => ({ ...data, prices: { ...l.prices, ...data.prices } })); if (!data.live) setNote("Live prices need SERPAPI_KEY on the server. Showing reference prices; retailer links open a live search."); }
    catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  const add = async p => { try { const { data } = await api.post("/cart", { name: `${p.brand} ${p.name}`, price: p.ref, source: "Reference price" }); setCart(data.items); } catch (e) { setErr(errMsg(e)); } };
  const remove = async id => { const { data } = await api.delete(`/cart/${id}`); setCart(data.items); };
  const time = new Date(live.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();

  return (
    <>
      <section className="card p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div>
        <span className="pill"><ShoppingBag size={13} />Equipment &amp; Gear</span>
        <h1 className="mt-4 text-[32px] font-extrabold leading-tight tracking-tight">Smart Equipment &amp; Gear Store</h1><p className="mt-2 text-sm text-mute">Product discovery and price comparison across Amazon, Flipkart, Decathlon, and Myntra.</p></div>
        <div className="text-right"><div className="flex justify-end gap-2"><button className="btn-dark" onClick={() => setShowCart(true)}><ShoppingBag size={14} />Cart ({cart.length})</button><button className="btn-dark" onClick={refresh} disabled={busy}><RefreshCw size={14} className={`text-mint ${busy ? "animate-spin" : ""}`} />Refresh Live Prices</button></div>
          <p className="mt-2 font-mono text-[10.5px] text-mute">Price checked: <b className="text-paper">{time}</b> ({live.live ? "Live" : "Reference benchmark"})</p></div></div></section>
      {err && <p role="alert" className="text-sm text-rose">{err}</p>}{note && <p className="font-mono text-xs text-amber">{note}</p>}

      <section className="card p-6">
        <div className="mono-label !text-paper/70">Filter order: Activity → Category → Budget → Skill level</div>
        <div className="mt-5 grid gap-7 lg:grid-cols-[1.1fr_1.1fr_1.2fr]">
          <div><div className="mono-label !text-paper/90">1. Target Sport / Activity:</div><select className="field mt-3 !border-emerald/50" value={activity} onChange={e => setActivity(e.target.value)} aria-label="Target sport">{["All", ...meta.activities].map(a => <option key={a} value={a}>{a === "All" ? "All Activities" : a}</option>)}</select></div>
          <div><div className="flex items-center justify-between"><span className="mono-label !text-paper/90">2. Max Budget Limit:</span><b className="font-mono text-lg text-mint">{inr(budget)}</b></div>
            <input type="range" className="range mt-4" min="500" max="25000" step="500" value={budget} onChange={e => setBudget(+e.target.value)} aria-label="Max budget" /><div className="mt-1.5 flex justify-between font-mono text-[10px] text-mute"><span>₹500</span><span>₹12,500</span><span>₹25,000</span></div></div>
          <div><div className="mono-label !text-paper/90">3. Skill Level:</div><div className="mt-3 grid grid-cols-3 gap-2">{meta.skills.map(s => <button key={s} onClick={() => setSkill(s)} aria-pressed={skill === s} className={`rounded-xl border px-3 py-2.5 text-[13px] ${skill === s ? "border-emerald/60 bg-emerald/10 text-paper" : "border-line bg-tile text-mute hover:text-paper"} ${s === "Professional" ? "col-span-1" : ""}`}>{s}</button>)}</div></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[12px] text-mute">Dynamic Category:</span>
          {["All", ...meta.categories].map(c => <button key={c} onClick={() => setCategory(c)} className={`rounded-full border px-3 py-1.5 text-[12px] ${category === c ? "border-emerald bg-emerald font-semibold text-white" : "border-line bg-tile text-paper/90 hover:border-mute/50"}`}>{c}</button>)}</div>
          <button className="btn-emerald !px-7" onClick={apply}>Apply Filters</button></div>
      </section>

      <section className="flex flex-wrap items-end justify-between gap-4"><div><span className="pill !text-[10px]">Activity: {short(applied.activity === "All" ? "All" : applied.activity)}</span>
        <h2 className="mt-2 text-[24px] font-extrabold tracking-tight">Showing Recommendations for <span className="text-mint">{applied.activity === "All" ? "ALL" : short(applied.activity)}</span> ({res.total})</h2></div>
        <label className="tile flex w-72 items-center gap-2 px-3.5 py-2.5"><Search size={14} className="text-mute" /><input className="w-full bg-transparent text-sm focus:outline-none" placeholder="Search brand or equipment…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search products" /></label></section>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {res.items.map(p => { const lp = live.prices[p.id] || {};
          return (
            <article key={p.id} className="card flex flex-col p-5">
              <div className="flex items-center justify-between"><div className="flex gap-2"><span className="rounded-md border border-line bg-tile px-2 py-1 font-mono text-[10px] uppercase">{p.category}</span><span className={p.listing === "IN STOCK" ? "badge-ok" : "rounded-md border border-sky/40 bg-sky/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky"}>{p.listing}</span></div>
                <button onClick={() => add(p)} className="font-mono text-[10.5px] text-mute hover:text-mint" aria-label={`Add ${p.name} to cart`}>+ Cart</button></div>
              <div className="mt-6 text-[13px] font-bold text-mint">{p.brand}</div><h3 className="text-[16px] font-extrabold leading-snug">{p.name}</h3>
              <div className="tile mt-4 flex items-center gap-2 px-3.5 py-3 text-xs"><Lightbulb size={14} className="shrink-0 text-amber" /><span>{p.rating}★ {p.skill === "All Levels" ? "all-level" : p.skill.toLowerCase()} pick for {short(p.activity).toLowerCase()} (Ref. {inr(p.ref)})</span></div>
              <div className="mono-label mt-5 border-t border-line pt-4">Verified store options</div>
              <ul className="mt-3 space-y-2">{p.stores.map(s => (
                <li key={s.retailer} className="tile flex items-center justify-between px-3 py-2"><div className="flex items-center gap-3"><span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${RCOL[s.retailer]}`}>{s.retailer}</span><span className="font-mono text-xs">{lp[s.retailer] ? inr(lp[s.retailer].price) : <span className="text-mute">Check price</span>}</span></div>
                  <a className="flex items-center gap-1 text-xs font-bold text-mint" href={lp[s.retailer]?.link || s.link} target="_blank" rel="noreferrer">Buy <ExternalLink size={11} /></a></li>))}</ul>
            </article>); })}
      </section>
      {res.items.length === 0 && <p className="font-mono text-xs text-mute">No products match these filters. Raise the budget or choose another category.</p>}

      {showCart && <Modal title={`Cart (${cart.length})`} onClose={() => setShowCart(false)}>{cart.length === 0 ? <p className="text-sm text-mute">Your cart is empty.</p> : <>
        <ul className="divide-y divide-line">{cart.map(i => <li key={i._id} className="flex items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><div className="truncate">{i.name}</div><div className="font-mono text-[10.5px] text-mute">{i.source}</div></div><div className="text-right"><div className="font-mono">{i.price != null ? inr(i.price) : "–"}</div><button className="text-xs text-rose" onClick={() => remove(i._id)}>Remove</button></div></li>)}</ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold"><span>Total (reference)</span><span className="font-mono">{inr(cart.reduce((s, i) => s + (i.price || 0) * i.quantity, 0))}</span></div></>}</Modal>}
    </>
  );
}
