import mongoose from "mongoose";
const { Schema } = mongoose;

const communitySchema = new Schema({
  name: { type: String, required: true, trim: true },
  sport: { type: String, required: true },
  city: { type: String, required: true, index: true },
  lat: Number, lng: Number,
  state: String, venue: String, schedule: String,
  badge: { type: String, enum: ["community", "partner"], default: "community" },
  kind: { type: String, enum: ["club", "event"], default: "club" },
  level: { type: String, enum: ["all", "beginner", "intermediate", "advanced"], default: "all" },
  startsAt: Date,
  description: String,
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  isSample: { type: Boolean, default: false },
}, { timestamps: true });

export const Community = mongoose.models.Community || mongoose.model("Community", communitySchema);
