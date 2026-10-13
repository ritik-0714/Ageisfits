import mongoose from "mongoose";
const { Schema } = mongoose;

export const PROVIDERS = ["strava", "fitbit", "garmin", "apple_health", "health_connect"];
const wearableSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  provider: { type: String, enum: PROVIDERS, required: true },
  mode: { type: String, enum: ["oauth", "device", "demo"], default: "oauth" },
  accessTokenEnc: String, refreshTokenEnc: String, tokenExpiresAt: Date,    // AES-256-GCM encrypted at rest
  externalUserId: String,
  lastSyncedAt: Date,
  syncedActivityIds: { type: [String], default: [] },            // composite ids: provider_activityId
  pairing: { codeHash: String, expiresAt: Date },                // device pairing (Health Connect / Apple Health)
  latestMetrics: { steps: Number, calories: Number, avgHeartRate: Number, device: String, syncedAt: Date },
}, { timestamps: true });
wearableSchema.index({ userId: 1, provider: 1 }, { unique: true });
wearableSchema.index({ "pairing.codeHash": 1 });

export const WearableConnection = mongoose.models.WearableConnection || mongoose.model("WearableConnection", wearableSchema);
