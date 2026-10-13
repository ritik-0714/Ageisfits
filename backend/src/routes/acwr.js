import { Router } from "express";
import { WorkoutLog } from "../models/WorkoutLog.js";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware.js";
import { asyncHandler, httpError } from "../middleware/common.js";
import { getAcwr, getAcwrHistory } from "../services/acwrService.js";

const r = Router();
r.use(authMiddleware, requireVerified);

r.get("/", asyncHandler(async (req, res) => res.json({ acwr: await getAcwr(req.user.id, new Date(), req.query.method === "ewma" ? "ewma" : "rolling") })));
r.get("/history", asyncHandler(async (req, res) => res.json(await getAcwrHistory(req.user.id, Math.min(90, +req.query.days || 28)))));

r.get("/logs", asyncHandler(async (req, res) => res.json({ logs: await WorkoutLog.find({ userId: req.user.id }).sort({ date: -1 }).limit(30).lean() })));

r.post("/log", asyncHandler(async (req, res) => {
  const { exerciseType = "Workout", durationMinutes, rpe, date } = req.body || {};
  if (!(+durationMinutes >= 1 && +rpe >= 1 && +rpe <= 10)) throw httpError(400, "Duration must be >= 1 minute and RPE between 1 and 10");
  const log = await WorkoutLog.create({ userId: req.user.id, exerciseType, durationMinutes: +durationMinutes, rpe: +rpe, date: date ? new Date(date) : new Date(), source: "manual" });
  res.status(201).json({ log, acwr: await getAcwr(req.user.id) });
}));

// "Seed 28-Day Baseline Demo": 12 clearly-flagged demo sessions so a new account can see the ACWR engine working. Removable.
r.post("/seed-demo", asyncHandler(async (req, res) => {
  await WorkoutLog.deleteMany({ userId: req.user.id, isDemo: true });
  const plan = [[27, "Strength", 50, 6], [25, "Run", 35, 5], [23, "Strength", 55, 7], [21, "Cycle", 40, 5], [19, "Strength", 50, 6], [17, "Run", 40, 6],
    [14, "Strength", 55, 7], [12, "Cycle", 35, 5], [9, "Strength", 50, 6], [7, "Run", 40, 6], [4, "Strength", 55, 7], [2, "Run", 35, 5]];
  await WorkoutLog.insertMany(plan.map(([d, t, m, rpe]) => { const date = new Date(Date.now() - d * 864e5);
    return { userId: req.user.id, date, exerciseType: t, durationMinutes: m, rpe, calculatedLoad: m * rpe, source: "manual", isDemo: true }; }));
  res.status(201).json({ seeded: plan.length, acwr: await getAcwr(req.user.id) });
}));
r.delete("/seed-demo", asyncHandler(async (req, res) => { const d = await WorkoutLog.deleteMany({ userId: req.user.id, isDemo: true }); res.json({ removed: d.deletedCount, acwr: await getAcwr(req.user.id) }); }));

export default r;
