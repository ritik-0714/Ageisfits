import { CheckIn } from "../models/CheckIn.js";
import { AIPlan } from "../models/AIPlan.js";
import { getAcwr } from "./acwrService.js";
import { getActive, analyzeTrainingImpact, getRecurrence, suggestModification, dominantSymptom } from "./discomfortEngine.js";
import { evaluateDailyRecommendation } from "./decisionEngine.js";
import { REGIONS } from "../data/regions.js";

// Gathers ACWR + today's check-in + active discomfort + plan and runs the Decision Engine.
export async function getTrainingState(userId, dateKey) {
  const [acwr, checkIn, active, plan, recurrence] = await Promise.all([
    getAcwr(userId), CheckIn.findOne({ userId, dateKey }).lean(), getActive(userId),
    AIPlan.findOne({ userId, active: true }).sort({ createdAt: -1 }).lean(), getRecurrence(userId),
  ]);
  const decision = evaluateDailyRecommendation(acwr, checkIn, active);
  const todayWorkout = plan?.workouts?.length ? plan.workouts[(new Date(dateKey + "T12:00:00").getDay() + 6) % plan.workouts.length] : null;
  const names = todayWorkout ? todayWorkout.exercises.map(e => e.name) : [];
  const impact = analyzeTrainingImpact(active, names);
  const modifications = (todayWorkout?.exercises || []).map(e => ({ name: e.name, ...suggestModification(e, impact.find(i => i.name === e.name)?.level) }));
  const affected = impact.filter(i => i.level === "HIGH" || i.level === "MODERATE"), highNames = impact.filter(i => i.level === "HIGH").map(i => i.name);
  const worst = active.slice().sort((a, b) => b.severity - a.severity)[0];
  let reason = decision.reason;
  if (worst && highNames.length >= 1 && ["P2_ACTIVE_DISCOMFORT_HIGH", "R1_SEVERE_PAIN"].includes(decision.rule))
    reason = `High reported discomfort (${worst.severity}/10) overlapping with ${highNames.length > 1 ? "multiple primary planned exercises" : "a primary planned exercise"} (${highNames.join(", ")}). Postponing affected heavy loads is recommended to prevent aggravation. Unaffected light drills may continue safely.`;
  const impactLabel = impact.some(i => i.level === "HIGH") ? "High" : impact.some(i => i.level === "MODERATE") ? "Moderate" : "Minimal";
  return {
    acwr, checkIn, recommendation: decision.recommendation, reason, rule: decision.rule, factors: decision.factors,
    activeInjuries: active.map(a => ({ id: a._id, region: a.bodyRegion, label: REGIONS[a.bodyRegion]?.label, severity: a.severity, status: a.status, notes: a.notes, metrics: a.metrics, onset: a.onset, trigger: a.trigger, trend: a.trend, activityImpact: a.activityImpact, since: a.createdAt })),
    recurrence, impact, plan, todayWorkout, modifications, impactLabel,
    counts: { affected: affected.length, unaffected: impact.length - affected.length, modified: modifications.filter(m => m.status === "MODIFIED").length, unchanged: modifications.filter(m => m.status === "UNCHANGED").length },
    dominant: dominantSymptom(worst), reportedAreas: active.length, worstSeverity: worst?.severity ?? 0,
  };
}
