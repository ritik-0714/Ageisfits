import mongoose from "mongoose";
const { Schema } = mongoose;

const scale = (min, max) => ({ type: Number, min, max, required: true });
const checkInSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, default: Date.now, index: true },
  dateKey: { type: String, required: true },                     // YYYY-MM-DD: one check-in per day (upsert)
  sleepHours: scale(0, 24),
  soreness: scale(0, 10),
  pain: scale(0, 10),
  readinessScore: scale(0, 100),
  stiffness: { type: Number, min: 0, max: 10, default: 0 },
  fatigue: { type: Number, min: 0, max: 10, default: 0 },
  computedRecommendation: { type: String, enum: ["TRAIN", "MODIFY", "POSTPONE", "RECOVERY"] },
  decisionRule: String,
}, { timestamps: true });
checkInSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export const CheckIn = mongoose.models.CheckIn || mongoose.model("CheckIn", checkInSchema);
