import { Router } from "express";
import { VisionSession } from "../models/VisionSession.js";
import { WorkoutLog } from "../models/WorkoutLog.js";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware.js";
import { asyncHandler, httpError } from "../middleware/common.js";
import { getAcwr } from "../services/acwrService.js";

const r = Router();
r.use(authMiddleware, requireVerified);
const pct = v => (v == null || Number.isNaN(+v) ? null : Math.min(100, Math.max(0, Math.round(+v))));

// Stores the AI Vision Trainer session AND a WorkoutLog (source: "vision") so the work counts toward ACWR.
r.post("/", asyncHandler(async (req, res) => {
  const b = req.body || {}, m = b.metrics || {};
  const durationSec = Math.max(0, Math.round(+b.durationSec || 0)), rpe = Math.min(10, Math.max(1, Math.round(+b.rpe || 6)));
  if (!b.exercise) throw httpError(400, "exercise is required");
  if (!(+b.reps > 0 || +b.holdSeconds > 0)) throw httpError(400, "Nothing to save - complete at least one rep (or a plank hold)");
  const log = await WorkoutLog.create({ userId: req.user.id, exerciseType: b.exercise, durationMinutes: Math.max(1, Math.round(durationSec / 60)), rpe, source: "vision" });
  const session = await VisionSession.create({ userId: req.user.id, exercise: b.exercise, reps: Math.max(0, Math.round(+b.reps || 0)), holdSeconds: Math.max(0, Math.round(+b.holdSeconds || 0)), durationSec,
    composite: pct(b.composite), metrics: { rom: pct(m.rom), alignment: pct(m.alignment), stability: pct(m.stability), tempo: pct(m.tempo), consistency: pct(m.consistency) },
    repScores: (b.repScores || []).slice(0, 500).map(Number).filter(Number.isFinite), fatigueDetected: !!b.fatigueDetected, workoutLogId: log._id });
  res.status(201).json({ session, acwr: await getAcwr(req.user.id) });
}));

r.get("/sessions", asyncHandler(async (req, res) => res.json({ sessions: await VisionSession.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20).lean() })));

export default r;
