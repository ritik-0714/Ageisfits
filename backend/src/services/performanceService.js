import { WorkoutLog } from "../models/WorkoutLog.js";
import { VisionSession } from "../models/VisionSession.js";
import { WearableConnection } from "../models/WearableConnection.js";
import { AIPlan } from "../models/AIPlan.js";

const DAY = 864e5, STRENGTH = /strength|weight|squat|bench|deadlift|press|curl|row|lunge|push|pull|lift|gym/i;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---- pure scoring (unit-tested) --------------------------------------------------------------------------------
// consistency  : active days in the last 28 vs a 12-day (3/week) target
// movement     : mean composite of AI Vision Trainer sessions (null until one exists)
// strength     : % change in strength-session load, last 14 days vs the 14 before (capped +-100)
// overall      : 40% consistency + 40% movement quality (falls back to consistency) + 20% strength trend; needs 3+ sessions
export function computePerformance({ logs = [], visionComposites = [], now = Date.now() }) {
  const in28 = logs.filter(l => now - +new Date(l.date) <= 28 * DAY);
  const activeDays = new Set(in28.map(l => new Date(l.date).toISOString().slice(0, 10))).size;
  const consistency = Math.round(clamp((activeDays / 12) * 100, 0, 100));
  const movementQuality = visionComposites.length ? Math.round(visionComposites.reduce((s, x) => s + x, 0) / visionComposites.length) : null;
  const load = (from, to) => logs.filter(l => STRENGTH.test(l.exerciseType) && now - +new Date(l.date) > from * DAY && now - +new Date(l.date) <= to * DAY).reduce((s, l) => s + (l.calculatedLoad || 0), 0);
  const recent = load(0, 14), prior = load(14, 28);
  const strengthProgress = prior > 0 ? Math.round(clamp(((recent - prior) / prior) * 100, -100, 100)) : recent > 0 ? 100 : 0;
  const ready = in28.length >= 3;
  const overall = ready ? Math.round(0.4 * consistency + 0.4 * (movementQuality ?? consistency) + 0.2 * clamp(50 + strengthProgress / 2, 0, 100)) : null;
  const label = !ready ? "Baseline Building" : overall >= 75 ? "Strong" : overall >= 50 ? "Solid" : "Developing";
  return { ready, sessions28d: in28.length, consistency, movementQuality, strengthProgress, overall, label };
}

export function readinessLabel(score) {
  if (score == null) return "Complete a check-in to get your index";
  return score >= 80 ? "Peak Training Readiness" : score >= 60 ? "Prime Training Readiness" : score >= 40 ? "Moderate Readiness - train smart" : "Low Readiness - prioritise recovery";
}
export function sleepLabel(h) { return h == null ? null : h >= 7 ? "Optimal" : h >= 6 ? "Adequate" : "Low"; }
export function recoveryStatus({ sleepHours, soreness, fatigue }) {
  if (sleepHours == null) return "No check-in yet";
  if (sleepHours < 5 || (soreness ?? 0) >= 7 || (fatigue ?? 0) >= 8) return "Under-recovered";
  if (sleepHours < 6.5 || (soreness ?? 0) >= 5 || (fatigue ?? 0) >= 6) return "Partially Recovered";
  return "Well Rested";
}

// ---- data access ------------------------------------------------------------------------------------------------
export async function getPerformance(userId) {
  const since = new Date(Date.now() - 28 * DAY);
  const [logs, vis] = await Promise.all([
    WorkoutLog.find({ userId, date: { $gte: since } }).select("date exerciseType calculatedLoad").lean(),
    VisionSession.find({ userId, composite: { $ne: null } }).sort({ createdAt: -1 }).limit(30).select("composite").lean(),
  ]);
  return computePerformance({ logs, visionComposites: vis.map(v => v.composite) });
}
export async function getDevicesAndPlan(userId) {
  const [conns, plan] = await Promise.all([WearableConnection.find({ userId }).select("provider mode lastSyncedAt pairing").lean(), AIPlan.findOne({ userId, active: true }).sort({ createdAt: -1 }).lean()]);
  const connected = conns.filter(c => c.mode !== "device" || c.lastSyncedAt);
  return { devicesConnected: connected.length, plan };
}
