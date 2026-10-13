import { Router } from "express";
import { CheckIn } from "../models/CheckIn.js";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware.js";
import { asyncHandler, dateKeyFrom, httpError } from "../middleware/common.js";
import { getTrainingState } from "../services/trainingState.js";

const r = Router();
r.use(authMiddleware, requireVerified);

// One check-in per day (upsert). The Decision Engine's answer is stored on the check-in as computedRecommendation.
r.post("/", asyncHandler(async (req, res) => {
  const b = req.body || {}, dateKey = dateKeyFrom(b.date);
  const doc = { sleepHours: +b.sleepHours, soreness: +b.soreness, pain: +b.pain, readinessScore: +b.readinessScore, stiffness: +(b.stiffness || 0), fatigue: +(b.fatigue || 0) };
  if (Object.values(doc).some(Number.isNaN)) throw httpError(400, "All check-in values must be numbers");
  await CheckIn.findOneAndUpdate({ userId: req.user.id, dateKey }, { $set: { ...doc, date: new Date() } }, { upsert: true, new: true, runValidators: true });
  const state = await getTrainingState(req.user.id, dateKey);
  await CheckIn.updateOne({ userId: req.user.id, dateKey }, { $set: { computedRecommendation: state.recommendation, decisionRule: state.rule } });
  res.status(201).json({ state: { ...state, checkIn: { ...state.checkIn, computedRecommendation: state.recommendation } } });
}));

r.get("/", asyncHandler(async (req, res) => res.json({ checkIns: await CheckIn.find({ userId: req.user.id }).sort({ date: -1 }).limit(30).lean() })));
r.get("/today", asyncHandler(async (req, res) => res.json({ checkIn: await CheckIn.findOne({ userId: req.user.id, dateKey: dateKeyFrom(req.query.date) }).lean() })));

export default r;
