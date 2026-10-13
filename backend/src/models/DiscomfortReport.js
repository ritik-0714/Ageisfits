import mongoose from "mongoose";
import { REGION_KEYS, DISCOMFORT_STATUS } from "../data/regions.js";
const { Schema } = mongoose;

const m = { type: Number, min: 0, max: 10, default: 0 };
const discomfortSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  bodyRegion: { type: String, enum: REGION_KEYS, required: true },
  severity: { type: Number, min: 0, max: 10, required: true },    // max of the four metrics, 1-10 scale
  status: { type: String, enum: DISCOMFORT_STATUS, required: true },
  metrics: { pain: m, soreness: m, stiffness: m, tenderness: m },
  onset: { type: String, enum: ["today", "yesterday", "this_week", "over_a_week", "chronic"], default: "today" },
  trigger: { type: String, enum: ["workout", "daily_activity", "rest", "sleep", "unknown"], default: "workout" },
  trend: { type: String, enum: ["same", "improving", "worsening"], default: "same" },
  activityImpact: { type: String, enum: ["none", "mild", "moderate", "severe"], default: "none" },
  notes: { type: String, maxlength: 500, default: "" },
}, { timestamps: true });
discomfortSchema.index({ userId: 1, bodyRegion: 1, createdAt: -1 });

export const DiscomfortReport = mongoose.models.DiscomfortReport || mongoose.model("DiscomfortReport", discomfortSchema);
