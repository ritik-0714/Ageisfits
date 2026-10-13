import mongoose from "mongoose";
const { Schema } = mongoose;

const workoutLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  exerciseType: { type: String, required: true, trim: true, default: "workout" },
  durationMinutes: { type: Number, required: true, min: 1, max: 600 },
  rpe: { type: Number, required: true, min: 1, max: 10 },
  calculatedLoad: { type: Number, default: 0 },                  // durationMinutes x rpe (sRPE)
  source: { type: String, enum: ["manual", "vision", "wearable"], default: "manual" },
  provider: String,                                              // strava | fitbit | garmin ...
  isDemo: { type: Boolean, default: false },                    // rows created by "Seed 28-Day Baseline Demo" (removable)
  externalId: String,                                            // "<provider>_<activityId>"
}, { timestamps: true });

workoutLogSchema.pre("validate", function (next) { this.calculatedLoad = this.durationMinutes * this.rpe; next(); });
workoutLogSchema.index({ userId: 1, date: -1 });
// second line of defence for idempotent wearable sync: the same external activity can never be stored twice
workoutLogSchema.index({ userId: 1, externalId: 1 }, { unique: true, partialFilterExpression: { externalId: { $type: "string" } } });

export const WorkoutLog = mongoose.models.WorkoutLog || mongoose.model("WorkoutLog", workoutLogSchema);
