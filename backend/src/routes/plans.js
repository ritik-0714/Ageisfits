import { Router } from "express";
import { AIPlan } from "../models/AIPlan.js";
import { User } from "../models/User.js";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware.js";
import { asyncHandler, httpError } from "../middleware/common.js";
import { generatePlan, personalizeWithLLM } from "../services/aiPlanEngine.js";

const r = Router();
r.use(authMiddleware, requireVerified);

r.post("/", asyncHandler(async (req, res) => {
  const p = req.body || {};
  const age = +p.age, height = +p.height, weight = +p.weight;
  if (!(age >= 10 && age <= 100 && height >= 100 && height <= 250 && weight >= 25 && weight <= 300)) throw httpError(400, "Enter a valid age, height (cm) and weight (kg)");
  if (!["male", "female"].includes(p.gender)) throw httpError(400, "Gender must be male or female (needed for the BMR equation)");
  let plan = generatePlan({ ...p, age, height, weight });
  plan = await personalizeWithLLM(plan, { notes: p.notes });
  await User.updateOne({ _id: req.user.id }, { $set: { profile: { age, height, weight, gender: p.gender, fitnessGoal: plan.profileSnapshot.goal, dietType: plan.profileSnapshot.diet,
    activityLevel: plan.profileSnapshot.activity, experience: plan.profileSnapshot.experience, city: p.city } } }, { runValidators: true });
  await AIPlan.updateMany({ userId: req.user.id, active: true }, { $set: { active: false } });
  const doc = await AIPlan.create({ userId: req.user.id, ...plan });
  res.status(201).json({ plan: doc });
}));

r.get("/current", asyncHandler(async (req, res) => {
  res.json({ plan: await AIPlan.findOne({ userId: req.user.id, active: true }).sort({ createdAt: -1 }) });
}));

export default r;
