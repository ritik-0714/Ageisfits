import mongoose from "mongoose";
import { DiscomfortReport } from "../models/DiscomfortReport.js";
import { EXERCISE_MAP } from "../data/exerciseMap.js";
import { REGIONS, ADJACENT } from "../data/regions.js";

// ---- pure helpers (unit-tested) --------------------------------------------------------------
export const severityOf = ({ pain = 0, soreness = 0, stiffness = 0, tenderness = 0 }) =>
  Math.max(pain, soreness, stiffness, tenderness);

export function computeStatus(prevSeverity, severity) {
  if (severity === 0) return "resolved";
  if (prevSeverity == null || prevSeverity === 0) return "new";
  return severity > prevSeverity ? "worsening" : severity < prevSeverity ? "improving" : "unchanged";
}

// ---- training-impact analysis ----------------------------------------------------------------------------
// Reported regions spread to their neighbours (knee -> femur/tibia) at one point lower. Each exercise is scored by the worst overlap:
// primary loaded structures count at full severity, secondary stabilisers one point lower.
export const IMPACT_HIGH = 7, IMPACT_MODERATE = 3;
export const levelFor = sev => (sev >= IMPACT_HIGH ? "HIGH" : sev >= IMPACT_MODERATE ? "MODERATE" : "NONE");

export function affectedMap(activeReports) {
  const aff = {};
  for (const r of activeReports) {
    const sev = r.severity ?? 0; if (sev <= 0) continue;
    aff[r.bodyRegion] = Math.max(aff[r.bodyRegion] || 0, sev);
    for (const n of ADJACENT[r.bodyRegion] || []) aff[n] = Math.max(aff[n] || 0, sev - 1);      // neighbours inherit one point less
  }
  return aff;
}

export function analyzeTrainingImpact(activeReports, exerciseNames) {
  const aff = affectedMap(activeReports);
  return exerciseNames.map(name => {
    const entry = EXERCISE_MAP[name];
    if (!entry) return { name, level: "UNKNOWN", regions: [], severity: 0, alternatives: [] };
    const pHits = entry.primary.filter(r => aff[r] > 0), sHits = entry.secondary.filter(r => aff[r] > 0);
    const severity = Math.max(0, ...pHits.map(r => aff[r]), ...sHits.map(r => aff[r] - 1));
    const level = levelFor(severity), regions = [...pHits, ...sHits];
    let alternatives = [];
    if (level !== "NONE")   // keep alternatives that do not themselves load an affected region
      alternatives = entry.alternatives.filter(a => !(EXERCISE_MAP[a]?.regions || []).some(r => aff[r] > 0));
    return { name, level, regions, severity, alternatives };
  });
}

// Suggested prescription change for one exercise. rx = { sets, reps } where reps is e.g. "10", "6-10", "30-60 s".
export function suggestModification(rx, level) {
  const m = String(rx.reps).match(/\d+/g), numeric = m && !/s|min|planned/i.test(String(rx.reps)), sets = rx.sets || 1;
  const before = numeric ? `${sets}\u00d7${m[m.length - 1]}` : `${sets}\u00d7${rx.reps}`;
  if (level === "NONE" || level === "UNKNOWN") return { status: "UNCHANGED", before, after: before, note: "Unchanged" };
  if (!numeric) return { status: "MODIFIED", before, after: before, note: level === "HIGH" ? "REDUCE INTENSITY 30% OR SWAP" : "REDUCE INTENSITY 20%" };
  const reps = +m[m.length - 1];
  if (level === "HIGH") { const s2 = Math.max(1, Math.round(sets / 2)), r2 = Math.max(5, Math.round(reps * 0.8)); return { status: "MODIFIED", before, after: `${s2}\u00d7${r2}`, note: "REDUCE VOLUME & INTENSITY" }; }
  return { status: "MODIFIED", before, after: `${Math.max(1, sets - 1)}\u00d7${reps}`, note: "REDUCE VOLUME" };
}

export function dominantSymptom(report) {
  if (!report?.metrics) return null;
  const entries = Object.entries({ pain: report.metrics.pain, soreness: report.metrics.soreness, stiffness: report.metrics.stiffness, tenderness: report.metrics.tenderness });
  const [name, value] = entries.sort((a, b) => b[1] - a[1])[0];
  return value > 0 ? { name: name[0].toUpperCase() + name.slice(1), value } : null;
}

// Recurrence: number of separate "episodes" (status 'new') in the window for one region.
export const countEpisodes = reports => reports.filter(r => r.status === "new").length;

// ---- persistence -----------------------------------------------------------------------------
const oid = id => new mongoose.Types.ObjectId(String(id));

export async function logReport(userId, body) {
  const { bodyRegion, notes = "", metrics = {}, onset, trigger, trend, activityImpact } = body;
  if (!REGIONS[bodyRegion]) { const e = new Error("Unknown body region"); e.status = 400; throw e; }
  const severity = severityOf(metrics);
  const prev = await DiscomfortReport.findOne({ userId, bodyRegion }).sort({ createdAt: -1 });
  const status = computeStatus(prev && prev.status !== "resolved" ? prev.severity : null, severity);
  const extra = {}; for (const [k, v] of Object.entries({ onset, trigger, trend, activityImpact })) if (v) extra[k] = v;
  return DiscomfortReport.create({ userId, bodyRegion, severity, status, notes, metrics, ...extra });
}

// Latest report per region that is not resolved.
export async function getActive(userId) {
  const rows = await DiscomfortReport.aggregate([
    { $match: { userId: oid(userId) } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$bodyRegion", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
    { $match: { status: { $ne: "resolved" }, severity: { $gt: 0 } } },
  ]);
  return rows;
}

export async function getHistory(userId, region, limit = 60) {
  const q = { userId }; if (region) q.bodyRegion = region;
  return DiscomfortReport.find(q).sort({ createdAt: -1 }).limit(limit).lean();
}

export async function getRecurrence(userId, days = 90) {
  const since = new Date(Date.now() - days * 864e5);
  const rows = await DiscomfortReport.find({ userId, createdAt: { $gte: since } }).lean();
  const by = {};
  for (const r of rows) (by[r.bodyRegion] ||= []).push(r);
  return Object.entries(by).map(([region, list]) => ({ region, episodes: countEpisodes(list), recurring: countEpisodes(list) >= 2 }))
    .filter(r => r.episodes > 0);
}

// "Clear & Start Fresh Assessment": mark every active region resolved (history is kept).
export async function clearAll(userId) {
  const active = await getActive(userId);
  for (const a of active) await logReport(userId, { bodyRegion: a.bodyRegion, notes: "Cleared (fresh assessment)", metrics: {} });
  return active.length;
}
