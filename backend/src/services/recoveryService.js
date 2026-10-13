import { CheckIn } from "../models/CheckIn.js";
import { WorkoutLog } from "../models/WorkoutLog.js";
import { getAcwrHistory, dayKey } from "./acwrService.js";

const DAY = 864e5;

// Pure: group daily series into ISO-ish weeks (7-day blocks ending today) -> sessions per block.
export function weeklyConsistency(logs, weeks = 4, now = Date.now()) {
  return Array.from({ length: weeks }, (_, w) => {
    const end = now - w * 7 * DAY, start = end - 7 * DAY;
    const inWeek = logs.filter(l => +new Date(l.date) > start && +new Date(l.date) <= end);
    return { weekEndingOn: dayKey(end), sessions: inWeek.length, activeDays: new Set(inWeek.map(l => dayKey(l.date))).size };
  }).reverse();
}

export async function getRecoveryOverview(userId) {
  const now = new Date();
  const [hist, checkIns, logs] = await Promise.all([
    getAcwrHistory(userId, 28, now),
    CheckIn.find({ userId, date: { $gte: new Date(+now - 28 * DAY) } }).sort({ date: 1 }).lean(),
    WorkoutLog.find({ userId, date: { $gte: new Date(+now - 28 * DAY) } }).select("date source").lean(),
  ]);
  return {
    heatmap: hist.daily,                                                     // 28 x { date, load }
    acwrTrend: hist.trend,                                                   // 28 x { date, ratio, riskBand }
    readinessTrend: checkIns.slice(-14).map(c => ({ date: c.dateKey, readiness: c.readinessScore, sleep: c.sleepHours, soreness: c.soreness, pain: c.pain })),
    decisionHistory: checkIns.slice(-14).reverse().map(c => ({ date: c.dateKey, recommendation: c.computedRecommendation, rule: c.decisionRule })),
    weekly: weeklyConsistency(logs),
    totals: { sessions28d: logs.length, activeDays28d: new Set(logs.map(l => dayKey(l.date))).size, checkIns28d: checkIns.length },
  };
}
