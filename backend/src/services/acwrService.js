import mongoose from "mongoose";
import { WorkoutLog } from "../models/WorkoutLog.js";

const DAY = 864e5;

export const sessionLoad = (durationMinutes, rpe) => durationMinutes * rpe;      // sRPE method

export function riskBand(ratio) {
  if (ratio < 0.8) return "LOW";
  if (ratio <= 1.3) return "OPTIMAL";
  if (ratio <= 1.5) return "ELEVATED";
  return "HIGH";
}

// ---- pure maths (unit-tested) ----------------------------------------------------------------
// Rolling-average ACWR from two totals. Mirrors the pseudocode in the report.
export function computeAcwr(acuteTotal, chronicTotal) {
  const acuteLoad = acuteTotal / 7, chronicLoad = chronicTotal / 28;
  if (chronicLoad === 0) return { acuteLoad: 0, chronicLoad: 0, ratio: 1.0, riskBand: "OPTIMAL" };
  const ratio = acuteLoad / chronicLoad;
  return { acuteLoad, chronicLoad, ratio: +ratio.toFixed(2), riskBand: riskBand(ratio) };
}

// EWMA variant: dailyLoads is oldest -> newest. lambda = 2/(N+1).
export function computeEwmaAcwr(dailyLoads) {
  const la = 2 / 8, lc = 2 / 29;
  let a = 0, c = 0;
  for (const l of dailyLoads) { a = l * la + (1 - la) * a; c = l * lc + (1 - lc) * c; }
  if (c === 0) return { acuteLoad: 0, chronicLoad: 0, ratio: 1.0, riskBand: "OPTIMAL" };
  const ratio = a / c;
  return { acuteLoad: a, chronicLoad: c, ratio: +ratio.toFixed(2), riskBand: riskBand(ratio) };
}

// Fill a { 'YYYY-MM-DD': load } map into an ordered array ending at endDate.
export const dayKey = d => new Date(d).toISOString().slice(0, 10);
export function toDailySeries(map, endDate, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) { const k = dayKey(new Date(endDate).getTime() - i * DAY); out.push({ date: k, load: map[k] || 0 }); }
  return out;
}
// Trailing ACWR for each of the last `n` days from a series that is at least n+27 long.
export function acwrTrend(series, n = 28) {
  const res = [];
  for (let i = series.length - n; i < series.length; i++) {
    const w = series.slice(Math.max(0, i - 27), i + 1).map(s => s.load);
    const acute = w.slice(-7).reduce((s, x) => s + x, 0), chronic = w.reduce((s, x) => s + x, 0);
    res.push({ date: series[i].date, ...computeAcwr(acute, chronic) });
  }
  return res;
}

// ---- MongoDB aggregation ---------------------------------------------------------------------
const oid = id => new mongoose.Types.ObjectId(String(id));

export async function getAcwr(userId, targetDate = new Date(), method = "rolling") {
  const target = new Date(targetDate), acuteStart = new Date(target - 7 * DAY), chronicStart = new Date(target - 28 * DAY);
  const [row] = await WorkoutLog.aggregate([
    { $match: { userId: oid(userId), date: { $gte: chronicStart, $lte: target } } },
    { $group: { _id: null, chronic: { $sum: "$calculatedLoad" },
        acute: { $sum: { $cond: [{ $gte: ["$date", acuteStart] }, "$calculatedLoad", 0] } }, sessions: { $sum: 1 } } },
  ]);
  const base = computeAcwr(row?.acute || 0, row?.chronic || 0);
  const result = { ...base, acuteTotal: row?.acute || 0, chronicTotal: row?.chronic || 0, sessions: row?.sessions || 0, method: "rolling" };
  if (method === "ewma") {
    // 84 days of history lets the 28-day EWMA warm up (a short window biases the chronic term low)
    const series = toDailySeries(await dailyLoadMap(userId, new Date(target - 84 * DAY), target), target, 84);
    return { ...result, ...computeEwmaAcwr(series.map(s => s.load)), method: "ewma" };
  }
  return result;
}

export async function dailyLoadMap(userId, from, to) {
  const rows = await WorkoutLog.aggregate([
    { $match: { userId: oid(userId), date: { $gte: new Date(from), $lte: new Date(to) } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, load: { $sum: "$calculatedLoad" } } },
  ]);
  return Object.fromEntries(rows.map(r => [r._id, r.load]));
}

export async function getAcwrHistory(userId, days = 28, endDate = new Date()) {
  const map = await dailyLoadMap(userId, new Date(endDate - (days + 28) * DAY), endDate);
  const series = toDailySeries(map, endDate, days + 28);
  return { daily: series.slice(-days), trend: acwrTrend(series, days) };
}
