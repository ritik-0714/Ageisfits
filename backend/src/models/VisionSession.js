import mongoose from "mongoose";
const { Schema } = mongoose;

const pct = { type: Number, min: 0, max: 100, default: null };
const visionSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  exercise: { type: String, required: true, enum: ["Squat", "Push-up", "Bicep Curl", "Plank", "Lunge", "Shoulder Press", "Deadlift", "Jumping Jack"] },
  reps: { type: Number, min: 0, default: 0 },
  holdSeconds: { type: Number, min: 0, default: 0 },             // used by Plank
  durationSec: { type: Number, min: 0, default: 0 },
  composite: pct,                                                // session composite score 0-100
  metrics: { rom: pct, alignment: pct, stability: pct, tempo: pct, consistency: pct },
  repScores: [Number],
  fatigueDetected: { type: Boolean, default: false },
  workoutLogId: { type: Schema.Types.ObjectId, ref: "WorkoutLog" },
}, { timestamps: true });
visionSessionSchema.index({ userId: 1, createdAt: -1 });

export const VisionSession = mongoose.models.VisionSession || mongoose.model("VisionSession", visionSessionSchema);
