import { Router } from "express";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware.js";
import { asyncHandler, dateKeyFrom } from "../middleware/common.js";
import { logReport, clearAll } from "../services/discomfortEngine.js";
import { getTrainingState } from "../services/trainingState.js";

const r = Router();
r.use(authMiddleware, requireVerified);
const n = v => Math.min(10, Math.max(0, Math.round(+v || 0)));

// Log a discomfort report for a region picked on the 3D mapper. Severity 0 on all metrics = resolved.
r.post("/", asyncHandler(async (req, res) => {
  const { bodyRegion, pain, soreness, stiffness, tenderness, notes, onset, trigger, trend, activityImpact } = req.body || {};
  const report = await logReport(req.user.id, { bodyRegion, notes: String(notes || "").slice(0, 500), metrics: { pain: n(pain), soreness: n(soreness), stiffness: n(stiffness), tenderness: n(tenderness) }, onset, trigger, trend, activityImpact });
  res.status(201).json({ report, state: await getTrainingState(req.user.id, dateKeyFrom(req.query.date)) });
}));

r.post("/:region/resolve", asyncHandler(async (req, res) => {
  const report = await logReport(req.user.id, { bodyRegion: req.params.region, notes: "Marked resolved", metrics: {} });
  res.json({ report, state: await getTrainingState(req.user.id, dateKeyFrom(req.query.date)) });
}));

r.post("/clear", asyncHandler(async (req, res) => {
  const cleared = await clearAll(req.user.id);
  res.json({ cleared, state: await getTrainingState(req.user.id, dateKeyFrom(req.query.date)) });
}));

export default r;
