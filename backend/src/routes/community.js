import { Router } from "express";
import { Community } from "../models/Community.js";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware.js";
import { asyncHandler, httpError } from "../middleware/common.js";
import { CITIES, SPORTS } from "../data/cities.js";

const r = Router();

// ---- pure helpers (unit-tested) -----------------------------------------------------------------------
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, rad = d => (d * Math.PI) / 180, dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// 60% interest overlap + 30% proximity (full marks within 2 km, zero at 25 km) + 10% level fit. Returns 0-100.
export function matchScore({ interests = [], sport, distanceKm, level = "all", userLevel }) {
  const interest = interests.length === 0 ? 0.5 : interests.includes(sport) ? 1 : 0;
  const proximity = Math.max(0, Math.min(1, 1 - (distanceKm - 2) / 23));
  const fit = level === "all" || !userLevel ? 1 : level === userLevel ? 1 : 0.4;
  return Math.round(100 * (0.6 * interest + 0.3 * proximity + 0.1 * fit));
}

r.get("/meta", (req, res) => res.json({ cities: CITIES, states: [...new Set(CITIES.map(c => c.state))].sort(), sports: SPORTS }));
r.use(authMiddleware, requireVerified);

// Local Radar: filter by city, radius, sport, skill level, free text and type (club | event | hub = joined).
r.get("/", asyncHandler(async (req, res) => {
  const city = CITIES.find(c => c.name === req.query.city) || CITIES.find(c => c.name === req.dbUser.profile?.city) || CITIES.find(c => c.name === "Vadodara");
  const lat = req.query.lat ? +req.query.lat : city.lat, lng = req.query.lng ? +req.query.lng : city.lng, radius = Math.min(100, Math.max(1, +req.query.radius || 15));
  const q = { city: city.name }; if (req.query.sport && req.query.sport !== "All") q.sport = req.query.sport; if (req.query.level && req.query.level !== "all") q.level = req.query.level;
  const interests = String(req.query.interests || "").split(",").filter(Boolean), userLevel = req.dbUser.profile?.experience, me = String(req.user.id), text = String(req.query.q || "").toLowerCase().trim();
  let list = (await Community.find(q).lean()).map(c => {
    const distanceKm = +haversineKm(lat, lng, c.lat, c.lng).toFixed(1);
    return { id: c._id, name: c.name, sport: c.sport, city: c.city, kind: c.kind, badge: c.badge, level: c.level, startsAt: c.startsAt, schedule: c.schedule, venue: c.venue, description: c.description, isSample: c.isSample,
      memberCount: c.members?.length || 0, joined: (c.members || []).some(m => String(m) === me), distanceKm, matchScore: matchScore({ interests, sport: c.sport, distanceKm, level: c.level, userLevel }) };
  }).filter(c => c.distanceKm <= radius && (!text || `${c.name} ${c.sport} ${c.description}`.toLowerCase().includes(text)));
  const counts = { all: list.length, clubs: list.filter(c => c.kind === "club").length, events: list.filter(c => c.kind === "event").length, hub: list.filter(c => c.joined).length };
  const type = req.query.type; if (type === "club") list = list.filter(c => c.kind === "club"); else if (type === "event") list = list.filter(c => c.kind === "event"); else if (type === "hub") list = list.filter(c => c.joined);
  list.sort((a, b) => a.distanceKm - b.distanceKm || b.matchScore - a.matchScore);
  res.json({ city: city.name, state: city.state, radius, counts, communities: list });
}));

r.post("/", asyncHandler(async (req, res) => {
  const { name, sport, city, description = "", kind = "club", level = "all", startsAt, schedule } = req.body || {};
  const c = CITIES.find(x => x.name === city);
  if (!name || !SPORTS.includes(sport) || !c) throw httpError(400, "Name, a supported sport and a supported city are required");
  const doc = await Community.create({ name: String(name).slice(0, 80), sport, city, state: c.state, lat: c.lat, lng: c.lng, kind: kind === "event" ? "event" : "club", level, description: String(description).slice(0, 300),
    schedule: schedule ? String(schedule).slice(0, 60) : undefined, startsAt: startsAt ? new Date(startsAt) : undefined, members: [req.user.id], createdBy: req.user.id });
  res.status(201).json({ community: doc });
}));

r.post("/:id/join", asyncHandler(async (req, res) => { await Community.updateOne({ _id: req.params.id }, { $addToSet: { members: req.user.id } }); res.json({ joined: true }); }));
r.post("/:id/leave", asyncHandler(async (req, res) => { await Community.updateOne({ _id: req.params.id }, { $pull: { members: req.user.id } }); res.json({ joined: false }); }));

export default r;
