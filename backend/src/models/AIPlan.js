import mongoose from "mongoose";
const { Schema } = mongoose;

const aiPlanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  profileSnapshot: Schema.Types.Mixed,
  bmr: Number, tdee: Number,
  targets: { kcal: Number, protein: Number, carbs: Number, fat: Number, fibre: Number },
  micronutrients: [{ name: String, target: String, sources: [String], note: String }],
  meals: [{ meal: String, food: String, kcal: Number }],
  weeklyMeals: Schema.Types.Mixed,                 // { Day 1: [{meal, food, kcal}] ... }
  workouts: [{ day: String, focus: String, exercises: [{ name: String, sets: Number, reps: String, rest: String }] }],
  generator: { type: String, enum: ["template", "template+llm"], default: "template" },
  coachNote: String,
  active: { type: Boolean, default: true },
}, { timestamps: true });

export const AIPlan = mongoose.models.AIPlan || mongoose.model("AIPlan", aiPlanSchema);
