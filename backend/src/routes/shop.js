import { Router } from "express";
import { CartItem } from "../models/CartItem.js";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware.js";
import { asyncHandler, httpError } from "../middleware/common.js";
import { ACTIVITIES, CATEGORIES, SKILLS, RETAILERS, PRODUCTS, filterProducts, retailerLink } from "../data/storeCatalog.js";

export const shopRouter = Router();
export const cartRouter = Router();

shopRouter.get("/meta", (req, res) => res.json({ activities: ACTIVITIES, categories: CATEGORIES, skills: SKILLS, retailers: RETAILERS, total: PRODUCTS.length }));
// Filter order from the report: activity -> category -> budget -> skill level.
shopRouter.get("/products", authMiddleware, (req, res) => {
  const items = filterProducts({ activity: req.query.activity, category: req.query.category, maxPrice: +req.query.maxPrice || 0, skill: req.query.skill, q: req.query.q });
  res.json({ total: items.length, items: items.slice(0, 60).map(p => ({ ...p, stores: RETAILERS.map(r => ({ retailer: r, link: retailerLink(r, `${p.brand} ${p.name}`) })) })) });
});
// "Refresh Live Prices": cheapest live price per retailer for up to 6 products (SerpAPI Google Shopping, India).
shopRouter.post("/live-prices", authMiddleware, asyncHandler(async (req, res) => {
  const key = process.env.SERPAPI_KEY, ids = (req.body?.ids || []).slice(0, 6);
  if (!key) return res.json({ live: false, checkedAt: new Date().toISOString(), prices: {} });
  const prices = {};
  await Promise.all(ids.map(async id => {
    const p = PRODUCTS.find(x => x.id === id); if (!p) return;
    try {
      const u = new URL("https://serpapi.com/search.json"); u.search = new URLSearchParams({ engine: "google_shopping", q: `${p.brand} ${p.name}`, gl: "in", hl: "en", api_key: key });
      const j = await (await fetch(u, { signal: AbortSignal.timeout(12000) })).json(), by = {};
      for (const x of j.shopping_results || []) { const r = RETAILERS.find(n => String(x.source || "").toLowerCase().includes(n.toLowerCase())); if (r && x.extracted_price && (!by[r] || x.extracted_price < by[r].price)) by[r] = { price: x.extracted_price, link: x.product_link || x.link }; }
      prices[id] = by;
    } catch { prices[id] = {}; }
  }));
  res.json({ live: true, checkedAt: new Date().toISOString(), prices });
}));

// Price comparison. With SERPAPI_KEY: live Google Shopping (India) results sorted by price. Without it: pre-sorted retailer search links.
shopRouter.get("/prices", authMiddleware, asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  if (!q) return res.json({ results: [] });
  const key = process.env.SERPAPI_KEY;
  if (!key) {
    const e = encodeURIComponent(q);
    return res.json({ noKey: true, results: [
      { source: "Amazon.in", link: `https://www.amazon.in/s?k=${e}&s=price-asc-rank` }, { source: "Flipkart", link: `https://www.flipkart.com/search?q=${e}&sort=price_asc` },
      { source: "Decathlon", link: `https://www.decathlon.in/search?Ntt=${e}` }, { source: "Myntra", link: `https://www.myntra.com/${e}?sort=price_asc` }] });
  }
  const u = new URL("https://serpapi.com/search.json");
  u.search = new URLSearchParams({ engine: "google_shopping", q, gl: "in", hl: "en", api_key: key });
  const resp = await fetch(u, { signal: AbortSignal.timeout(12000) });
  if (!resp.ok) throw httpError(502, "Price provider error");
  const j = await resp.json();
  const results = (j.shopping_results || []).filter(x => x.extracted_price).map(x => ({ title: x.title, price: x.extracted_price, priceText: x.price, source: x.source, link: x.product_link || x.link, thumb: x.thumbnail }))
    .sort((a, b) => a.price - b.price).slice(0, 20);
  res.json({ results });
}));

cartRouter.use(authMiddleware, requireVerified);
cartRouter.get("/", asyncHandler(async (req, res) => res.json({ items: await CartItem.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean() })));
cartRouter.post("/", asyncHandler(async (req, res) => {
  const { name, price, source, link } = req.body || {};
  if (!name) throw httpError(400, "name is required");
  await CartItem.create({ userId: req.user.id, name: String(name).slice(0, 200), price: Number.isFinite(+price) ? +price : undefined, source, link });
  res.status(201).json({ items: await CartItem.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean() });
}));
cartRouter.delete("/:id", asyncHandler(async (req, res) => {
  await CartItem.deleteOne({ _id: req.params.id, userId: req.user.id });
  res.json({ items: await CartItem.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean() });
}));
