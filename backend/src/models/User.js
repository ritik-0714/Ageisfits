import mongoose from "mongoose";
const { Schema } = mongoose;

const profileSchema = new Schema({
  age: { type: Number, min: 10, max: 100 },
  gender: { type: String, enum: ["male", "female"] },
  height: { type: Number, min: 100, max: 250 },            // cm
  weight: { type: Number, min: 25, max: 300 },             // kg
  fitnessGoal: { type: String, enum: ["strength", "hypertrophy", "endurance", "fatloss"] },
  dietType: { type: String, enum: ["veg", "nonveg", "egg", "vegan"] },
  activityLevel: { type: String, enum: ["sedentary", "light", "moderate", "active", "athlete"] },
  experience: { type: String, enum: ["beginner", "intermediate", "advanced"] },
  city: String,
  interests: [String],
}, { _id: false });

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verification: { codeHash: String, expiresAt: Date, attempts: { type: Number, default: 0 } },
  profile: { type: profileSchema, default: () => ({}) },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
