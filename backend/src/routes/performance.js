import { Router } from "express";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware.js";
import { asyncHandler, dateKeyFrom } from "../middleware/common.js";
import { getTrainingState } from "../services/trainingState.js";
import { getRecoveryOverview } from "../services/recoveryService.js";
import { getPerformance, getDevicesAndPlan, readinessLabel, sleepLabel, recoveryStatus } from "../services/performanceService.js";

const r = Router();
r.use(authMiddleware, requireVerified);

r.get("/today", asyncHandler(async (req, res) => res.json(await getTrainingState(req.user.id, dateKeyFrom(req.query.date)))));
const GOAL = { strength: "Strength & Power", hypertrophy: "Muscle & Weight Gain", endurance: "Endurance & Stamina", fatloss: "Fat Loss & Lean Build" };
const DIET = { veg: "Pure Vegetarian", egg: "Eggetarian", nonveg: "Non-Vegetarian", vegan: "Vegan" };
// Everything the Dashboard needs in one call.
r.get("/dashboard", asyncHandler(async (req, res) => {
  const date = dateKeyFrom(req.query.date);
  const [state, performance, extra] = await Promise.all([getTrainingState(req.user.id, date), getPerformance(req.user.id), getDevicesAndPlan(req.user.id)]);
  const ci = state.checkIn, snap = extra.plan?.profileSnapshot;
  res.json({ ...state, plan: undefined, performance, devicesConnected: extra.devicesConnected,
    dietPlan: extra.plan ? { goal: GOAL[snap?.goal] || snap?.goal, diet: DIET[snap?.diet] || snap?.diet, kcal: extra.plan.targets.kcal, protein: extra.plan.targets.protein } : null,
    readiness: { score: ci?.readinessScore ?? null, label: readinessLabel(ci?.readinessScore) },
    recovery: { status: recoveryStatus({ sleepHours: ci?.sleepHours, soreness: ci?.soreness, fatigue: ci?.fatigue }), sleepHours: ci?.sleepHours ?? null, sleepLabel: sleepLabel(ci?.sleepHours), soreness: ci?.soreness ?? null, source: "check-in" } });
}));
r.get("/overview", asyncHandler(async (req, res) => res.json(await getRecoveryOverview(req.user.id))));

export default r;
