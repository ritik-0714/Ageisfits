import { Router } from "express";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/common.js";
import { getTrainingState } from "../services/trainingState.js";
import { getHistory } from "../services/discomfortEngine.js";
import { REGIONS } from "../data/regions.js";
import { dateKeyFrom } from "../middleware/common.js";

const r = Router();
r.use(authMiddleware, requireVerified);

r.get("/regions", (req, res) => res.json({ regions: REGIONS }));

// Active injuries + recurrence + training impact for the current plan's exercises.
r.get("/", asyncHandler(async (req, res) => {
  const s = await getTrainingState(req.user.id, dateKeyFrom(req.query.date));
  res.json({ activeInjuries: s.activeInjuries, recurrence: s.recurrence, impact: s.impact, modifications: s.modifications, counts: s.counts, recommendation: s.recommendation, reason: s.reason, rule: s.rule,
    acwr: s.acwr, checkIn: s.checkIn, todayWorkout: s.todayWorkout, dominant: s.dominant });
}));

r.get("/history", asyncHandler(async (req, res) => {
  const rows = await getHistory(req.user.id, req.query.region || undefined);
  res.json({ history: rows.map(h => ({ id: h._id, region: h.bodyRegion, label: REGIONS[h.bodyRegion]?.label, severity: h.severity, status: h.status, notes: h.notes, metrics: h.metrics, onset: h.onset, trigger: h.trigger, trend: h.trend, activityImpact: h.activityImpact, at: h.createdAt })) });
}));

export default r;
